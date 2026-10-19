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
  entity_type: 'topic' | 'unit' | 'subject' | 'session_log' | 'timetable' | 'calendar' | 'branch' | 'extra_class' | 'daily_recap' | 'opportunity';
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'recalculate';
  performed_by_id: string;
  performed_by_name: string;
  details: string;
  timestamp: string;
}

export type ExtraClassRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'withdrawn';

export interface ExtraClassRequestHistoryEntry {
  id: string;
  action: string;
  performed_by_id: string;
  performed_by_name: string;
  timestamp: string;
  notes?: string;
  status?: ExtraClassRequestStatus;
}

export interface ExtraClassRequest {
  id: string;
  faculty_id: string;
  faculty_name: string;
  faculty_email?: string;
  branch_id: BranchId;
  academic_track: AcademicTrackId;
  batch_id: string;
  batch_name?: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM (e.g. "14:00")
  end_time: string; // HH:MM (e.g. "15:30")
  duration_hours: number;
  room?: string;
  topic_ids?: string[];
  topic_titles?: string[];
  reason: string;
  notes?: string;
  status: ExtraClassRequestStatus;
  rejection_reason?: string;
  change_request_notes?: string;
  override_reason?: string;
  reviewed_by_id?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  history: ExtraClassRequestHistoryEntry[];
}

export interface ApprovedExtraClass {
  id: string;
  request_id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  batch_id: string;
  batch_name: string;
  branch_id: BranchId;
  academic_track: AcademicTrackId;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  duration_hours: number;
  room: string;
  faculty_id: string;
  faculty_name: string;
  topic_ids?: string[];
  topic_titles?: string[];
  reason: string;
  approved_by_id: string;
  approved_by_name: string;
  approved_at: string;
  override_reason?: string;
}

// ==========================================
// 8. STUDENT OPPORTUNITIES & LEARNING TESTS
// ==========================================
export type OpportunityCategory =
  | 'hackathons'
  | 'internships'
  | 'talks'
  | 'summits'
  | 'conferences'
  | 'open_source'
  | 'research'
  | 'workshops'
  | 'scholarships'
  | 'other'
  | 'hackathons_innovation'
  | 'internships_placements'
  | 'ted_talks'
  | 'ai_summits'
  | 'major_events'
  | 'research_academic'
  | 'workshops_certifications'
  | 'scholarships_fellowships'
  | 'other_opportunities';

export type OpportunityDeliveryFormat = 'online' | 'in_person' | 'hybrid';
export type OpportunityPriceStatus = 'free' | 'paid' | 'stipend' | 'unknown';
export type OpportunityPublicationStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'unpublished'
  | 'archived'
  | 'open'
  | 'closed'
  | 'upcoming';

