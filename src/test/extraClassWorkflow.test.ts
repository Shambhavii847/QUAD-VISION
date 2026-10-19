import { describe, it, expect, beforeEach } from 'vitest';
import {
  createExtraClassRequest,
  withdrawExtraClassRequest,
  reviseExtraClassRequest,
  reviewExtraClassRequest,
  getExtraClassRequests,
  getApprovedExtraClasses,
  getExtraClassRequestsForUser,
  getApprovedExtraClassesForUser,
  getAuditLogs,
  getTimetable,
  getExaminations,
  getHolidays,
  getSubjects,
  getBatches,
  resetToDemoData,
} from '../services/storage';
import { detectExtraClassClashes } from '../utils/clashDetection';
import { UserProfile, ExtraClassRequest } from '../types';

describe('Extra Class Request & Approval Workflow Verification', () => {
  beforeEach(() => {
    resetToDemoData();
  });
  // Mock Personas
  const facultyRadhika: UserProfile = {
    id: 'user-fac-radhika',
    name: 'Dr. Radhika Sharma',
    email: 'radhika.gzb@msot.edu',
    role: 'faculty',
    branch_id: 'Ghaziabad',
    assigned_track: 'Mirai Track',
    assigned_subject_ids: ['subj-gzb-cs301'],
  };

  const facultyArvind: UserProfile = {
    id: 'user-fac-arvind',
    name: 'Prof. Arvind Menon',
    email: 'arvind.gzb@msot.edu',
    role: 'faculty',
    branch_id: 'Ghaziabad',
    assigned_track: 'Mirai Track',
    assigned_subject_ids: ['subj-gzb-cs302'],
  };

  const campusManagerGzb: UserProfile = {
    id: 'user-mgr-gzb',
    name: 'Vikramaditya Roy',
    email: 'manager.gzb@msot.edu',
    role: 'campus_manager',
    branch_id: 'Ghaziabad',
    campus_id: 'Ghaziabad',
  };

  const campusManagerBlr: UserProfile = {
    id: 'user-mgr-blr',
    name: 'Pooja Hegde',
    email: 'manager.blr@msot.edu',
    role: 'campus_manager',
    branch_id: 'Bangalore',
    campus_id: 'Bangalore',
  };

  const adminUser: UserProfile = {
    id: 'user-admin',
    name: 'Dr. Suresh Chandra',
    email: 'admin@msot.edu',
    role: 'admin',
  };

  const studentAman: UserProfile = {
    id: 'user-student-aman',
    name: 'Aman Gupta (Ghaziabad Student)',
    email: 'aman.gzb@msot.edu',
    role: 'student',
    branch_id: 'Ghaziabad',
    assigned_batch_ids: ['batch-gzb-mirai'],
  };

  const studentDeepa: UserProfile = {
    id: 'user-student-deepa',
    name: 'Deepa Swaminathan (Bangalore Student)',
    email: 'deepa.blr@msot.edu',
    role: 'student',
    branch_id: 'Bangalore',
    assigned_batch_ids: ['batch-blr-vtu'],
  };

  it('1. Faculty can submit a valid extra class request with PENDING status and audit trail', () => {
    const res = createExtraClassRequest(
      {
        branch_id: 'Ghaziabad',
        academic_track: 'Mirai Track',
        batch_id: 'batch-gzb-mirai',
        subject_id: 'subj-gzb-cs301',
        date: '2026-10-05',
        start_time: '16:00',
        end_time: '17:30',
        room: 'Lab 3 - Mirai Block',
        reason: 'Midterm algorithmic problem solving drill',
        notes: 'Requested whiteboard markers and projector',
      },
      facultyRadhika
    );

    expect(res.success).toBe(true);
    expect(res.request).toBeDefined();
    const req = res.request!;

    expect(req.id).toMatch(/^ecr-/);
    expect(req.status).toBe('pending');
    expect(req.faculty_id).toBe(facultyRadhika.id);
    expect(req.faculty_name).toBe(facultyRadhika.name);
    expect(req.duration_hours).toBe(1.5);
    expect(req.history.length).toBeGreaterThanOrEqual(1);
    expect(req.history[0].action).toContain('Created extra class request');

    // Audit trail should record creation
    const logs = getAuditLogs();
    const creationLog = logs.find((l) => l.entity_id === req.id && l.action === 'create');
    expect(creationLog).toBeDefined();
    expect(creationLog?.performed_by_id).toBe(facultyRadhika.id);
  });

  it('1b. Validates that end time must be after start time and required fields must be present', () => {
    // End time before start time
    const invalidTime = createExtraClassRequest(
      {
        branch_id: 'Ghaziabad',
        academic_track: 'Mirai Track',
        batch_id: 'batch-gzb-mirai',
        subject_id: 'subj-gzb-cs301',
        date: '2026-10-06',
        start_time: '16:00',
        end_time: '15:00', // Invalid!
        reason: 'Revision test',
      },
      facultyRadhika
    );
    expect(invalidTime.success).toBe(false);
    expect(invalidTime.error).toContain('End time must be after start time');

    // Missing reason
    const missingReason = createExtraClassRequest(
      {
        branch_id: 'Ghaziabad',
        academic_track: 'Mirai Track',
        batch_id: 'batch-gzb-mirai',
        subject_id: 'subj-gzb-cs301',
        date: '2026-10-06',
        start_time: '14:00',
        end_time: '15:30',
        reason: '   ', // Blank!
      },
      facultyRadhika
    );
    expect(missingReason.success).toBe(false);
    expect(missingReason.error).toContain('required fields');
  });

  it('2. Request scoping and branch isolation: Campus Managers see only their branch requests, Admins see all', () => {
    // Submit request in Ghaziabad
    const gzbRes = createExtraClassRequest(
      {
        branch_id: 'Ghaziabad',
        academic_track: 'Mirai Track',
        batch_id: 'batch-gzb-mirai',
        subject_id: 'subj-gzb-cs301',
        date: '2026-10-10',
        start_time: '14:00',
        end_time: '15:30',
        reason: 'Ghaziabad specific extra class',
      },
      facultyRadhika
    );

    const gzbRequestsForMgr = getExtraClassRequestsForUser(campusManagerGzb);
    expect(gzbRequestsForMgr.some((r) => r.id === gzbRes.request?.id)).toBe(true);

    // Bangalore Manager should NOT see Ghaziabad request
    const blrRequestsForMgr = getExtraClassRequestsForUser(campusManagerBlr);
    expect(blrRequestsForMgr.some((r) => r.id === gzbRes.request?.id)).toBe(false);

    // Admin should see both
    const adminRequests = getExtraClassRequestsForUser(adminUser);
    expect(adminRequests.some((r) => r.id === gzbRes.request?.id)).toBe(true);
  });

  it('3. Clash detection identifies duplicate requests, timetable overlaps, holiday and examination conflicts', () => {
    // Create an approved or pending request on 2026-10-12
    const baseRes = createExtraClassRequest(
      {
        branch_id: 'Ghaziabad',
        academic_track: 'Mirai Track',
        batch_id: 'batch-gzb-mirai',
        subject_id: 'subj-gzb-cs301',
        date: '2026-10-12',
        start_time: '10:00',
        end_time: '11:30',
        reason: 'Algorithms extra class',
      },
      facultyRadhika
    );

    // Test exact duplicate
    const duplicateCandidate: ExtraClassRequest = {
      ...baseRes.request!,
      id: 'ecr-duplicate-test',
    };

    const duplicateCheck = detectExtraClassClashes(duplicateCandidate, {
      existingRequests: getExtraClassRequests(),
      timetable: getTimetable(),
      examinations: getExaminations(),
      holidays: getHolidays(),
      subjects: getSubjects(),
      batches: getBatches(),
    });

    expect(duplicateCheck.hasClashes).toBe(true);
    expect(duplicateCheck.conflicts.some((c) => c.type === 'duplicate_request')).toBe(true);
    expect(duplicateCheck.canOverride).toBe(false); // Duplicates can NEVER be overridden

    // Test holiday conflict on Gandhi Jayanti (2026-10-02)
    const holidayCandidate: ExtraClassRequest = {
      ...baseRes.request!,
      id: 'ecr-holiday-test',
      date: '2026-10-02', // Non-teaching holiday
      start_time: '10:00',
      end_time: '11:30',
    };

    const holidayCheck = detectExtraClassClashes(holidayCandidate, {
      existingRequests: [],
      timetable: [],
      examinations: [],
      holidays: getHolidays(),
      subjects: getSubjects(),
      batches: getBatches(),
    });

    expect(holidayCheck.hasClashes).toBe(true);
    expect(holidayCheck.conflicts.some((c) => c.type === 'holiday_clash')).toBe(true);
  });

  it('4. Manager approves a conflict-free request: updates status to APPROVED, creates calendar event, updates student calendar', () => {
    // Create a conflict-free request on a Sunday or clear Saturday slot
    const createRes = createExtraClassRequest(
      {
        branch_id: 'Ghaziabad',
        academic_track: 'Mirai Track',
        batch_id: 'batch-gzb-mirai',
        subject_id: 'subj-gzb-cs301',
        date: '2026-10-18', // Sunday
        start_time: '11:00',
        end_time: '12:30',
        room: 'Lecture Hall 101',
        reason: 'Sunday specialized competitive programming tutorial',
      },
      facultyRadhika
    );

    expect(createRes.success).toBe(true);
    const reqId = createRes.request!.id;

    // Before approval: Pending request should NOT appear in approved extra classes
    const approvedBefore = getApprovedExtraClasses();
    expect(approvedBefore.some((a) => a.request_id === reqId)).toBe(false);

    // Student calendar before approval should NOT contain this event
    const studentEventsBefore = getApprovedExtraClassesForUser(studentAman);
    expect(studentEventsBefore.some((a) => a.request_id === reqId)).toBe(false);

    // Campus Manager approves the request
    const reviewRes = reviewExtraClassRequest(
      reqId,
      {
        decision: 'approve',
        room: 'Lecture Hall 101',
      },
      campusManagerGzb
    );

    expect(reviewRes.success).toBe(true);

    // Request status updated to APPROVED
    const updatedRequests = getExtraClassRequests();
    const updatedReq = updatedRequests.find((r) => r.id === reqId);
    expect(updatedReq?.status).toBe('approved');
    expect(updatedReq?.reviewed_by_id).toBe(campusManagerGzb.id);
    expect(updatedReq?.reviewed_by_name).toBe(campusManagerGzb.name);

    // Official extra class calendar event linked to request is created
    const approvedAfter = getApprovedExtraClasses();
    const officialEvent = approvedAfter.find((a) => a.request_id === reqId);
    expect(officialEvent).toBeDefined();
    expect(officialEvent?.room).toBe('Lecture Hall 101');
    expect(officialEvent?.date).toBe('2026-10-18');
    expect(officialEvent?.start_time).toBe('11:00');

    // Confirmed extra class now appears on student calendar
    const studentEventsAfter = getApprovedExtraClassesForUser(studentAman);
    expect(studentEventsAfter.some((a) => a.request_id === reqId)).toBe(true);
  });

  it('5. Manager rejects request with mandatory reason: status updated to REJECTED, does NOT publish to calendar', () => {
    const createRes = createExtraClassRequest(
      {
        branch_id: 'Ghaziabad',
        academic_track: 'Mirai Track',
        batch_id: 'batch-gzb-mirai',
        subject_id: 'subj-gzb-cs301',
        date: '2026-10-19',
        start_time: '14:00',
        end_time: '15:30',
        reason: 'Unneeded extra session',
      },
      facultyRadhika
    );

    const reqId = createRes.request!.id;

    // Rejecting without reason must fail
    const failReject = reviewExtraClassRequest(
      reqId,
      {
        decision: 'reject',
        reason: '', // Empty reason!
      },
      campusManagerGzb
    );
    expect(failReject.success).toBe(false);
    expect(failReject.error).toContain('Mandatory rejection reason');

    // Rejecting with valid reason
    const validReject = reviewExtraClassRequest(
      reqId,
      {
        decision: 'reject',
        reason: 'Syllabus is already 100% on schedule according to buffer calculations.',
      },
      campusManagerGzb
    );
    expect(validReject.success).toBe(true);

    const requests = getExtraClassRequests();
    const target = requests.find((r) => r.id === reqId);
    expect(target?.status).toBe('rejected');
    expect(target?.rejection_reason).toContain('Syllabus is already 100% on schedule');

    // Rejected event must NEVER appear on official or student calendar
    const approvedClasses = getApprovedExtraClasses();
    expect(approvedClasses.some((a) => a.request_id === reqId)).toBe(false);

    const studentEvents = getApprovedExtraClassesForUser(studentAman);
    expect(studentEvents.some((a) => a.request_id === reqId)).toBe(false);
  });

  it('6. Faculty cannot approve their own requests or directly publish calendar events', () => {
    const createRes = createExtraClassRequest(
      {
        branch_id: 'Ghaziabad',
        academic_track: 'Mirai Track',
        batch_id: 'batch-gzb-mirai',
        subject_id: 'subj-gzb-cs301',
        date: '2026-10-21',
        start_time: '16:00',
        end_time: '17:30',
        reason: 'Self-approval bypass attempt',
      },
      facultyRadhika
    );

    const reqId = createRes.request!.id;

    // Faculty attempts to approve their own request
    const bypassAttempt = reviewExtraClassRequest(
      reqId,
      {
        decision: 'approve',
      },
      facultyRadhika // Faculty user
    );

    expect(bypassAttempt.success).toBe(false);
    expect(bypassAttempt.error).toContain('Faculty members cannot approve');

    // Request must remain pending
    const requests = getExtraClassRequests();
    expect(requests.find((r) => r.id === reqId)?.status).toBe('pending');
  });

  it('7. Cross-branch review is blocked for Campus Managers (Bangalore manager cannot review Ghaziabad request)', () => {
    const gzbReq = createExtraClassRequest(
      {
        branch_id: 'Ghaziabad',
        academic_track: 'Mirai Track',
        batch_id: 'batch-gzb-mirai',
        subject_id: 'subj-gzb-cs301',
        date: '2026-10-22',
        start_time: '14:00',
        end_time: '15:30',
        reason: 'Testing cross-branch security barrier',
      },
      facultyRadhika
    );

    const reqId = gzbReq.request!.id;

    // Bangalore Manager attempts to approve a Ghaziabad request
    const crossBranchAttempt = reviewExtraClassRequest(
      reqId,
      {
        decision: 'approve',
      },
      campusManagerBlr // Bangalore Manager
    );

    expect(crossBranchAttempt.success).toBe(false);
    expect(crossBranchAttempt.error).toContain('Access denied');
  });

  it('8. Changes Requested workflow: Manager requests changes, faculty revises and resubmits, preserving history', () => {
    const createRes = createExtraClassRequest(
      {
        branch_id: 'Ghaziabad',
        academic_track: 'Mirai Track',
        batch_id: 'batch-gzb-mirai',
        subject_id: 'subj-gzb-cs301',
        date: '2026-10-23',
        start_time: '13:00',
        end_time: '14:30',
        reason: 'Initial schedule proposition',
      },
      facultyRadhika
    );

    const reqId = createRes.request!.id;

    // Manager requests changes
    const changeRes = reviewExtraClassRequest(
      reqId,
      {
        decision: 'request_changes',
        change_request_notes: 'Please shift to 15:30 as the lab is reserved for network maintenance until 15:00.',
      },
      campusManagerGzb
    );

    expect(changeRes.success).toBe(true);

    const reqAfterChange = getExtraClassRequests().find((r) => r.id === reqId);
    expect(reqAfterChange?.status).toBe('changes_requested');
    expect(reqAfterChange?.change_request_notes).toContain('Please shift to 15:30');

    // Faculty revises and resubmits
    const reviseRes = reviseExtraClassRequest(
      reqId,
      {
        start_time: '15:30',
        end_time: '17:00',
        revision_notes: 'Shifted start time to 15:30 per lab maintenance schedule.',
      },
      facultyRadhika
    );

    expect(reviseRes.success).toBe(true);
    expect(reviseRes.request?.status).toBe('pending'); // Reset to pending
    expect(reviseRes.request?.start_time).toBe('15:30');
    expect(reviseRes.request?.end_time).toBe('17:00');

    // History must preserve both creation, change request, and revision entries
    const history = reviseRes.request!.history;
    expect(history.length).toBeGreaterThanOrEqual(3);
    expect(history.some((h) => h.action.includes('Requested changes'))).toBe(true);
    expect(history.some((h) => h.action.includes('Revised and resubmitted'))).toBe(true);
  });

  it('9. Faculty can withdraw pending or change-requested request, but not approved request', () => {
    const createRes = createExtraClassRequest(
      {
        branch_id: 'Ghaziabad',
        academic_track: 'Mirai Track',
        batch_id: 'batch-gzb-mirai',
        subject_id: 'subj-gzb-cs301',
        date: '2026-10-27',
        start_time: '15:00',
        end_time: '16:30',
        reason: 'Session that will be withdrawn',
      },
      facultyRadhika
    );

    const reqId = createRes.request!.id;

    // Another faculty cannot withdraw Radhika's request
    const unauthorizedWithdraw = withdrawExtraClassRequest(reqId, facultyArvind);
    expect(unauthorizedWithdraw.success).toBe(false);
    expect(unauthorizedWithdraw.error).toContain('Permission denied');

    // Radhika withdraws her own request
    const withdrawRes = withdrawExtraClassRequest(reqId, facultyRadhika);
    expect(withdrawRes.success).toBe(true);

    const req = getExtraClassRequests().find((r) => r.id === reqId);
    expect(req?.status).toBe('withdrawn');

    // Cannot withdraw already withdrawn request
    const secondWithdraw = withdrawExtraClassRequest(reqId, facultyRadhika);
    expect(secondWithdraw.success).toBe(false);
    expect(secondWithdraw.error).toContain('already withdrawn');
  });

  it('10. Concurrency guard: Re-checks conflicts upon submission and requires authorized override if clashing', () => {
    // 2026-10-02 is Gandhi Jayanti (holiday)
    const holidayReq = createExtraClassRequest(
      {
        branch_id: 'Ghaziabad',
        academic_track: 'Mirai Track',
        batch_id: 'batch-gzb-mirai',
        subject_id: 'subj-gzb-cs301',
        date: '2026-10-02',
        start_time: '10:00',
        end_time: '11:30',
        reason: 'Special session on holiday',
      },
      facultyRadhika
    );

    const reqId = holidayReq.request!.id;

    // Approval without override reason must fail due to holiday conflict
    const failedApproval = reviewExtraClassRequest(
      reqId,
      {
        decision: 'approve',
        override_reason: '', // No override reason!
      },
      campusManagerGzb
    );

    expect(failedApproval.success).toBe(false);
    expect(failedApproval.error).toContain('Schedule conflicts detected');
    expect(failedApproval.conflicts).toBeDefined();
    expect(failedApproval.conflicts?.some((c) => c.type === 'holiday_clash')).toBe(true);

    // Approval WITH authorized override reason succeeds
    const successApproval = reviewExtraClassRequest(
      reqId,
      {
        decision: 'approve',
        override_reason: 'Authorized holiday workshop by Campus Director clearance REF-2026-88',
      },
      campusManagerGzb
    );

    expect(successApproval.success).toBe(true);
    const approvedEvent = getApprovedExtraClasses().find((a) => a.request_id === reqId);
    expect(approvedEvent).toBeDefined();
    expect(approvedEvent?.override_reason).toContain('Authorized holiday workshop');
  });
});
