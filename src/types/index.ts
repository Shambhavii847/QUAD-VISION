export type BranchId = 'Ghaziabad' | 'Bangalore' | 'Jaipur';
export type CampusId = BranchId | 'HI-Tech' | 'Ratnam' | 'RGIB' | 'JUJ'; // Backwards compatible alias

export type AcademicTrackId = 'Mirai Track' | 'University Track';

export interface Branch {
  id: BranchId;
  name: string;
  city: string;
  state: string;
  university_affiliation: string; // e.g. "Dr. A.P.J. Abdul Kalam Technical University (AKTU)"
  university_short_name: string;  // e.g. "AKTU", "VTU", "Jagannath University"
  address: string;
  total_students: number;
}

export type UserRole = 'admin' | 'campus_manager' | 'faculty' | 'student';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branch_id?: BranchId;
  campus_id?: CampusId; // Backwards compatible alias
  assigned_batch_ids?: string[];
  assigned_subject_ids?: string[];
  assigned_track?: AcademicTrackId;
  avatar_url?: string;
  created_at?: string;
}

export interface Batch {
  id: string;
  name: string; // e.g., "Ghaziabad AKTU Batch 2024-28"
  branch_id?: BranchId;
  campus_id?: CampusId; // alias
  academic_track?: AcademicTrackId;
  university_name?: string;
  current_semester: number; // e.g., 3
  start_year: number;
  end_year: number;
}

export interface Semester {
  id: string;
  branch_id?: BranchId;
  campus_id?: CampusId;
  academic_track?: AcademicTrackId;
  batch_id: string;
  semester_number: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  working_weekdays: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
  saturday_rule: 'all' | 'none' | 'second_fourth';
  university_calendar_notes?: string;
}

export interface Holiday {
  id: string;
  branch_id?: BranchId; // Branch-isolated holiday
  campus_id?: CampusId;
  semester_id: string;
  date: string; // YYYY-MM-DD
  name: string;
  is_non_teaching: boolean;
}

export interface Subject {
  id: string;
  branch_id?: BranchId;
  campus_id?: CampusId;
  academic_track?: AcademicTrackId;
  batch_id: string;
  semester_number: number;
  code: string; // e.g., "CS301" or "KCS301"
  name: string; // e.g., "Data Structures & Algorithms"
  university_name?: string; // "AKTU", "VTU", "Jagannath University", or "Mirai Industry Curriculum"
  total_credits: number;
  faculty_id: string;
  faculty_name?: string;
  color_code?: string;
}

export interface Unit {
  id: string;
  subject_id: string;
  unit_number: number;
  title: string;
  description?: string;
}

export type TopicStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface Topic {
  id: string;
  unit_id: string;
  subject_id: string;
  title: string;
  planned_hours: number;
  sequence_order: number;
  planned_date?: string; // YYYY-MM-DD
  status: TopicStatus;
  completion_percentage: number; // 0 to 100
  actual_completion_date?: string;
  in_exam_scope?: boolean; // Default syllabus scope flag
}

export interface TimetableEntry {
  id: string;
  branch_id?: BranchId;
  campus_id?: CampusId;
  academic_track?: AcademicTrackId;
  batch_id: string;
  subject_id: string;
  day_of_week: number; // 1 = Monday ... 6 = Saturday
  start_time: string; // "09:00"
  end_time: string;   // "10:30"
  duration_hours: number; // e.g. 1.5
  room: string;
  faculty_id: string;
}

export type SessionStatus = 'completed' | 'partially_completed' | 'cancelled' | 'rescheduled' | 'skipped';

export interface TopicProgressInput {
  topic_id: string;
  completion_percentage: number; // 0-100
}

export interface SessionLog {
  id: string;
  scheduled_class_id?: string;
  branch_id?: BranchId;
  campus_id?: CampusId; // alias
  academic_track?: AcademicTrackId;
  batch_id: string;
  subject_id: string;
  faculty_id: string;
  date: string; // YYYY-MM-DD
  start_time?: string;
  end_time?: string;
  duration_hours: number;
  status: SessionStatus;
  topics_covered: TopicProgressInput[];
  topics_remaining: string[];
  carry_forward?: string;
  classwork_status: string; // e.g., "Lab Completed", "Lecture Covered"
  homework_status: string;  // e.g., "Assignment #2 assigned"
  faculty_notes?: string;
  created_at: string;
}

export interface Examination {
  id: string;
  branch_id?: BranchId;
  campus_id?: CampusId;
  academic_track?: AcademicTrackId;
  subject_id: string;
  batch_id: string;
  name: string; // e.g. "AKTU End Semester Exam", "VTU Midterm Exam"
  exam_date: string; // YYYY-MM-DD
  university_affiliation?: string; // e.g. "AKTU", "VTU", "Jagannath University"
  syllabus_scope_topic_ids: string[]; // explicit topic IDs in scope
}

export interface MissedSessionRecord {
  id: string;
  timetable_entry_id: string;
  branch_id?: BranchId;
  campus_id?: CampusId; // alias
  academic_track?: AcademicTrackId;
  batch_id: string;
  subject_id: string;
  faculty_id: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string;
  duration_hours: number;
  status: 'unlogged' | 'reminded' | 'escalated' | 'resolved';
  hours_overdue: number;
  last_notified_at?: string;
  escalated_at?: string;
}

export type ProgressionStatus = 'COMPLETE' | 'ON TRACK' | 'TIGHT' | 'DANGER';

export interface SubjectProgressCalculation {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  faculty_name: string;
  branch_id?: BranchId;
  academic_track?: AcademicTrackId;
  total_in_scope_hours: number;
  covered_hours: number;
  coverage_percentage: number;
  remaining_hours: number;
  available_teaching_hours: number;
  buffer_ratio: number;
  pace_vs_plan_hours: number;
  overdue_topics_count: number;
  status: ProgressionStatus;
  planned_completion_date?: string;
  projected_completion_date?: string;
  is_all_completed: boolean;
}

export interface ExamReadinessCalculation {
  examination_id: string;
  examination_name: string;
  subject_id: string;
  subject_name: string;
  exam_date: string;
  branch_id?: BranchId;
  academic_track?: AcademicTrackId;
  university_affiliation?: string;
  total_in_scope_hours: number;
  covered_hours: number;
  remaining_hours: number;
  available_teaching_hours: number;
  coverage_percentage: number;
  buffer_ratio: number;
  status: ProgressionStatus;
  urgent_attention_topics: {
    topic_id: string;
    title: string;
    planned_hours: number;
    completion_percentage: number;
    is_overdue: boolean;
  }[];
}

export interface AuditTrailEntry {
  id: string;
  branch_id?: BranchId;
  entity_type: 'topic' | 'unit' | 'subject' | 'session_log' | 'timetable' | 'calendar' | 'branch';
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'recalculate';
  performed_by_id: string;
  performed_by_name: string;
  details: string;
  timestamp: string;
}