export interface StudentOpportunity {
  id: string;
  title: string;
  slug?: string;
  category: OpportunityCategory;
  type?: string; // alias for backwards compatibility
  organizer: string;
  organization?: string; // alias for backwards compatibility
  short_summary: string;
  full_description: string;
  description?: string; // alias for backwards compatibility
  official_url: string;
  apply_url?: string;
  source_url?: string;
  last_verified_at?: string;
  application_deadline?: string; // YYYY-MM-DD
  deadline?: string; // alias for backwards compatibility
  event_start_date?: string; // YYYY-MM-DD
  event_end_date?: string; // YYYY-MM-DD
  publication_start_date?: string; // YYYY-MM-DD
  publication_end_date?: string; // YYYY-MM-DD
  delivery_format: OpportunityDeliveryFormat;
  price_status: OpportunityPriceStatus;
  stipend_or_reward?: string;
  eligibility?: string; // textual summary
  eligibility_summary?: string;
  eligibility_requirements: string[];
  requirements?: string[]; // alias for backwards compatibility
  target_audience_scope: 'all_students' | 'targeted';
  eligible_branches: BranchId[];
  eligible_tracks?: AcademicTrackId[];
  eligible_batch_ids?: string[];
  eligible_semesters?: number[];
  target_campuses?: string[]; // alias for eligible_branches
  target_tracks?: string[]; // alias for eligible_tracks
  target_batches?: string[]; // alias for eligible_batch_ids
  location?: string;
  cover_image_url?: string;
  featured: boolean;
  status: OpportunityPublicationStatus;
  created_by_id?: string;
  created_by_name?: string;
  updated_by_id?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface OpportunityCategoryMeta {
  id: OpportunityCategory;
  name: string;
  label: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  badgeColor: string;
}

export const OPPORTUNITY_CATEGORIES: OpportunityCategoryMeta[] = [
  {
    id: 'hackathons',
    name: 'Hackathons & Innovation',
    label: 'Hackathons & Innovation',
    description: 'Coding competitions, design challenges, and buildathons',
    badgeBg: 'bg-[#FEF9E7]',
    badgeText: 'text-[#854D0E]',
    badgeBorder: 'border-[#FBE69B]',
    badgeColor: 'bg-[#FEF9E7] text-[#854D0E] border-[#FBE69B]',
  },
  {
    id: 'internships',
    name: 'Internships & Placements',
    label: 'Internships & Placements',
    description: 'Industry internships, research roles, and campus placements',
    badgeBg: 'bg-[#EEF7EF]',
    badgeText: 'text-[#1E4627]',
    badgeBorder: 'border-[#C8E8CD]',
    badgeColor: 'bg-[#EEF7EF] text-[#1E4627] border-[#C8E8CD]',
  },
  {
    id: 'talks',
    name: 'TED Talks & Knowledge Sessions',
    label: 'TED Talks & Knowledge Sessions',
    description: 'Expert lectures, TEDx events, and thought leadership webinars',
    badgeBg: 'bg-[#FDF2F4]',
    badgeText: 'text-[#701C2F]',
    badgeBorder: 'border-[#F8CAD4]',
    badgeColor: 'bg-[#FDF2F4] text-[#701C2F] border-[#F8CAD4]',
  },
  {
    id: 'summits',
    name: 'AI & Technology Summits',
    label: 'AI & Technology Summits',
    description: 'Emerging AI summits, dev conventions, and technical expos',
    badgeBg: 'bg-[#F0F6FD]',
    badgeText: 'text-[#193B6D]',
    badgeBorder: 'border-[#CCE0F9]',
    badgeColor: 'bg-[#F0F6FD] text-[#193B6D] border-[#CCE0F9]',
  },
  {
    id: 'conferences',
    name: 'Major Events & Conferences',
    label: 'Major Events & Conferences',
    description: 'Flagship academic & industry conferences (e.g. IMC 2026)',
    badgeBg: 'bg-[#FAF5FF]',
    badgeText: 'text-[#581C87]',
    badgeBorder: 'border-[#E9D5FF]',
    badgeColor: 'bg-[#FAF5FF] text-[#581C87] border-[#E9D5FF]',
  },
  {
    id: 'open_source',
    name: 'Open Source',
    label: 'Open Source',
    description: 'Open source mentorship, GSoC, and contributor cohorts',
    badgeBg: 'bg-[#ECFDF5]',
    badgeText: 'text-[#065F46]',
    badgeBorder: 'border-[#A7F3D0]',
    badgeColor: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
  },
  {
    id: 'research',
    name: 'Research & Academic Opportunities',
    label: 'Research & Academic Opportunities',
    description: 'Paper presentations, laboratory fellowships, and symposia',
    badgeBg: 'bg-[#EFF6FF]',
    badgeText: 'text-[#1E40AF]',
    badgeBorder: 'border-[#BFDBFE]',
    badgeColor: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
  },
  {
    id: 'workshops',
    name: 'Workshops & Certifications',
    label: 'Workshops & Certifications',
    description: 'Practical bootcamps, hands-on labs, and verified credentials',
    badgeBg: 'bg-[#FFF7ED]',
    badgeText: 'text-[#9A3412]',
    badgeBorder: 'border-[#FED7AA]',
    badgeColor: 'bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA]',
  },
  {
    id: 'scholarships',
    name: 'Scholarships & Fellowships',
    label: 'Scholarships & Fellowships',
    description: 'Merit-based financial aid, travel grants, and awards',
    badgeBg: 'bg-[#FEFCE8]',
    badgeText: 'text-[#854D0E]',
    badgeBorder: 'border-[#FEF08A]',
    badgeColor: 'bg-[#FEFCE8] text-[#854D0E] border-[#FEF08A]',
  },
  {
    id: 'other',
    name: 'Other Opportunities',
    label: 'Other Opportunities',
    description: 'Curated institutional and partner initiatives',
    badgeBg: 'bg-[#FAF7F0]',
    badgeText: 'text-[#71695F]',
    badgeBorder: 'border-[#EFE8DC]',
    badgeColor: 'bg-[#FAF7F0] text-[#71695F] border-[#EFE8DC]',
  },
];

export interface DailyLearningTestWeakTopic {
  topic_id: string;
  topic_title: string;
  concept: string;
  recommended_reading: string;
}

export interface DailyLearningTest {
  id: string;
  student_id: string;
  student_name: string;
  batch_id: string;
  branch_id: BranchId;
  subject_id: string;
  subject_name: string;
  date: string; // YYYY-MM-DD
  topic_ids: string[];
  topic_titles: string[];
  total_questions: number;
  score: number;
  percentage: number;
  status: 'passed' | 'needs_revision' | 'excellent';
  weak_topics: DailyLearningTestWeakTopic[];
}

// ==========================================
// 9. AI ASSISTANT CHAT MODELS
// ==========================================
export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string; // ISO string
  isStreaming?: boolean;
  metadata?: {
    intent?: string;
    generatedBy?: 'ai_provider' | 'academic_engine';
    isRecommendation?: boolean;
    citations?: string[];
    suggestedActions?: string[];
  };
}

