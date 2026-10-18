import { describe, it, expect, beforeEach } from 'vitest';
import {
  authenticateLocalUser,
  getActiveSession,
  clearActiveSession,
  setRawSessionForTesting,
  canStudentAccessBatch,
  canFacultyModifySubject,
  canFacultyEditSessionLog,
  canCampusManagerAccessCampus,
  canUserAccessAdmin,
  DEFAULT_INITIAL_PASSWORD,
  hashPassword,
} from '../services/authService';
import {
  saveSessionLog,
  updateTopic,
  createTopic,
  createUnit,
  escalateMissedSession,
  resolveMissedSession,
  getBatchesForUser,
  getSubjectsForUser,
  getExaminationsForUser,
  getSessionLogsForUser,
  getSubjects,
  getTopics,
  getSessionLogs,
  getMissedSessions,
  getCurrentUserId,
  setCurrentUserId,
  resetToDemoData,
} from '../services/storage';
import { INITIAL_USERS } from '../data/mockData';
import { UserProfile, SessionLog, Subject, Topic } from '../types';

describe('Comprehensive Authentication, Security & Permissions Test Suite (10 Requirements)', () => {
  const adminUser = INITIAL_USERS.find((u) => u.role === 'admin')!;
  const gzbManager = INITIAL_USERS.find((u) => u.id === 'user-mgr-gzb')!;
  const blrManager = INITIAL_USERS.find((u) => u.id === 'user-mgr-blr')!;
  const radhikaFaculty = INITIAL_USERS.find((u) => u.id === 'user-fac-radhika')!;
  const arvindFaculty = INITIAL_USERS.find((u) => u.id === 'user-fac-arvind')!;
  const amanStudent = INITIAL_USERS.find((u) => u.id === 'user-student-aman')!;
  const deepaStudent = INITIAL_USERS.find((u) => u.id === 'user-student-deepa')!;

  beforeEach(() => {
    clearActiveSession();
    setCurrentUserId('');
  });

  // 1. Student login and logout
  it('Requirement 1: Student login with valid credentials, invalid rejection, and clean logout', async () => {
    // Correct login via student portal
    const loginResult = await authenticateLocalUser(
      amanStudent.email,
      DEFAULT_INITIAL_PASSWORD,
      'student'
    );
    expect(loginResult.success).toBe(true);
    expect(loginResult.user?.id).toBe(amanStudent.id);
    expect(loginResult.user?.role).toBe('student');

    // Active session is established
    const active = getActiveSession();
    expect(active.user?.id).toBe(amanStudent.id);

    // Incorrect password rejection
    const badPass = await authenticateLocalUser(
      amanStudent.email,
      'WrongPassword123!',
      'student'
    );
    expect(badPass.success).toBe(false);
    expect(badPass.error).toContain('Invalid password');

    // Logout clears the authenticated session completely
    clearActiveSession();
    const afterLogout = getActiveSession();
    expect(afterLogout.session).toBeNull();
    expect(afterLogout.user).toBeNull();
  });

  // 2. Faculty login and logout
  it('Requirement 2: Faculty login with institutional ID, portal mismatch blocking, and logout', async () => {
    // Login with Faculty ID
    const loginResult = await authenticateLocalUser(
      radhikaFaculty.id,
      DEFAULT_INITIAL_PASSWORD,
      'faculty'
    );
    expect(loginResult.success).toBe(true);
    expect(loginResult.user?.id).toBe(radhikaFaculty.id);
    expect(loginResult.user?.role).toBe('faculty');

    // Faculty attempting to log in via Student portal is rejected
    const studentPortalAttempt = await authenticateLocalUser(
      radhikaFaculty.email,
      DEFAULT_INITIAL_PASSWORD,
      'student'
    );
    expect(studentPortalAttempt.success).toBe(false);
    expect(studentPortalAttempt.error).toContain('does not have student access privileges');

    // Student attempting to log in via Faculty portal is rejected
    const facultyPortalAttempt = await authenticateLocalUser(
      amanStudent.email,
      DEFAULT_INITIAL_PASSWORD,
      'faculty'
    );
    expect(facultyPortalAttempt.success).toBe(false);
    expect(facultyPortalAttempt.error).toContain('does not have faculty access privileges');

    // Logout
    clearActiveSession();
    expect(getActiveSession().user).toBeNull();
  });

  // 3. Admin and Campus Manager access
  it('Requirement 3: Admin and Campus Manager access control and privilege separation', async () => {
    // Admin login via staff portal
    const adminLogin = await authenticateLocalUser(
      adminUser.email,
      DEFAULT_INITIAL_PASSWORD,
      'staff'
    );
    expect(adminLogin.success).toBe(true);
    expect(adminLogin.user?.role).toBe('admin');
    expect(canUserAccessAdmin(adminLogin.user!)).toBe(true);

    // Campus Manager login via staff portal
    const mgrLogin = await authenticateLocalUser(
      gzbManager.email,
      DEFAULT_INITIAL_PASSWORD,
      'staff'
    );
    expect(mgrLogin.success).toBe(true);
    expect(mgrLogin.user?.role).toBe('campus_manager');

    // Campus Manager CANNOT access global admin functions
    expect(canUserAccessAdmin(mgrLogin.user!)).toBe(false);

    // Non-staff user attempting staff login is rejected
    const studentStaffAttempt = await authenticateLocalUser(
      amanStudent.email,
      DEFAULT_INITIAL_PASSWORD,
      'staff'
    );
    expect(studentStaffAttempt.success).toBe(false);
    expect(studentStaffAttempt.error).toContain('does not have administrative or campus management privileges');
  });

  // 4. A student attempting to access another student's records
  it('Requirement 4: A student attempting to access another student records or another batch is blocked', () => {
    // Aman is enrolled in Ghaziabad Mirai batch: 'batch-gzb-mirai'
    expect(canStudentAccessBatch(amanStudent, 'batch-gzb-mirai')).toBe(true);

    // Deepa is enrolled in Bangalore VTU batch: 'batch-blr-vtu'
    // Aman attempts to access Deepa's Bangalore batch -> BLOCKED
    expect(canStudentAccessBatch(amanStudent, 'batch-blr-vtu')).toBe(false);

    // Scoped query for Aman returns ONLY Aman's batch
    const amanBatches = getBatchesForUser(amanStudent);
    expect(amanBatches.length).toBe(1);
    expect(amanBatches[0].id).toBe('batch-gzb-mirai');

    // Scoped subjects for Aman only contain Ghaziabad batch subjects
    const amanSubjects = getSubjectsForUser(amanStudent);
    expect(amanSubjects.every((s) => s.batch_id === 'batch-gzb-mirai')).toBe(true);
    // Cannot see Bangalore or Jaipur subjects
    expect(amanSubjects.some((s) => s.branch_id === 'Bangalore')).toBe(false);

    // Scoped exams for Aman only contain Ghaziabad batch exams
    const amanExams = getExaminationsForUser(amanStudent);
    expect(amanExams.every((e) => e.batch_id === 'batch-gzb-mirai')).toBe(true);
    expect(amanExams.some((e) => e.batch_id === 'batch-blr-vtu')).toBe(false);
  });

  // 5. A faculty member attempting to edit another faculty member's subject
  it('Requirement 5: A faculty member attempting to edit another faculty member subject is rejected', () => {
    const allSubjects = getSubjects();
    const radhikaSubj = allSubjects.find((s) => s.id === 'subj-gzb-cs301')!; // Assigned to Radhika
    const rajeshSubj = allSubjects.find((s) => s.id === 'subj-gzb-kcs301')!;  // Assigned to Dr. Rajesh Kumar

    expect(radhikaSubj).toBeDefined();
    expect(rajeshSubj).toBeDefined();

    // Radhika is authorized for CS301
    expect(canFacultyModifySubject(radhikaFaculty, radhikaSubj)).toBe(true);

    // Radhika attempts to modify Rajesh's KCS301 -> BLOCKED
    expect(canFacultyModifySubject(radhikaFaculty, rajeshSubj)).toBe(false);

    // Find topic belonging to Rajesh's subject
    const allTopics = getTopics();
    const rajeshTopic = allTopics.find((t) => t.subject_id === rajeshSubj.id)!;
    expect(rajeshTopic).toBeDefined();

    // Radhika attempts to update Rajesh's topic -> FAILS with permission denied error
    const updateResult = updateTopic(
      rajeshTopic.id,
      { title: 'Hacked Topic by Radhika' },
      radhikaFaculty
    );
    expect(updateResult.success).toBe(false);
    expect(updateResult.error).toContain('Permission denied');

    // Radhika attempts to log session for Rajesh's subject -> FAILS
    const unauthorizedSession: SessionLog = {
      id: 'sess-unauth-test',
      campus_id: 'Ghaziabad',
      batch_id: rajeshSubj.batch_id,
      subject_id: rajeshSubj.id,
      faculty_id: 'user-fac-rajesh', // Rajesh's session
      date: '2026-09-18',
      duration_hours: 1.5,
      status: 'completed',
      topics_covered: [],
      topics_remaining: [],
      classwork_status: 'Unauthorized edit',
      homework_status: 'None',
      created_at: new Date().toISOString(),
    };

    const sessionResult = saveSessionLog(unauthorizedSession, radhikaFaculty);
    expect(sessionResult.success).toBe(false);
    expect(sessionResult.error).toContain('Permission denied');
  });

  // 6. A Campus Manager attempting to access another campus
  it('Requirement 6: A Campus Manager attempting to access another campus is restricted', () => {
    // Ghaziabad manager can access Ghaziabad
    expect(canCampusManagerAccessCampus(gzbManager, 'Ghaziabad')).toBe(true);

    // Ghaziabad manager attempts to access Bangalore or Jaipur -> BLOCKED
    expect(canCampusManagerAccessCampus(gzbManager, 'Bangalore')).toBe(false);
    expect(canCampusManagerAccessCampus(gzbManager, 'Jaipur')).toBe(false);

    // Find a missed session belonging to Bangalore
    const missedSessions = getMissedSessions();
    const blrMissed = missedSessions.find((m) => (m.branch_id || m.campus_id) === 'Bangalore');

    if (blrMissed) {
      // Ghaziabad manager attempts to escalate Bangalore missed session -> FAILS
      const escalateRes = escalateMissedSession(blrMissed.id, gzbManager);
      expect(escalateRes.success).toBe(false);
      expect(escalateRes.error).toContain('Permission denied');

      // Ghaziabad manager attempts to resolve Bangalore missed session -> FAILS
      const resolveRes = resolveMissedSession(blrMissed.id, gzbManager);
      expect(resolveRes.success).toBe(false);
      expect(resolveRes.error).toContain('Permission denied');
    }
  });

  // 7. Direct URL access without authentication
  it('Requirement 7: Direct access without authentication returns null session', () => {
    clearActiveSession();
    setCurrentUserId('');

    const active = getActiveSession();
    expect(active.session).toBeNull();
    expect(active.user).toBeNull();

    // Current user in storage is empty string, NOT 'user-admin'
    const storedId = getCurrentUserId();
    expect(storedId).toBe('');
  });

  // 8. API access without valid credentials
  it('Requirement 8: API mutations without valid credentials fail immediately', () => {
    // Attempting to save session log with unauthenticated user (null)
    const sessionAttempt = saveSessionLog(
      {
        campus_id: 'Ghaziabad',
        batch_id: 'batch-gzb-mirai',
        subject_id: 'subj-gzb-cs301',
        faculty_id: radhikaFaculty.id,
        date: '2026-09-18',
        duration_hours: 1.5,
        status: 'completed',
        topics_covered: [],
        topics_remaining: [],
        classwork_status: 'No auth test',
        homework_status: 'None',
      },
      null as any
    );
    expect(sessionAttempt.success).toBe(false);
    expect(sessionAttempt.error).toContain('Permission denied');

    // Attempting to update topic with null user
    const topicAttempt = updateTopic('some-topic-id', { planned_hours: 5 }, null as any);
    expect(topicAttempt.success).toBe(false);
    expect(topicAttempt.error).toContain('Authentication required');

    // Attempting to create topic with null user
    const createdTopic = createTopic(
      {
        unit_id: 'u-1',
        subject_id: 'subj-gzb-cs301',
        title: 'Unauthenticated Topic',
        planned_hours: 2,
        sequence_order: 1,
        status: 'not_started',
        completion_percentage: 0,
        in_exam_scope: true,
      },
      null as any
    );
    expect(createdTopic).toBeNull();
  });

  // 9. Session expiry and logout behaviour
  it('Requirement 9: Expired sessions are automatically rejected and purged', () => {
    // Create an expired session in storage using setRawSessionForTesting
    const expiredSession = {
      token: 'sess_expired_123',
      userId: radhikaFaculty.id,
      role: radhikaFaculty.role,
      createdAt: Date.now() - 48 * 60 * 60 * 1000,
      expiresAt: Date.now() - 1000, // Expired 1 second ago
    };

    setRawSessionForTesting(expiredSession);

    // getActiveSession should detect expiration, purge storage, and return null
    const active = getActiveSession();
    expect(active.session).toBeNull();
    expect(active.user).toBeNull();
  });

  // 10. Refreshing a page without accidentally switching accounts
  it('Requirement 10: Refreshing a page preserves the authenticated user without defaulting to admin', async () => {
    // 10a. User logs in as student Aman
    const loginAman = await authenticateLocalUser(
      amanStudent.email,
      DEFAULT_INITIAL_PASSWORD,
      'student'
    );
    expect(loginAman.success).toBe(true);

    // Simulate page reload: getActiveSession is called from fresh component mount
    const reloadedAman = getActiveSession();
    expect(reloadedAman.user?.id).toBe(amanStudent.id);
    expect(reloadedAman.user?.role).toBe('student');
    expect(reloadedAman.user?.id).not.toBe('user-admin');

    // 10b. User logs in as faculty Radhika
    clearActiveSession();
    await authenticateLocalUser(
      radhikaFaculty.email,
      DEFAULT_INITIAL_PASSWORD,
      'faculty'
    );

    // Simulate page reload
    const reloadedRadhika = getActiveSession();
    expect(reloadedRadhika.user?.id).toBe(radhikaFaculty.id);
    expect(reloadedRadhika.user?.role).toBe('faculty');
    expect(reloadedRadhika.user?.id).not.toBe('user-admin');

    // 10c. If user logs out and page reloads, user remains null (NOT user-admin!)
    clearActiveSession();
    const reloadedLoggedOut = getActiveSession();
    expect(reloadedLoggedOut.user).toBeNull();
  });
});
