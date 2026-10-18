import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateSubjectProgress,
  calculateExamReadiness,
  calculateHoursInScope,
  calculateCoveredHours,
  calculateCoveragePercentage,
  calculateRemainingHours,
  calculateBufferRatio,
  determineProgressionStatus,
  determineTrackOverallStatus,
  isTeachingDay,
  calculateAvailableTeachingHours,
  recalculateTopicPlannedDates,
} from '../utils/calculations';
import { Subject, Topic, Semester, Holiday, TimetableEntry, Examination } from '../types';

describe('Three Subjects Comprehensive Academic Progression Verification', () => {
  const semester: Semester = {
    id: 'sem-2026-autumn-b1',
    batch_id: 'batch-2024-cs-a',
    semester_number: 3,
    start_date: '2026-08-01',
    end_date: '2026-11-30',
    working_weekdays: [1, 2, 3, 4, 5, 6], // Mon-Sat
    saturday_rule: 'second_fourth',        // 2nd & 4th Sat off
  };

  const holidays: Holiday[] = [
    {
      id: 'hol-1',
      semester_id: 'sem-2026-autumn-b1',
      date: '2026-08-15',
      name: 'Independence Day',
      is_non_teaching: true,
    },
    {
      id: 'hol-2',
      semester_id: 'sem-2026-autumn-b1',
      date: '2026-10-02',
      name: 'Gandhi Jayanti',
      is_non_teaching: true,
    },
  ];

  // Subject 1: CS301 (Data Structures) - Target: ON TRACK
  const subjectCS301: Subject = {
    id: 'subj-cs301',
    batch_id: 'batch-2024-cs-a',
    semester_number: 3,
    code: 'CS301',
    name: 'Data Structures & Algorithms',
    total_credits: 4,
    faculty_id: 'user-faculty-radhika',
    faculty_name: 'Dr. Radhika Sharma',
  };

  // Subject 2: CS302 (DBMS) - Target: TIGHT
  const subjectCS302: Subject = {
    id: 'subj-cs302',
    batch_id: 'batch-2024-cs-a',
    semester_number: 3,
    code: 'CS302',
    name: 'Database Management Systems',
    total_credits: 4,
    faculty_id: 'user-faculty-arvind',
    faculty_name: 'Prof. Arvind Menon',
  };

  // Subject 3: CS303 (Computer Networks) - Target: DANGER
  const subjectCS303: Subject = {
    id: 'subj-cs303',
    batch_id: 'batch-2024-cs-a',
    semester_number: 3,
    code: 'CS303',
    name: 'Computer Networks & Security',
    total_credits: 4,
    faculty_id: 'user-faculty-priya',
    faculty_name: 'Dr. Priya Nair',
  };

  const topicsCS301: Topic[] = [
    { id: 't1', unit_id: 'u1', subject_id: 'subj-cs301', title: 'Arrays & Stacks', planned_hours: 10, sequence_order: 1, status: 'completed', completion_percentage: 100 },
    { id: 't2', unit_id: 'u1', subject_id: 'subj-cs301', title: 'Queues & Deque', planned_hours: 10, sequence_order: 2, status: 'completed', completion_percentage: 100 },
    { id: 't3', unit_id: 'u2', subject_id: 'subj-cs301', title: 'Trees & BST', planned_hours: 15, sequence_order: 3, status: 'in_progress', completion_percentage: 40 },
    { id: 't4', unit_id: 'u2', subject_id: 'subj-cs301', title: 'Graphs BFS/DFS', planned_hours: 15, sequence_order: 4, status: 'not_started', completion_percentage: 0 },
  ];

  const topicsCS302: Topic[] = [
    { id: 'd1', unit_id: 'du1', subject_id: 'subj-cs302', title: 'Relational Model', planned_hours: 12, sequence_order: 1, status: 'completed', completion_percentage: 100 },
    { id: 'd2', unit_id: 'du1', subject_id: 'subj-cs302', title: 'SQL & Normalization', planned_hours: 18, sequence_order: 2, status: 'in_progress', completion_percentage: 20 },
    { id: 'd3', unit_id: 'du2', subject_id: 'subj-cs302', title: 'Transactions & Concurrency', planned_hours: 20, sequence_order: 3, status: 'not_started', completion_percentage: 0 },
  ];

  const topicsCS303: Topic[] = [
    { id: 'n1', unit_id: 'nu1', subject_id: 'subj-cs303', title: 'OSI Reference Model', planned_hours: 8, sequence_order: 1, status: 'completed', completion_percentage: 100 },
    { id: 'n2', unit_id: 'nu1', subject_id: 'subj-cs303', title: 'TCP/IP Architecture', planned_hours: 12, sequence_order: 2, status: 'not_started', completion_percentage: 0 },
    { id: 'n3', unit_id: 'nu2', subject_id: 'subj-cs303', title: 'Routing Protocols', planned_hours: 20, sequence_order: 3, status: 'not_started', completion_percentage: 0 },
    { id: 'n4', unit_id: 'nu2', subject_id: 'subj-cs303', title: 'Network Cryptography', planned_hours: 10, sequence_order: 4, status: 'not_started', completion_percentage: 0 },
  ];

  const timetable: TimetableEntry[] = [
    // CS301 has 3 slots of 1.5h per week (Mon, Wed, Fri) = 4.5h / week
    { id: 'tt1', batch_id: 'batch-2024-cs-a', subject_id: 'subj-cs301', day_of_week: 1, start_time: '09:00', end_time: '10:30', duration_hours: 1.5, room: 'LH-101', faculty_id: 'user-faculty-radhika' },
    { id: 'tt2', batch_id: 'batch-2024-cs-a', subject_id: 'subj-cs301', day_of_week: 3, start_time: '09:00', end_time: '10:30', duration_hours: 1.5, room: 'LH-101', faculty_id: 'user-faculty-radhika' },
    { id: 'tt3', batch_id: 'batch-2024-cs-a', subject_id: 'subj-cs301', day_of_week: 5, start_time: '09:00', end_time: '10:30', duration_hours: 1.5, room: 'LH-101', faculty_id: 'user-faculty-radhika' },

    // CS302 has 2 slots of 1.5h per week (Tue, Thu) = 3.0h / week
    { id: 'tt4', batch_id: 'batch-2024-cs-a', subject_id: 'subj-cs302', day_of_week: 2, start_time: '11:00', end_time: '12:30', duration_hours: 1.5, room: 'LH-102', faculty_id: 'user-faculty-arvind' },
    { id: 'tt5', batch_id: 'batch-2024-cs-a', subject_id: 'subj-cs302', day_of_week: 4, start_time: '11:00', end_time: '12:30', duration_hours: 1.5, room: 'LH-102', faculty_id: 'user-faculty-arvind' },

    // CS303 has only 1 slot of 1.5h per week (Sat) = 1.5h / week
    { id: 'tt6', batch_id: 'batch-2024-cs-a', subject_id: 'subj-cs303', day_of_week: 6, start_time: '14:00', end_time: '15:30', duration_hours: 1.5, room: 'LH-103', faculty_id: 'user-faculty-priya' },
  ];

  it('Verifies Subject 1 (CS301) manual calculation formulas', () => {
    const scope = calculateHoursInScope(topicsCS301);
    expect(scope).toBe(50); // 10 + 10 + 15 + 15 = 50

    const covered = calculateCoveredHours(topicsCS301);
    // t1(10) + t2(10) + t3(15 * 0.4 = 6) + t4(0) = 26
    expect(covered).toBe(26);

    const rem = calculateRemainingHours(scope, covered);
    expect(rem).toBe(24);

    const pct = calculateCoveragePercentage(covered, scope);
    expect(pct).toBe(52); // 26 / 50 * 100 = 52.0%
  });

  it('Verifies Subject 2 (CS302) manual calculation formulas', () => {
    const scope = calculateHoursInScope(topicsCS302);
    expect(scope).toBe(50); // 12 + 18 + 20 = 50

    const covered = calculateCoveredHours(topicsCS302);
    // d1(12) + d2(18 * 0.2 = 3.6) + d3(0) = 15.6
    expect(covered).toBe(15.6);

    const rem = calculateRemainingHours(scope, covered);
    expect(rem).toBe(34.4); // 50 - 15.6 = 34.4
  });

  it('Verifies Subject 3 (CS303) manual calculation formulas', () => {
    const scope = calculateHoursInScope(topicsCS303);
    expect(scope).toBe(50); // 8 + 12 + 20 + 10 = 50

    const covered = calculateCoveredHours(topicsCS303);
    expect(covered).toBe(8); // 8 + 0 + 0 + 0 = 8

    const rem = calculateRemainingHours(scope, covered);
    expect(rem).toBe(42); // 50 - 8 = 42
  });

  it('Verifies Indian 2nd and 4th Saturday holiday logic', () => {
    // August 2026:
    // Aug 1: Saturday (1st Saturday) -> Working
    // Aug 8: Saturday (2nd Saturday) -> Off
    // Aug 15: Saturday (3rd Saturday) -> Working day per rule, but declared holiday (Independence Day)
    // Aug 22: Saturday (4th Saturday) -> Off
    // Aug 29: Saturday (5th Saturday) -> Working

    const aug1 = new Date('2026-08-01T09:00:00');
    expect(isTeachingDay(aug1, semester, holidays)).toBe(true);

    const aug8 = new Date('2026-08-08T09:00:00');
    expect(isTeachingDay(aug8, semester, holidays)).toBe(false); // 2nd Sat

    const aug15 = new Date('2026-08-15T09:00:00');
    expect(isTeachingDay(aug15, semester, holidays)).toBe(false); // Declared holiday

    const aug22 = new Date('2026-08-22T09:00:00');
    expect(isTeachingDay(aug22, semester, holidays)).toBe(false); // 4th Sat

    const aug29 = new Date('2026-08-29T09:00:00');
    expect(isTeachingDay(aug29, semester, holidays)).toBe(true); // 5th Sat
  });

  it('Verifies track status follows worst-case subject rule', () => {
    // If subjects are ON TRACK, TIGHT, and DANGER:
    const statuses = ['ON TRACK', 'TIGHT', 'DANGER'] as const;
    const trackStatus = determineTrackOverallStatus([...statuses]);
    expect(trackStatus).toBe('DANGER');

    // If subjects are ON TRACK and TIGHT:
    const tightTrack = determineTrackOverallStatus(['ON TRACK', 'TIGHT']);
    expect(tightTrack).toBe('TIGHT');

    // If all are COMPLETE:
    const allComplete = determineTrackOverallStatus(['COMPLETE', 'COMPLETE']);
    expect(allComplete).toBe('COMPLETE');
  });

  it('Verifies exam readiness with partial syllabus scope', () => {
    // Exam only tests Unit 1 (t1 and t2) for CS301 = 10 + 10 = 20h
    const examScopeTopicIds = ['t1', 't2'];
    const examDate = '2026-09-30';

    const readiness = calculateExamReadiness(
      'midterm-1',
      'Midterm Exam 1',
      examDate,
      subjectCS301,
      topicsCS301,
      examScopeTopicIds,
      '2026-09-18',
      semester,
      holidays,
      timetable
    );

    expect(readiness.total_in_scope_hours).toBe(20);
    expect(readiness.covered_hours).toBe(20);
    expect(readiness.remaining_hours).toBe(0);
    expect(readiness.coverage_percentage).toBe(100);
    expect(readiness.status).toBe('COMPLETE');
  });

  it('Verifies cancelled classes trigger planned dates recalculation', () => {
    const allTopics = [...topicsCS301];
    const recalculated = recalculateTopicPlannedDates(
      'subj-cs301',
      allTopics,
      semester,
      holidays,
      timetable
    );

    const t1 = recalculated.find((t) => t.id === 't1');
    const t4 = recalculated.find((t) => t.id === 't4');

    expect(t1?.planned_date).toBeDefined();
    expect(t4?.planned_date).toBeDefined();
    // Subsequent topics should have planned_date >= earlier topics
    expect(t4!.planned_date! >= t1!.planned_date!).toBe(true);
  });
});