export interface AIAssistantContext {
  userRole: UserRole;
  userName: string;
  branchId?: BranchId;
  campusId?: CampusId;
  assignedTrack?: AcademicTrackId;
  activeSemester?: number;
  batchNames?: string[];
  subjectNames?: string[];
  dataSummary: string;
}

// ==========================================
// 10. DAILY 5-MINUTE RECAP QUIZ MODELS
// ==========================================
export type RecapQuestionDifficulty = 'easy' | 'medium' | 'hard';
export type RecapQuestionType = 'recall' | 'understanding' | 'application';

export interface DailyRecapQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[]; // exactly 4 options
  correct_option_index: number; // 0..3 (kept server-side / stripped before student submission)
  explanation: string; // why this option is correct
  subject_id: string;
  topic_id?: string;
  topic_title?: string;
  difficulty: RecapQuestionDifficulty;
  question_type: RecapQuestionType;
}

export interface StudentRecapQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  subject_id: string;
  topic_id?: string;
  topic_title?: string;
  difficulty: RecapQuestionDifficulty;
  question_type: RecapQuestionType;
}

export interface DailyRecapQuiz {
  id: string;
  title: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  branch_id: BranchId;
  batch_id: string;
  academic_track?: AcademicTrackId;
  date: string; // YYYY-MM-DD
  estimated_minutes: number; // default: 5
  status: 'draft' | 'published';
  created_by_faculty_id: string;
  faculty_name: string;
  questions: DailyRecapQuestion[];
  created_at: string;
}

export interface StudentRecapQuizView {
  id: string;
  title: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  branch_id: BranchId;
  batch_id: string;
  academic_track?: AcademicTrackId;
  date: string;
  estimated_minutes: number;
  total_questions: number;
  questions: StudentRecapQuestion[];
}

export interface QuestionResultItem {
  question_id: string;
  question_text: string;
  options: string[];
  selected_option_index: number;
  correct_option_index: number;
  is_correct: boolean;
  explanation: string;
  topic_id?: string;
  topic_title?: string;
}

export interface StudentQuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  student_name: string;
  batch_id: string;
  branch_id: BranchId;
  subject_id: string;
  date: string; // YYYY-MM-DD
  status: 'not_started' | 'in_progress' | 'completed';
  started_at: string;
  completed_at?: string;
  answers: Record<string, number>; // question_id -> option index (0..3)
  score?: number; // 0..5
  total_questions?: number; // 5
  percentage?: number; // 0..100
  question_results?: QuestionResultItem[];
  weak_topics?: DailyLearningTestWeakTopic[];
}

