import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_BRANCHES,
  INITIAL_BATCHES,
  INITIAL_SUBJECTS,
  INITIAL_SEMESTERS,
  INITIAL_HOLIDAYS,
  INITIAL_TIMETABLE,
  INITIAL_USERS,
  INITIAL_EXAMINATIONS,
  INITIAL_MISSED_SESSIONS,
} from '../data/mockData';
import {
  getBranches,
  getBranchById,
  getBatchesByBranch,
  getSemestersByBranch,
  getHolidaysByBranch,
  getSubjectsByBranch,
  getTimetableByBranch,
  getExaminationsByBranch,
  getMissedSessions,
  resetToDemoData,
  addHoliday,
  saveExamination,
} from '../services/storage';
import {
  calculateHoursInScope,
  calculateCoveredHours,
  calculateCoveragePercentage,
  calculateRemainingHours,
  calculateBufferRatio,
  determineProgressionStatus,
  determineTrackOverallStatus,
  calculateSubjectProgress,
  calculateAvailableTeachingHours,
} from '../utils/calculations';
import { BranchId, UserProfile, Topic } from '../types';

describe('Branches & University Structure Validation', () => {
  beforeEach(() => {
    // Reset to clean seeded state
    resetToDemoData();
  });

  // Validation 1: Ghaziabad University Track is associated with AKTU
  it('Validation 1: Ghaziabad University Track is associated with AKTU', () => {
    const branches = getBranches();
    const gzbBranch = branches.find((b) => b.id === 'Ghaziabad');
    expect(gzbBranch).toBeDefined();
    expect(gzbBranch?.university_short_name).toBe('AKTU');
    expect(gzbBranch?.university_affiliation).toContain('Dr. A.P.J. Abdul Kalam Technical University');

    // Ghaziabad University Track batch and subjects
    const gzbBatches = getBatchesByBranch('Ghaziabad');
    const gzbUnivBatch = gzbBatches.find((b) => b.academic_track === 'University Track');
    expect(gzbUnivBatch).toBeDefined();
    expect(gzbUnivBatch?.university_name).toBe('Dr. A.P.J. Abdul Kalam Technical University (AKTU)');

    const gzbSubjects = getSubjectsByBranch('Ghaziabad');
    const gzbUnivSubject = gzbSubjects.find((s) => s.academic_track === 'University Track');
    expect(gzbUnivSubject).toBeDefined();
    expect(gzbUnivSubject?.code).toBe('KCS301'); // AKTU official code
    expect(gzbUnivSubject?.university_name).toContain('AKTU');
  });

  // Validation 2: Bangalore University Track is associated with VTU
  it('Validation 2: Bangalore University Track is associated with VTU', () => {
    const branches = getBranches();
    const blrBranch = branches.find((b) => b.id === 'Bangalore');
    expect(blrBranch).toBeDefined();
    expect(blrBranch?.university_short_name).toBe('VTU');
    expect(blrBranch?.university_affiliation).toContain('Visvesvaraya Technological University');

    // Bangalore University Track batch and subjects
    const blrBatches = getBatchesByBranch('Bangalore');
    const blrUnivBatch = blrBatches.find((b) => b.academic_track === 'University Track');
    expect(blrUnivBatch).toBeDefined();
    expect(blrUnivBatch?.university_name).toBe('Visvesvaraya Technological University (VTU)');

    const blrSubjects = getSubjectsByBranch('Bangalore');
    const blrUnivSubject = blrSubjects.find((s) => s.academic_track === 'University Track');
    expect(blrUnivSubject).toBeDefined();
    expect(blrUnivSubject?.code).toBe('BCS301'); // VTU official code
    expect(blrUnivSubject?.university_name).toContain('VTU');
  });

  // Validation 3: Jaipur University Track is associated with Jagannath University
  it('Validation 3: Jaipur University Track is associated with Jagannath University', () => {
    const branches = getBranches();
    const jprBranch = branches.find((b) => b.id === 'Jaipur');
    expect(jprBranch).toBeDefined();
    expect(jprBranch?.university_short_name).toBe('Jagannath University');
    expect(jprBranch?.university_affiliation).toContain('Jagannath University');

    // Jaipur University Track batch and subjects
    const jprBatches = getBatchesByBranch('Jaipur');
    const jprUnivBatch = jprBatches.find((b) => b.academic_track === 'University Track');
    expect(jprUnivBatch).toBeDefined();
    expect(jprUnivBatch?.university_name).toBe('Jagannath University');

    const jprSubjects = getSubjectsByBranch('Jaipur');
    const jprUnivSubject = jprSubjects.find((s) => s.academic_track === 'University Track');
    expect(jprUnivSubject).toBeDefined();
    expect(jprUnivSubject?.code).toBe('JNU-CS301'); // Jagannath University official code
    expect(jprUnivSubject?.university_name).toContain('Jagannath University');
  });

  // Validation 4: Mirai Track faculty and schedules can differ across branches
  it('Validation 4: Mirai Track faculty and schedules can differ across branches', () => {
    const gzbSubjects = getSubjectsByBranch('Ghaziabad').filter((s) => s.academic_track === 'Mirai Track');
    const blrSubjects = getSubjectsByBranch('Bangalore').filter((s) => s.academic_track === 'Mirai Track');
    const jprSubjects = getSubjectsByBranch('Jaipur').filter((s) => s.academic_track === 'Mirai Track');

    // Check that faculty assignments are separate per branch
    const gzbFacultyIds = gzbSubjects.map((s) => s.faculty_id);
    const blrFacultyIds = blrSubjects.map((s) => s.faculty_id);
    const jprFacultyIds = jprSubjects.map((s) => s.faculty_id);

    expect(gzbFacultyIds).toContain('user-fac-radhika'); // Dr. Radhika Sharma at Ghaziabad
    expect(blrFacultyIds).toContain('user-fac-anand');   // Dr. Anand Murthy at Bangalore
    expect(jprFacultyIds).toContain('user-fac-vikram');  // Prof. Vikram Rathore at Jaipur

    // Confirm no unwanted faculty crossover
    expect(gzbFacultyIds).not.toContain('user-fac-anand');
    expect(blrFacultyIds).not.toContain('user-fac-radhika');

    // Check timetables are independent
    const gzbTimetable = getTimetableByBranch('Ghaziabad');
    const blrTimetable = getTimetableByBranch('Bangalore');

    expect(gzbTimetable.length).toBeGreaterThan(0);
    expect(blrTimetable.length).toBeGreaterThan(0);
    // Bangalore has different slot days or room allocations
    expect(gzbTimetable[0].room).not.toBe(blrTimetable[0].room);
  });

  // Validation 5: A holiday or exam-date change in one branch does not alter another branch's calendar
  it("Validation 5: A holiday or exam-date change in one branch does not alter another branch's calendar", () => {
    const adminUser = INITIAL_USERS.find((u) => u.role === 'admin')!;

    // Initial holiday counts
    const gzbHolidaysBefore = getHolidaysByBranch('Ghaziabad');
    const blrHolidaysBefore = getHolidaysByBranch('Bangalore');
    const jprHolidaysBefore = getHolidaysByBranch('Jaipur');

    // Add a regional Karnataka holiday to Bangalore branch only
    addHoliday(
      {
        semester_id: 'sem-blr-mirai',
        branch_id: 'Bangalore',
        campus_id: 'Bangalore',
        date: '2026-11-01',
        name: 'Karnataka Rajyotsava Special Holiday',
        is_non_teaching: true,
      },
      adminUser
    );

    const gzbHolidaysAfter = getHolidaysByBranch('Ghaziabad');
    const blrHolidaysAfter = getHolidaysByBranch('Bangalore');
    const jprHolidaysAfter = getHolidaysByBranch('Jaipur');

    // Bangalore holidays increased by 1
    expect(blrHolidaysAfter.length).toBe(blrHolidaysBefore.length + 1);
    expect(blrHolidaysAfter.some((h) => h.name === 'Karnataka Rajyotsava Special Holiday')).toBe(true);

    // Ghaziabad and Jaipur calendars remain completely unaffected
    expect(gzbHolidaysAfter.length).toBe(gzbHolidaysBefore.length);
    expect(gzbHolidaysAfter.some((h) => h.name === 'Karnataka Rajyotsava Special Holiday')).toBe(false);

    expect(jprHolidaysAfter.length).toBe(jprHolidaysBefore.length);
    expect(jprHolidaysAfter.some((h) => h.name === 'Karnataka Rajyotsava Special Holiday')).toBe(false);

    // Add exam for Ghaziabad AKTU
    const gzbExamsBefore = getExaminationsByBranch('Ghaziabad');
    const blrExamsBefore = getExaminationsByBranch('Bangalore');

    saveExamination(
      {
        subject_id: 'subj-gzb-kcs301',
        batch_id: 'batch-gzb-univ',
        branch_id: 'Ghaziabad',
        academic_track: 'University Track',
        name: 'AKTU Odd Semester Final Theory Window',
        exam_date: '2026-12-10',
        syllabus_scope_topic_ids: ['top-kcs-01', 'top-kcs-02'],
      },
      adminUser
    );

    const gzbExamsAfter = getExaminationsByBranch('Ghaziabad');
    const blrExamsAfter = getExaminationsByBranch('Bangalore');

    expect(gzbExamsAfter.length).toBe(gzbExamsBefore.length + 1);
    expect(blrExamsAfter.length).toBe(blrExamsBefore.length); // Unchanged
  });

  // Validation 6: Campus Managers cannot access another branch's records
  it("Validation 6: Campus Managers cannot access another branch's records", () => {
    const gzbManager = INITIAL_USERS.find((u) => u.id === 'user-mgr-gzb')!;
    const blrManager = INITIAL_USERS.find((u) => u.id === 'user-mgr-blr')!;
    const jprManager = INITIAL_USERS.find((u) => u.id === 'user-mgr-jpr')!;

    expect(gzbManager.branch_id).toBe('Ghaziabad');
    expect(blrManager.branch_id).toBe('Bangalore');
    expect(jprManager.branch_id).toBe('Jaipur');

    // Simulate Ghaziabad Campus Manager query
    const gzbManagerBatches = getBatchesByBranch(gzbManager.branch_id);
    const gzbManagerSubjects = getSubjectsByBranch(gzbManager.branch_id);
    const gzbManagerMissed = getMissedSessions().filter(
      (m) => (m.branch_id || m.campus_id) === gzbManager.branch_id
    );

    // Ghaziabad manager only receives Ghaziabad records
    expect(gzbManagerBatches.every((b) => b.branch_id === 'Ghaziabad')).toBe(true);
    expect(gzbManagerBatches.some((b) => b.branch_id === 'Bangalore')).toBe(false);
    expect(gzbManagerSubjects.every((s) => s.branch_id === 'Ghaziabad')).toBe(true);
    expect(gzbManagerSubjects.some((s) => s.branch_id === 'Bangalore')).toBe(false);
    expect(gzbManagerMissed.every((m) => (m.branch_id || m.campus_id) === 'Ghaziabad')).toBe(true);
    expect(gzbManagerMissed.some((m) => (m.branch_id || m.campus_id) === 'Bangalore')).toBe(false);

    // Simulate Bangalore Campus Manager query
    const blrManagerBatches = getBatchesByBranch(blrManager.branch_id);
    expect(blrManagerBatches.every((b) => b.branch_id === 'Bangalore')).toBe(true);
    expect(blrManagerBatches.some((b) => b.branch_id === 'Ghaziabad')).toBe(false);
  });

  // Validation 7: Admins can compare all three branches
  it('Validation 7: Admins can compare all three branches', () => {
    const branches = getBranches();
    expect(branches.map((b) => b.id)).toEqual(['Ghaziabad', 'Bangalore', 'Jaipur']);

    const adminUser = INITIAL_USERS.find((u) => u.role === 'admin')!;
    expect(adminUser.role).toBe('admin');
    expect(adminUser.branch_id).toBeUndefined(); // Global access across all branches

    // Compute consolidated metric matrix across all 3 branches
    const consolidatedMatrix = branches.map((branch) => {
      const branchBatches = getBatchesByBranch(branch.id);
      const branchSubjects = getSubjectsByBranch(branch.id);
      const branchTimetable = getTimetableByBranch(branch.id);
      const branchHolidays = getHolidaysByBranch(branch.id);

      return {
        branchId: branch.id,
        university: branch.university_short_name,
        totalBatches: branchBatches.length,
        totalSubjects: branchSubjects.length,
        totalSlots: branchTimetable.length,
        totalHolidays: branchHolidays.length,
      };
    });

    expect(consolidatedMatrix).toHaveLength(3);

    // Ghaziabad
    expect(consolidatedMatrix[0].branchId).toBe('Ghaziabad');
    expect(consolidatedMatrix[0].university).toBe('AKTU');
    expect(consolidatedMatrix[0].totalBatches).toBeGreaterThanOrEqual(2);

    // Bangalore
    expect(consolidatedMatrix[1].branchId).toBe('Bangalore');
    expect(consolidatedMatrix[1].university).toBe('VTU');
    expect(consolidatedMatrix[1].totalBatches).toBeGreaterThanOrEqual(2);

    // Jaipur
    expect(consolidatedMatrix[2].branchId).toBe('Jaipur');
    expect(consolidatedMatrix[2].university).toBe('Jagannath University');
    expect(consolidatedMatrix[2].totalBatches).toBeGreaterThanOrEqual(2);
  });

  // Validation 8: Existing calculation formulas remain unchanged
  it('Validation 8: Existing calculation formulas remain unchanged', () => {
    // Test 1: calculateHoursInScope
    const sampleTopics = [
      { id: '1', planned_hours: 3.0, status: 'completed' as const },
      { id: '2', planned_hours: 2.5, status: 'in_progress' as const },
      { id: '3', planned_hours: 4.0, status: 'skipped' as const }, // Skipped must NOT be in scope
    ];
    expect(calculateHoursInScope(sampleTopics as unknown as Topic[])).toBe(5.5);

    // Test 2: calculateCoveredHours
    const coveredSample = [
      { id: '1', planned_hours: 3.0, status: 'completed' as const, completion_percentage: 100 },
      { id: '2', planned_hours: 2.0, status: 'in_progress' as const, completion_percentage: 50 }, // 1.0 hr covered
      { id: '3', planned_hours: 4.0, status: 'not_started' as const, completion_percentage: 0 },
    ];
    expect(calculateCoveredHours(coveredSample as unknown as Topic[])).toBe(4.0);

    // Test 3: calculateCoveragePercentage
    expect(calculateCoveragePercentage(4.0, 5.0)).toBe(80);
    expect(calculateCoveragePercentage(0, 0)).toBe(0);

    // Test 4: calculateRemainingHours
    expect(calculateRemainingHours(10.0, 4.0)).toBe(6.0);
    expect(calculateRemainingHours(10.0, 12.0)).toBe(0);

    // Test 5: calculateBufferRatio
    expect(calculateBufferRatio(10.0, 5.0)).toBe(2.0);
    expect(calculateBufferRatio(5.0, 0)).toBe(Infinity); // Infinite when 0 remaining

    // Test 6: determineProgressionStatus thresholds
    // COMPLETE: remaining <= 0
    expect(determineProgressionStatus(0, Infinity)).toBe('COMPLETE');
    // DANGER: buffer < 1.0
    expect(determineProgressionStatus(5, 0.8)).toBe('DANGER');
    // TIGHT: buffer >= 1.0 and < 1.15
    expect(determineProgressionStatus(5, 1.1)).toBe('TIGHT');
    // ON TRACK: buffer >= 1.15
    expect(determineProgressionStatus(5, 1.6)).toBe('ON TRACK');

    // Test 7: determineTrackOverallStatus (Worst-subject rule)
    expect(determineTrackOverallStatus(['ON TRACK', 'COMPLETE', 'ON TRACK'])).toBe('ON TRACK');
    expect(determineTrackOverallStatus(['ON TRACK', 'TIGHT', 'ON TRACK'])).toBe('TIGHT');
    expect(determineTrackOverallStatus(['COMPLETE', 'TIGHT', 'DANGER'])).toBe('DANGER');
  });
});
