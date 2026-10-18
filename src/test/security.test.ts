import { describe, it, expect } from 'vitest';
import { UserProfile, SessionLog, Topic, MissedSessionRecord } from '../types';

/**
 * Security Rule 1:
 * Students must NOT be permitted to write, edit, or delete lesson plans,
 * timetables, faculty records, or session logs.
 */
export function canUserModifyLessonPlan(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'campus_manager' || user.role === 'faculty';
}

export function canUserModifyTimetable(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'campus_manager';
}

/**
 * Security Rule 2:
 * Faculty members can ONLY edit or log sessions for their own assigned subjects/classes.
 * Unauthorized faculty members CANNOT edit another faculty member's session logs.
 */
export function canFacultyEditSession(
  user: UserProfile | null,
  session: SessionLog
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'campus_manager' && user.campus_id === session.campus_id) return true;
  if (user.role === 'faculty' && user.id === session.faculty_id) return true;
  return false;
}

/**
 * Workflow Rule:
 * Missed session detection and escalation:
 * If a scheduled class is unlogged and more than 48 hours have elapsed,
 * it must be flagged as 'escalated' to the Campus Manager.
 */
export function evaluateMissedSessionStatus(
  scheduledDateStr: string,
  currentDateStr: string,
  isLogged: boolean
): 'logged' | 'unlogged' | 'escalated' {
  if (isLogged) return 'logged';

  const scheduledTime = new Date(scheduledDateStr).getTime();
  const currentTime = new Date(currentDateStr).getTime();
  const diffHours = (currentTime - scheduledTime) / (1000 * 60 * 60);

  if (diffHours > 48) {
    return 'escalated';
  }
  return 'unlogged';
}

describe('Role-Based Security and Escalation Engine', () => {
  const adminUser: UserProfile = {
    id: 'u-admin',
    name: 'Admin User',
    email: 'admin@msot.edu',
    role: 'admin',
  };

  const facultyUserA: UserProfile = {
    id: 'f-101',
    name: 'Dr. Radhika Sharma',
    email: 'radhika@msot.edu',
    role: 'faculty',
    campus_id: 'HI-Tech',
    assigned_subject_ids: ['sub-cs101'],
  };

  const facultyUserB: UserProfile = {
    id: 'f-102',
    name: 'Prof. Arvind Menon',
    email: 'arvind@msot.edu',
    role: 'faculty',
    campus_id: 'HI-Tech',
    assigned_subject_ids: ['sub-cs102'],
  };

  const studentUser: UserProfile = {
    id: 's-201',
    name: 'Rohan Varma',
    email: 'rohan.student@msot.edu',
    role: 'student',
    campus_id: 'HI-Tech',
  };

  const facultyASession: SessionLog = {
    id: 'sess-01',
    campus_id: 'HI-Tech',
    batch_id: 'batch-1',
    subject_id: 'sub-cs101',
    faculty_id: 'f-101',
    date: '2026-08-10',
    duration_hours: 1.5,
    status: 'completed',
    topics_covered: [{ topic_id: 'top-1', completion_percentage: 100 }],
    topics_remaining: [],
    classwork_status: 'Covered trees',
    homework_status: 'Exercise 3',
    created_at: '2026-08-10T12:00:00Z',
  };

  it('strictly blocks students from editing lesson plans and timetables', () => {
    expect(canUserModifyLessonPlan(studentUser)).toBe(false);
    expect(canUserModifyTimetable(studentUser)).toBe(false);

    // Faculty can modify lesson plan but cannot modify timetable
    expect(canUserModifyLessonPlan(facultyUserA)).toBe(true);
    expect(canUserModifyTimetable(facultyUserA)).toBe(false);

    // Admin can modify both
    expect(canUserModifyLessonPlan(adminUser)).toBe(true);
    expect(canUserModifyTimetable(adminUser)).toBe(true);
  });

  it('prevents unauthorized faculty from editing another faculty member session log', () => {
    // Faculty A owns this session -> allowed
    expect(canFacultyEditSession(facultyUserA, facultyASession)).toBe(true);

    // Faculty B does NOT own this session -> blocked!
    expect(canFacultyEditSession(facultyUserB, facultyASession)).toBe(false);

    // Student cannot edit session -> blocked!
    expect(canFacultyEditSession(studentUser, facultyASession)).toBe(false);

    // Admin can edit session -> allowed
    expect(canFacultyEditSession(adminUser, facultyASession)).toBe(true);
  });

  it('flags missed sessions and escalates to Campus Manager after 48 hours', () => {
    // Session scheduled 24 hours ago: unlogged, not yet escalated
    const status24h = evaluateMissedSessionStatus(
      '2026-08-10T09:00:00',
      '2026-08-11T09:00:00',
      false
    );
    expect(status24h).toBe('unlogged');

    // Session scheduled 49 hours ago: unlogged and >48h -> ESCALATED!
    const status49h = evaluateMissedSessionStatus(
      '2026-08-10T09:00:00',
      '2026-08-12T10:00:00',
      false
    );
    expect(status49h).toBe('escalated');

    // If session was logged, status is 'logged'
    const statusLogged = evaluateMissedSessionStatus(
      '2026-08-10T09:00:00',
      '2026-08-13T09:00:00',
      true
    );
    expect(statusLogged).toBe('logged');
  });
});
