import { describe, it, expect } from 'vitest';
import {
  calculateHoursInScope,
  calculateCoveredHours,
  calculateCoveragePercentage,
  calculateRemainingHours,
  calculateBufferRatio,
  determineProgressionStatus,
  calculatePaceVsPlan,
  isTopicOverdue,
  determineTrackOverallStatus,
  isSecondOrFourthSaturday,
  isTeachingDay,
  calculateAvailableTeachingHours,
  calculateExamReadiness,
  recalculateTopicPlannedDates,
} from '../utils/calculations';
import { Topic, Semester, Holiday, TimetableEntry, Subject } from '../types';

describe('MSOT Calculation Engine', () => {
  const sampleTopics: Topic[] = [
    {
      id: 't1',
      unit_id: 'u1',
      subject_id: 's1',
      title: 'Topic 1: Intro',
      planned_hours: 4,
      sequence_order: 1,
      planned_date: '2026-08-10',
      status: 'completed',
      completion_percentage: 100,
    },
    {
      id: 't2',
      unit_id: 'u1',
      subject_id: 's1',
      title: 'Topic 2: Arrays',
      planned_hours: 6,
      sequence_order: 2,
      planned_date: '2026-08-15',
      status: 'in_progress',
      completion_percentage: 50,
    },
    {
      id: 't3',
      unit_id: 'u2',
      subject_id: 's1',
      title: 'Topic 3: Stacks',
      planned_hours: 5,
      sequence_order: 3,
      planned_date: '2026-08-25',
      status: 'not_started',
      completion_percentage: 0,
    },
    {
      id: 't4',
      unit_id: 'u2',
      subject_id: 's1',
      title: 'Topic 4: Optional Queue Variation',
      planned_hours: 3,
      sequence_order: 4,
      planned_date: '2026-09-01',
      status: 'skipped',
      completion_percentage: 0,
    },
  ];

  it('calculates hours in scope excluding skipped topics', () => {
    // t1 (4) + t2 (6) + t3 (5) = 15. t4 (3) is skipped, so excluded.
    const inScope = calculateHoursInScope(sampleTopics);
    expect(inScope).toBe(15);
  });

  it('handles empty syllabus data gracefully', () => {
    expect(calculateHoursInScope([])).toBe(0);
    expect(calculateCoveredHours([])).toBe(0);
    expect(calculateCoveragePercentage(0, 0)).toBe(0);
    expect(calculateRemainingHours(0, 0)).toBe(0);
    expect(calculateBufferRatio(10, 0)).toBe(Infinity);
    expect(determineProgressionStatus(0, Infinity)).toBe('COMPLETE');
  });

  it('calculates covered hours correctly for completed, in-progress, and skipped topics', () => {
    // t1: 4 * 100% = 4
    // t2: 6 * 50% = 3
    // t3: 5 * 0% = 0
    // t4: skipped = 0
    // Total covered = 4 + 3 = 7
    const covered = calculateCoveredHours(sampleTopics);
    expect(covered).toBe(7);
  });

  it('calculates coverage percentage and remaining hours correctly', () => {
    const inScope = calculateHoursInScope(sampleTopics); // 15
    const covered = calculateCoveredHours(sampleTopics); // 7
    const remaining = calculateRemainingHours(inScope, covered); // 15 - 7 = 8
    const coveragePct = calculateCoveragePercentage(covered, inScope); // 7 / 15 * 100 = 46.7%

    expect(remaining).toBe(8);
    expect(coveragePct).toBe(46.7);
  });

  it('calculates zero remaining hours and handles completion condition', () => {
    const fullyCompletedTopics: Topic[] = [
      {
        id: 'c1',
        unit_id: 'u1',
        subject_id: 's1',
        title: 'Complete Topic',
        planned_hours: 10,
        sequence_order: 1,
        status: 'completed',
        completion_percentage: 100,
      },
    ];
    const inScope = calculateHoursInScope(fullyCompletedTopics);
    const covered = calculateCoveredHours(fullyCompletedTopics);
    const remaining = calculateRemainingHours(inScope, covered);
    const buffer = calculateBufferRatio(20, remaining);
    const status = determineProgressionStatus(remaining, buffer);

    expect(remaining).toBe(0);
    expect(status).toBe('COMPLETE');
  });

  it('evaluates all 4 progression status conditions accurately', () => {
    // 1. COMPLETE: remaining <= 0
    expect(determineProgressionStatus(0, 0.5)).toBe('COMPLETE');

    // 2. ON TRACK: buffer ratio >= 1.15
    expect(determineProgressionStatus(10, 1.15)).toBe('ON TRACK');
    expect(determineProgressionStatus(10, 1.40)).toBe('ON TRACK');

    // 3. TIGHT: 1.00 <= buffer ratio < 1.15
    expect(determineProgressionStatus(10, 1.00)).toBe('TIGHT');
    expect(determineProgressionStatus(10, 1.14)).toBe('TIGHT');

    // 4. DANGER: buffer ratio < 1.00
    expect(determineProgressionStatus(10, 0.99)).toBe('DANGER');
    expect(determineProgressionStatus(10, 0.50)).toBe('DANGER');
  });

  it('calculates pace versus plan and identifies overdue topics', () => {
    // Current date is 2026-08-20
    // Topics due by 2026-08-20: t1 (due Aug 10, 4h), t2 (due Aug 15, 6h). Total due = 10h.
    // Covered = 7h. Pace = 7 - 10 = -3 hours (3 hours behind).
    const pace = calculatePaceVsPlan(sampleTopics, 7, '2026-08-20');
    expect(pace).toBe(-3);

    // Overdue check:
    // t1 is completed -> NOT overdue even though planned_date passed
    expect(isTopicOverdue(sampleTopics[0], '2026-08-20')).toBe(false);
    // t2 is in_progress (50%) and planned_date is 2026-08-15 < 2026-08-20 -> OVERDUE
    expect(isTopicOverdue(sampleTopics[1], '2026-08-20')).toBe(true);
    // t3 is planned for 2026-08-25 > 2026-08-20 -> NOT overdue
    expect(isTopicOverdue(sampleTopics[2], '2026-08-20')).toBe(false);
  });

  it('determines academic track status reflecting the WORST-performing subject, not average', () => {
    // If one subject is DANGER and others are COMPLETE, track is DANGER
    expect(determineTrackOverallStatus(['COMPLETE', 'ON TRACK', 'DANGER'])).toBe('DANGER');
    // If one subject is TIGHT and others are ON TRACK, track is TIGHT
    expect(determineTrackOverallStatus(['COMPLETE', 'ON TRACK', 'TIGHT'])).toBe('TIGHT');
    // If all are ON TRACK or COMPLETE, track is ON TRACK
    expect(determineTrackOverallStatus(['COMPLETE', 'ON TRACK'])).toBe('ON TRACK');
    // If all are COMPLETE, track is COMPLETE
    expect(determineTrackOverallStatus(['COMPLETE', 'COMPLETE'])).toBe('COMPLETE');
  });

  describe('Academic Calendar, Saturday Rules, and Timetable Calculations', () => {
    const semester: Semester = {
      id: 'sem1',
      batch_id: 'b1',
      semester_number: 3,
      start_date: '2026-08-01',
      end_date: '2026-08-31',
      working_weekdays: [1, 2, 3, 4, 5, 6], // Mon-Sat
      saturday_rule: 'second_fourth',
    };

    // In August 2026:
    // 2026-08-01 is Saturday (1st Saturday - working)
    // 2026-08-08 is Saturday (2nd Saturday - holiday)
    // 2026-08-15 is Saturday (3rd Saturday - Indian Independence Day holiday)
    // 2026-08-22 is Saturday (4th Saturday - holiday)
    // 2026-08-29 is Saturday (5th Saturday - working)
    it('identifies 2nd and 4th Saturdays correctly', () => {
      expect(isSecondOrFourthSaturday(new Date('2026-08-01T12:00:00'))).toBe(false); // 1st Sat
      expect(isSecondOrFourthSaturday(new Date('2026-08-08T12:00:00'))).toBe(true);  // 2nd Sat
      expect(isSecondOrFourthSaturday(new Date('2026-08-15T12:00:00'))).toBe(false); // 3rd Sat
      expect(isSecondOrFourthSaturday(new Date('2026-08-22T12:00:00'))).toBe(true);  // 4th Sat
      expect(isSecondOrFourthSaturday(new Date('2026-08-29T12:00:00'))).toBe(false); // 5th Sat
    });

    it('respects declared holidays and non-teaching days', () => {
      const holidays: Holiday[] = [
        {
          id: 'h1',
          semester_id: 'sem1',
          date: '2026-08-15',
          name: 'Independence Day',
          is_non_teaching: true,
        },
      ];

      // Independence day is Saturday Aug 15: even though 3rd Saturday is working, holiday blocks it
      expect(isTeachingDay(new Date('2026-08-15T12:00:00'), semester, holidays)).toBe(false);
      // Sunday is not in working weekdays
      expect(isTeachingDay(new Date('2026-08-02T12:00:00'), semester, holidays)).toBe(false);
      // Monday Aug 3 is teaching day
      expect(isTeachingDay(new Date('2026-08-03T12:00:00'), semester, holidays)).toBe(true);
      // 2nd Saturday Aug 8 is off under second_fourth rule
      expect(isTeachingDay(new Date('2026-08-08T12:00:00'), semester, holidays)).toBe(false);
    });

    it('calculates available teaching hours strictly from calendar and timetable slots', () => {
      const timetable: TimetableEntry[] = [
        {
          id: 'tt1',
          batch_id: 'b1',
          subject_id: 's1',
          day_of_week: 1, // Monday
          start_time: '10:00',
          end_time: '11:30',
          duration_hours: 1.5,
          room: 'LH-101',
          faculty_id: 'f1',
        },
        {
          id: 'tt2',
          batch_id: 'b1',
          subject_id: 's1',
          day_of_week: 3, // Wednesday
          start_time: '14:00',
          end_time: '16:00',
          duration_hours: 2.0,
          room: 'LH-101',
          faculty_id: 'f1',
        },
      ];

      // From 2026-08-03 (Mon) to 2026-08-09 (Sun):
      // Monday Aug 3: 1.5h
      // Wednesday Aug 5: 2.0h
      // Total = 3.5h
      const available = calculateAvailableTeachingHours(
        's1',
        '2026-08-03',
        '2026-08-09',
        semester,
        [],
        timetable
      );
      expect(available).toBe(3.5);
    });
  });

  describe('Examination Specific Scope Calculation', () => {
    it('calculates exam readiness strictly against examination-specific topics, not whole course', () => {
      const subject: Subject = {
        id: 's1',
        batch_id: 'b1',
        semester_number: 3,
        code: 'CS301',
        name: 'Data Structures',
        total_credits: 4,
        faculty_id: 'f1',
      };

      const semester: Semester = {
        id: 'sem1',
        batch_id: 'b1',
        semester_number: 3,
        start_date: '2026-08-01',
        end_date: '2026-11-30',
        working_weekdays: [1, 2, 3, 4, 5],
        saturday_rule: 'none',
      };

      const timetable: TimetableEntry[] = [
        {
          id: 'tt1',
          batch_id: 'b1',
          subject_id: 's1',
          day_of_week: 1, // Monday
          start_time: '09:00',
          end_time: '11:00',
          duration_hours: 2,
          room: 'LH-101',
          faculty_id: 'f1',
        },
      ];

      // Midterm syllabus scope includes ONLY Topic 1 (4h) and Topic 2 (6h) = 10h in scope
      // Total course has 15h in scope (with Topic 3).
      // t1 is completed (4h), t2 is 50% (3h). Covered for midterm = 7h. Remaining = 3h.
      const examReadiness = calculateExamReadiness(
        'exam1',
        'Midterm 1',
        '2026-08-28',
        subject,
        sampleTopics,
        ['t1', 't2'], // In-scope topics
        '2026-08-16',
        semester,
        [],
        timetable
      );

      expect(examReadiness.total_in_scope_hours).toBe(10);
      expect(examReadiness.covered_hours).toBe(7);
      expect(examReadiness.remaining_hours).toBe(3);
      expect(examReadiness.coverage_percentage).toBe(70);
      // Available Mondays between Aug 16 and Aug 28:
      // Aug 17 (Mon) = 2h, Aug 24 (Mon) = 2h -> 4 hours available
      expect(examReadiness.available_teaching_hours).toBe(4);
      // Buffer ratio: 4 / 3 = 1.33 -> ON TRACK (>= 1.15)
      expect(examReadiness.buffer_ratio).toBe(1.33);
      expect(examReadiness.status).toBe('ON TRACK');
    });
  });

  describe('Topic Planned Dates Recalculation', () => {
    it('recalculates topic planned dates respecting timetable capacity and skipping non-teaching days', () => {
      const semester: Semester = {
        id: 'sem1',
        batch_id: 'b1',
        semester_number: 3,
        start_date: '2026-08-03', // Monday
        end_date: '2026-08-14',
        working_weekdays: [1, 3], // Mon, Wed
        saturday_rule: 'none',
      };

      const timetable: TimetableEntry[] = [
        {
          id: 'tt1',
          batch_id: 'b1',
          subject_id: 's1',
          day_of_week: 1, // Monday
          start_time: '10:00',
          end_time: '12:00',
          duration_hours: 2,
          room: '101',
          faculty_id: 'f1',
        },
        {
          id: 'tt2',
          batch_id: 'b1',
          subject_id: 's1',
          day_of_week: 3, // Wednesday
          start_time: '10:00',
          end_time: '12:00',
          duration_hours: 2,
          room: '101',
          faculty_id: 'f1',
        },
      ];

      const topicsToSchedule: Topic[] = [
        {
          id: 'top1',
          unit_id: 'u1',
          subject_id: 's1',
          title: 'Topic A (2 hrs)',
          planned_hours: 2,
          sequence_order: 1,
          status: 'not_started',
          completion_percentage: 0,
        },
        {
          id: 'top2',
          unit_id: 'u1',
          subject_id: 's1',
          title: 'Topic B (2 hrs)',
          planned_hours: 2,
          sequence_order: 2,
          status: 'not_started',
          completion_percentage: 0,
        },
      ];

      const scheduled = recalculateTopicPlannedDates(
        's1',
        topicsToSchedule,
        semester,
        [],
        timetable
      );

      // Topic A should be planned on Monday 2026-08-03 (takes all 2h)
      // Topic B should be planned on Wednesday 2026-08-05
      const topA = scheduled.find((t) => t.id === 'top1');
      const topB = scheduled.find((t) => t.id === 'top2');

      expect(topA?.planned_date).toBe('2026-08-03');
      expect(topB?.planned_date).toBe('2026-08-05');
    });
  });
});
