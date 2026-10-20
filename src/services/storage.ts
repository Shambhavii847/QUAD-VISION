import {
  UserProfile,
  Branch,
  BranchId,
  Batch,
  Semester,
  Holiday,
  Subject,
  Unit,
  Topic,
  TimetableEntry,
  SessionLog,
  Examination,
  MissedSessionRecord,
  AuditTrailEntry,
  CampusId,
  AcademicTrackId,
  ExtraClassRequest,
  ApprovedExtraClass,
  ExtraClassRequestStatus,
  StudentOpportunity,
  OpportunityPublicationStatus,
  DailyLearningTest,
  DailyRecapQuiz,
  DailyRecapQuestion,
  StudentRecapQuestion,
  StudentRecapQuizView,
  StudentQuizAttempt,
  QuestionResultItem,
  DailyLearningTestWeakTopic,
} from '../types';
import {
  INITIAL_BRANCHES,
  INITIAL_USERS,
  INITIAL_BATCHES,
  INITIAL_SEMESTERS,
  INITIAL_HOLIDAYS,
  INITIAL_SUBJECTS,
  INITIAL_UNITS,
  INITIAL_TOPICS,
  INITIAL_TIMETABLE,
  INITIAL_EXAMINATIONS,
  INITIAL_SESSION_LOGS,
  INITIAL_MISSED_SESSIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_EXTRA_CLASS_REQUESTS,
  INITIAL_APPROVED_EXTRA_CLASSES,
  INITIAL_OPPORTUNITIES,
  INITIAL_DAILY_LEARNING_TESTS,
  INITIAL_DAILY_RECAP_QUIZZES,
  INITIAL_STUDENT_QUIZ_ATTEMPTS,
} from '../data/mockData';
import { recalculateTopicPlannedDates, formatDateYMD } from '../utils/calculations';
import { detectExtraClassClashes, ClashConflict } from '../utils/clashDetection';
import { isSupabaseConfigured } from './supabaseClient';
import {
  supabaseFetchAllData,
  supabaseSaveSessionLog,
  supabaseUpdateTopic,
  supabaseCreateTopic,
  supabaseCreateUnit,
  supabaseAddHoliday,
  supabaseSaveTimetableEntry,
  supabaseSaveExamination,
  supabaseUpdateMissedSession,
  supabaseInsertAudit,
} from './supabaseService';
import {
  canStudentAccessBatch,
  canFacultyModifySubject,
  canFacultyEditSessionLog,
  canCampusManagerAccessCampus,
  canUserAccessAdmin,
} from './authService';

const STORAGE_KEYS = {
  BRANCHES: 'msot_branches',
  USERS: 'msot_users',
  BATCHES: 'msot_batches',
  SEMESTERS: 'msot_semesters',
  HOLIDAYS: 'msot_holidays',
  SUBJECTS: 'msot_subjects',
  UNITS: 'msot_units',
  TOPICS: 'msot_topics',
  TIMETABLE: 'msot_timetable',
  EXAMINATIONS: 'msot_examinations',
  SESSION_LOGS: 'msot_session_logs',
  MISSED_SESSIONS: 'msot_missed_sessions',
  AUDIT_LOGS: 'msot_audit_logs',
  EXTRA_CLASS_REQUESTS: 'msot_extra_class_requests',
  APPROVED_EXTRA_CLASSES: 'msot_approved_extra_classes',
  OPPORTUNITIES: 'msot_opportunities',
  DAILY_LEARNING_TESTS: 'msot_daily_learning_tests',
  DAILY_RECAP_QUIZZES: 'msot_daily_recap_quizzes',
  STUDENT_QUIZ_ATTEMPTS: 'msot_student_quiz_attempts',
  CURRENT_USER_ID: 'msot_current_user_id',
};

// Event listener mechanism for cross-component reactive updates
type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach((l) => l());
}

export function subscribeToDataChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// In-memory fallback if localStorage is undefined (e.g. Node.js unit tests)
const memoryStore: Record<string, string> = {};

function safeGetStorage(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStore[key] || null;
    }
  }
  return memoryStore[key] || null;
}

function safeSetStorage(key: string, val: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, val);
    } catch {
      memoryStore[key] = val;
    }
  } else {
    memoryStore[key] = val;
  }
}

function getItem<T>(key: string, fallback: T): T {
  try {
    const val = safeGetStorage(key);
    if (!val) return fallback;
    return JSON.parse(val) as T;
  } catch (err) {
    console.error(`Failed to load ${key} from storage:`, err);
    return fallback;
  }
}

function setItem<T>(key: string, val: T): void {
  try {
    safeSetStorage(key, JSON.stringify(val));
    notifyListeners();
  } catch (err) {
    console.error(`Failed to save ${key} to storage:`, err);
  }
}

// Initialize seed data if not present or outdated
export function initializeStorageIfNeeded(): void {
  const branches = getItem<Branch[] | null>(STORAGE_KEYS.BRANCHES, null);
  const users = getItem<UserProfile[] | null>(STORAGE_KEYS.USERS, null);
  // Auto-upgrade if empty or still containing old non-branch records
  if (
    !branches ||
    branches.length !== 3 ||
    !branches.some((b) => b.id === 'Ghaziabad') ||
    !users ||
    !users.some((u) => u.id === 'user-mgr-gzb')
  ) {
    resetToDemoData();
  }

  // If Supabase credentials are configured, synchronize with remote PostgreSQL
  if (isSupabaseConfigured) {
    syncWithSupabase();
  }
}

export async function syncWithSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const remoteData = await supabaseFetchAllData();
    if (!remoteData) return false;

    if (remoteData.batches.length > 0) setItem(STORAGE_KEYS.BATCHES, remoteData.batches);
    if (remoteData.subjects.length > 0) setItem(STORAGE_KEYS.SUBJECTS, remoteData.subjects);
    if (remoteData.units.length > 0) setItem(STORAGE_KEYS.UNITS, remoteData.units);
    if (remoteData.topics.length > 0) setItem(STORAGE_KEYS.TOPICS, remoteData.topics);
    if (remoteData.semesters.length > 0) setItem(STORAGE_KEYS.SEMESTERS, remoteData.semesters);
    if (remoteData.holidays.length > 0) setItem(STORAGE_KEYS.HOLIDAYS, remoteData.holidays);
    if (remoteData.timetable.length > 0) setItem(STORAGE_KEYS.TIMETABLE, remoteData.timetable);
    if (remoteData.examinations.length > 0) setItem(STORAGE_KEYS.EXAMINATIONS, remoteData.examinations);
    if (remoteData.sessionLogs.length > 0) setItem(STORAGE_KEYS.SESSION_LOGS, remoteData.sessionLogs);
    if (remoteData.missedSessions.length > 0) setItem(STORAGE_KEYS.MISSED_SESSIONS, remoteData.missedSessions);
    if (remoteData.users.length > 0) setItem(STORAGE_KEYS.USERS, remoteData.users);
    if (remoteData.auditLogs.length > 0) setItem(STORAGE_KEYS.AUDIT_LOGS, remoteData.auditLogs);

    notifyListeners();
    return true;
  } catch (err) {
    console.warn('[MSOT Storage] Supabase background sync failed, continuing with local store:', err);
    return false;
  }
}

export function resetToDemoData(): void {
  safeSetStorage(STORAGE_KEYS.BRANCHES, JSON.stringify(INITIAL_BRANCHES));
  safeSetStorage(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  safeSetStorage(STORAGE_KEYS.BATCHES, JSON.stringify(INITIAL_BATCHES));
  safeSetStorage(STORAGE_KEYS.SEMESTERS, JSON.stringify(INITIAL_SEMESTERS));
  safeSetStorage(STORAGE_KEYS.HOLIDAYS, JSON.stringify(INITIAL_HOLIDAYS));
  safeSetStorage(STORAGE_KEYS.SUBJECTS, JSON.stringify(INITIAL_SUBJECTS));
  safeSetStorage(STORAGE_KEYS.UNITS, JSON.stringify(INITIAL_UNITS));
  safeSetStorage(STORAGE_KEYS.TOPICS, JSON.stringify(INITIAL_TOPICS));
  safeSetStorage(STORAGE_KEYS.TIMETABLE, JSON.stringify(INITIAL_TIMETABLE));
  safeSetStorage(STORAGE_KEYS.EXAMINATIONS, JSON.stringify(INITIAL_EXAMINATIONS));
  safeSetStorage(STORAGE_KEYS.SESSION_LOGS, JSON.stringify(INITIAL_SESSION_LOGS));
  safeSetStorage(STORAGE_KEYS.MISSED_SESSIONS, JSON.stringify(INITIAL_MISSED_SESSIONS));
  safeSetStorage(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
  safeSetStorage(STORAGE_KEYS.EXTRA_CLASS_REQUESTS, JSON.stringify(INITIAL_EXTRA_CLASS_REQUESTS));
  safeSetStorage(STORAGE_KEYS.APPROVED_EXTRA_CLASSES, JSON.stringify(INITIAL_APPROVED_EXTRA_CLASSES));
  safeSetStorage(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(INITIAL_OPPORTUNITIES));
  safeSetStorage(STORAGE_KEYS.DAILY_LEARNING_TESTS, JSON.stringify(INITIAL_DAILY_LEARNING_TESTS));
  safeSetStorage(STORAGE_KEYS.DAILY_RECAP_QUIZZES, JSON.stringify(INITIAL_DAILY_RECAP_QUIZZES));
  safeSetStorage(STORAGE_KEYS.STUDENT_QUIZ_ATTEMPTS, JSON.stringify(INITIAL_STUDENT_QUIZ_ATTEMPTS));
  safeSetStorage(STORAGE_KEYS.CURRENT_USER_ID, JSON.stringify(''));
  notifyListeners();
}

// Data getters
export function getBranches(): Branch[] {
  return getItem(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
}

export function getBranchById(id: BranchId): Branch | undefined {
  return getBranches().find((b) => b.id === id);
}

export function getCampuses(): CampusId[] {
  return ['Ghaziabad', 'Bangalore', 'Jaipur'];
}

export function getUsers(): UserProfile[] {
  return getItem(STORAGE_KEYS.USERS, INITIAL_USERS);
}

export function getBatches(): Batch[] {
  return getItem(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
}

export function getSemesters(): Semester[] {
  return getItem(STORAGE_KEYS.SEMESTERS, INITIAL_SEMESTERS);
}

export function getHolidays(): Holiday[] {
  return getItem(STORAGE_KEYS.HOLIDAYS, INITIAL_HOLIDAYS);
}

export function getSubjects(): Subject[] {
  return getItem(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
}

export function getUnits(): Unit[] {
  return getItem(STORAGE_KEYS.UNITS, INITIAL_UNITS);
}

export function getTopics(): Topic[] {
  return getItem(STORAGE_KEYS.TOPICS, INITIAL_TOPICS);
}

export function getTimetable(): TimetableEntry[] {
  return getItem(STORAGE_KEYS.TIMETABLE, INITIAL_TIMETABLE);
}

export function getExaminations(): Examination[] {
  return getItem(STORAGE_KEYS.EXAMINATIONS, INITIAL_EXAMINATIONS);
}

export function getSessionLogs(): SessionLog[] {
  return getItem(STORAGE_KEYS.SESSION_LOGS, INITIAL_SESSION_LOGS);
}

export function getMissedSessions(): MissedSessionRecord[] {
  return getItem(STORAGE_KEYS.MISSED_SESSIONS, INITIAL_MISSED_SESSIONS);
}

export function getAuditLogs(): AuditTrailEntry[] {
  return getItem(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
}

export function getExtraClassRequests(): ExtraClassRequest[] {
  return getItem(STORAGE_KEYS.EXTRA_CLASS_REQUESTS, INITIAL_EXTRA_CLASS_REQUESTS);
}

export function getApprovedExtraClasses(): ApprovedExtraClass[] {
  return getItem(STORAGE_KEYS.APPROVED_EXTRA_CLASSES, INITIAL_APPROVED_EXTRA_CLASSES);
}

export function getOpportunities(): StudentOpportunity[] {
  return getItem(STORAGE_KEYS.OPPORTUNITIES, INITIAL_OPPORTUNITIES);
}

export function getDailyLearningTests(): DailyLearningTest[] {
  return getItem(STORAGE_KEYS.DAILY_LEARNING_TESTS, INITIAL_DAILY_LEARNING_TESTS);
}

export function getExtraClassRequestsByBranch(branchId?: BranchId): ExtraClassRequest[] {
  const all = getExtraClassRequests();
  if (!branchId) return all;
  return all.filter((r) => r.branch_id === branchId);
}

export function getExtraClassRequestsForUser(user: UserProfile | null): ExtraClassRequest[] {
  const all = getExtraClassRequests();
  if (!user) return [];
  if (user.role === 'admin') return all;
  if (user.role === 'campus_manager') {
    const campus = user.branch_id || user.campus_id;
    return all.filter((r) => r.branch_id === campus);
  }
  if (user.role === 'faculty') {
    return all.filter((r) => r.faculty_id === user.id);
  }
  // Students do not access raw request records
  return [];
}

export function getApprovedExtraClassesForUser(user: UserProfile | null): ApprovedExtraClass[] {
  const all = getApprovedExtraClasses();
  if (!user) return [];
  if (user.role === 'admin') return all;
  if (user.role === 'campus_manager') {
    const campus = user.branch_id || user.campus_id;
    return all.filter((c) => c.branch_id === campus);
  }
  if (user.role === 'faculty') {
    return all.filter((c) => c.faculty_id === user.id || c.branch_id === (user.branch_id || user.campus_id));
  }
  if (user.role === 'student') {
    const studentBatches = user.assigned_batch_ids || [];
    return all.filter((c) => {
      if (studentBatches.includes(c.batch_id)) return true;
      const matchBranch = !user.branch_id || c.branch_id === (user.branch_id || user.campus_id);
      return matchBranch && studentBatches.length === 0;
    });
  }
  return [];
}

export function getApprovedExtraClassesForBatch(batchId: string): ApprovedExtraClass[] {
  const all = getApprovedExtraClasses();
  return all.filter((c) => c.batch_id === batchId);
}


// Branch-filtered convenience queries
export function getBatchesByBranch(branchId?: BranchId): Batch[] {
  const batches = getBatches();
  if (!branchId) return batches;
  return batches.filter((b) => (b.branch_id || b.campus_id) === branchId);
}

export function getSemestersByBranch(branchId?: BranchId): Semester[] {
  const semesters = getSemesters();
  if (!branchId) return semesters;
  return semesters.filter((s) => (s.branch_id || s.campus_id) === branchId);
}

export function getHolidaysByBranch(branchId?: BranchId): Holiday[] {
  const holidays = getHolidays();
  if (!branchId) return holidays;
  return holidays.filter((h) => !h.branch_id || (h.branch_id || h.campus_id) === branchId);
}

export function getSubjectsByBranch(branchId?: BranchId): Subject[] {
  const subjects = getSubjects();
  if (!branchId) return subjects;
  return subjects.filter((s) => (s.branch_id || s.campus_id) === branchId);
}

export function getTimetableByBranch(branchId?: BranchId): TimetableEntry[] {
  const tt = getTimetable();
  if (!branchId) return tt;
  return tt.filter((t) => (t.branch_id || t.campus_id) === branchId);
}

export function getExaminationsByBranch(branchId?: BranchId): Examination[] {
  const exams = getExaminations();
  if (!branchId) return exams;
  return exams.filter((e) => (e.branch_id || e.campus_id) === branchId);
}

// Scoped queries enforcing record-level privacy and permissions
export function getBatchesForUser(user: UserProfile | null): Batch[] {
  const allBatches = getBatches();
  if (!user) return [];
  if (user.role === 'admin') return allBatches;
  if (user.role === 'campus_manager') {
    const campus = user.branch_id || user.campus_id;
    return allBatches.filter((b) => (b.branch_id || b.campus_id) === campus);
  }
  if (user.role === 'student') {
    return allBatches.filter((b) => user.assigned_batch_ids && user.assigned_batch_ids.includes(b.id));
  }
  if (user.role === 'faculty') {
    const subjects = getSubjectsForUser(user);
    const batchIds = new Set(subjects.map((s) => s.batch_id));
    const campus = user.branch_id || user.campus_id;
    return allBatches.filter((b) => {
      if (campus && (b.branch_id || b.campus_id) && (b.branch_id || b.campus_id) !== campus) {
        return false;
      }
      return batchIds.has(b.id);
    });
  }
  return [];
}

export function getSubjectsForUser(user: UserProfile | null): Subject[] {
  const allSubjects = getSubjects();
  if (!user) return [];
  if (user.role === 'admin') return allSubjects;
  if (user.role === 'campus_manager') {
    const campus = user.branch_id || user.campus_id;
    return allSubjects.filter((s) => (s.branch_id || s.campus_id) === campus);
  }
  if (user.role === 'faculty') {
    const campus = user.branch_id || user.campus_id;
    return allSubjects.filter((s) => {
      if (campus && (s.branch_id || s.campus_id) && (s.branch_id || s.campus_id) !== campus) {
        return false;
      }
      return s.faculty_id === user.id || Boolean(user.assigned_subject_ids?.includes(s.id));
    });
  }
  if (user.role === 'student') {
    const allowedBatchIds = user.assigned_batch_ids || [];
    return allSubjects.filter((s) => allowedBatchIds.includes(s.batch_id));
  }
  return [];
}

export function getExaminationsForUser(user: UserProfile | null): Examination[] {
  const allExams = getExaminations();
  if (!user) return [];
  if (user.role === 'admin') return allExams;
  if (user.role === 'campus_manager') {
    const campus = user.branch_id || user.campus_id;
    return allExams.filter((e) => (e.branch_id || e.campus_id) === campus);
  }
  if (user.role === 'student') {
    const allowedBatchIds = user.assigned_batch_ids || [];
    return allExams.filter((e) => allowedBatchIds.includes(e.batch_id));
  }
  if (user.role === 'faculty') {
    const mySubjects = getSubjectsForUser(user);
    const myBatchIds = new Set(mySubjects.map((s) => s.batch_id));
    const mySubjectIds = new Set(mySubjects.map((s) => s.id));
    const campus = user.branch_id || user.campus_id;
    return allExams.filter((e) => {
      if (campus && (e.branch_id || e.campus_id) && (e.branch_id || e.campus_id) !== campus) {
        return false;
      }
      return myBatchIds.has(e.batch_id) || mySubjectIds.has(e.subject_id);
    });
  }
  return [];
}

export function getSessionLogsForUser(user: UserProfile | null): SessionLog[] {
  const allLogs = getSessionLogs();
  if (!user) return [];
  if (user.role === 'admin') return allLogs;
  if (user.role === 'campus_manager') {
    const campus = user.branch_id || user.campus_id;
    return allLogs.filter((l) => (l.branch_id || l.campus_id) === campus);
  }
  if (user.role === 'faculty') {
    const campus = user.branch_id || user.campus_id;
    return allLogs.filter((l) => {
      if (campus && (l.branch_id || l.campus_id) && (l.branch_id || l.campus_id) !== campus) {
        return false;
      }
      return l.faculty_id === user.id;
    });
  }
  if (user.role === 'student') {
    const allowedSubjects = getSubjectsForUser(user);
    const allowedSubjectIds = new Set(allowedSubjects.map((s) => s.id));
    return allLogs.filter((l) => allowedSubjectIds.has(l.subject_id));
  }
  return [];
}

export function getTimetableForUser(user: UserProfile | null): TimetableEntry[] {
  const allTimetable = getTimetable();
  if (!user) return [];
  if (user.role === 'admin') return allTimetable;
  const campus = user.branch_id || user.campus_id;
  if (user.role === 'campus_manager') {
    return allTimetable.filter((t) => !campus || (t.branch_id || t.campus_id) === campus);
  }
  if (user.role === 'faculty') {
    const mySubjects = getSubjectsForUser(user);
    const mySubjectIds = new Set(mySubjects.map((s) => s.id));
    return allTimetable.filter((t) => {
      if (campus && (t.branch_id || t.campus_id) && (t.branch_id || t.campus_id) !== campus) {
        return false;
      }
      return t.faculty_id === user.id || mySubjectIds.has(t.subject_id);
    });
  }
  if (user.role === 'student') {
    const allowedBatchIds = new Set(user.assigned_batch_ids || []);
    return allTimetable.filter((t) => allowedBatchIds.has(t.batch_id));
  }
  return [];
}

export function saveOpportunities(opps: StudentOpportunity[]): void {
  setItem(STORAGE_KEYS.OPPORTUNITIES, opps);
  notifyListeners();
}

/**
 * Filter opportunities for user with strict audience targeting and student publication status.
 */
export function getOpportunitiesForUser(user: UserProfile | null): StudentOpportunity[] {
  const allOpps = getOpportunities();
  if (!user) return [];
  // Admins see all opportunities including drafts, unpublished, and archived
  if (user.role === 'admin') return allOpps;

  const userCampus = user.branch_id || user.campus_id;
  const todayStr = formatDateYMD(new Date());

  if (user.role === 'campus_manager' || user.role === 'faculty') {
    return allOpps.filter((o) => {
      if (o.status !== 'published' && o.status !== 'open') return false;
      if (o.target_audience_scope === 'all_students') return true;
      return !userCampus || !o.eligible_branches || o.eligible_branches.includes(userCampus as BranchId);
    });
  }

  if (user.role === 'student') {
    return allOpps.filter((o) => {
      // 1. Publication status: Students ONLY see published/open opportunities
      if (o.status !== 'published' && o.status !== 'open') {
        return false;
      }

      // 2. Publication Date window checks
      if (o.publication_start_date && todayStr < o.publication_start_date) {
        return false;
      }
      if (o.publication_end_date && todayStr > o.publication_end_date) {
        return false;
      }

      // 3. Audience Scope
      if (o.target_audience_scope === 'all_students') {
        return true;
      }

      // 4. Campus isolation
      if (userCampus && o.eligible_branches && o.eligible_branches.length > 0) {
        if (!o.eligible_branches.includes(userCampus as BranchId)) {
          return false;
        }
      }

      // 5. Track isolation
      if (user.assigned_track && o.eligible_tracks && o.eligible_tracks.length > 0) {
        if (!o.eligible_tracks.includes(user.assigned_track)) {
          return false;
        }
      }

      // 6. Batch eligibility
      if (user.assigned_batch_ids && user.assigned_batch_ids.length > 0 && o.eligible_batch_ids && o.eligible_batch_ids.length > 0) {
        const matchesBatch = o.eligible_batch_ids.some((b) => user.assigned_batch_ids?.includes(b));
        if (!matchesBatch) return false;
      }

      return true;
    });
  }

  return [];
}

/**
 * Validates HTTP/HTTPS URL
 */
export function isValidOpportunityUrl(urlString?: string): boolean {
  if (!urlString || typeof urlString !== 'string' || urlString.trim() === '') return false;
  try {
    const url = new URL(urlString.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/**
 * Admin: Create or update an opportunity with URL validation and permission checks.
 */
export function createOrUpdateOpportunity(
  oppData: Partial<StudentOpportunity>,
  user: UserProfile | null
): { success: boolean; opportunity?: StudentOpportunity; error?: string } {
  if (!user || user.role !== 'admin') {
    return {
      success: false,
      error: 'Unauthorized: Only institutional administrators can create or edit opportunities.',
    };
  }

  const allOpps = getOpportunities();
  let existingOpp: StudentOpportunity | undefined;
  if (oppData.id) {
    existingOpp = allOpps.find((o) => o.id === oppData.id);
    if (!existingOpp) {
      return { success: false, error: 'Opportunity not found.' };
    }
  }

  const mergedData: Partial<StudentOpportunity> = existingOpp
    ? { ...existingOpp, ...oppData }
    : oppData;

  // Required field validations
  if (!mergedData.title || mergedData.title.trim() === '') {
    return { success: false, error: 'Opportunity title is required.' };
  }
  if (!mergedData.category) {
    return { success: false, error: 'Category selection is required.' };
  }
  const organizer = mergedData.organizer || mergedData.organization;
  if (!organizer || organizer.trim() === '') {
    return { success: false, error: 'Organizer / Institution name is required.' };
  }
  const summary = mergedData.short_summary || mergedData.description;
  if (!summary || summary.trim() === '') {
    return { success: false, error: 'Short summary is required.' };
  }
  if (!mergedData.official_url || mergedData.official_url.trim() === '') {
    return { success: false, error: 'Official verified external URL is required.' };
  }

  // URL security validation
  if (!isValidOpportunityUrl(mergedData.official_url)) {
    return { success: false, error: 'Official URL must be a valid http:// or https:// web address.' };
  }
  if (mergedData.apply_url && !isValidOpportunityUrl(mergedData.apply_url)) {
    return { success: false, error: 'Application URL must be a valid http:// or https:// web address.' };
  }
  if (mergedData.source_url && !isValidOpportunityUrl(mergedData.source_url)) {
    return { success: false, error: 'Source URL must be a valid http:// or https:// web address.' };
  }
  if (mergedData.cover_image_url && !isValidOpportunityUrl(mergedData.cover_image_url)) {
    return { success: false, error: 'Cover image URL must be a valid http:// or https:// web address.' };
  }

  // Date range validations
  if (mergedData.event_start_date && mergedData.event_end_date) {
    if (mergedData.event_end_date < mergedData.event_start_date) {
      return { success: false, error: 'Event end date cannot be earlier than event start date.' };
    }
  }
  if (mergedData.publication_start_date && mergedData.publication_end_date) {
    if (mergedData.publication_end_date < mergedData.publication_start_date) {
      return { success: false, error: 'Publication end date cannot be earlier than publication start date.' };
    }
  }

  const nowIso = new Date().toISOString();

  // Resolve target audience mappings
  const resolvedBranches: BranchId[] = (oppData.target_campuses && oppData.target_campuses.length > 0)
    ? (oppData.target_campuses as BranchId[])
    : (oppData.eligible_branches && oppData.eligible_branches.length > 0)
    ? oppData.eligible_branches
    : ['Ghaziabad', 'Bangalore', 'Jaipur'];

  const resolvedTracks: AcademicTrackId[] = (oppData.target_tracks && oppData.target_tracks.length > 0)
    ? (oppData.target_tracks as AcademicTrackId[])
    : (oppData.eligible_tracks || []);

  const resolvedBatches: string[] = (oppData.target_batches && oppData.target_batches.length > 0)
    ? oppData.target_batches
    : (oppData.eligible_batch_ids || []);

  let savedOpp: StudentOpportunity;

  if (oppData.id) {
    // Edit existing
    const index = allOpps.findIndex((o) => o.id === oppData.id);
    if (index === -1) {
      return { success: false, error: 'Opportunity not found.' };
    }
    savedOpp = {
      ...allOpps[index],
      ...oppData,
      organizer,
      organization: organizer,
      short_summary: summary,
      full_description: oppData.full_description || summary,
      description: oppData.full_description || summary,
      eligible_branches: resolvedBranches,
      target_campuses: oppData.target_campuses || allOpps[index].target_campuses,
      eligible_tracks: resolvedTracks,
      target_tracks: oppData.target_tracks || allOpps[index].target_tracks,
      eligible_batch_ids: resolvedBatches,
      target_batches: oppData.target_batches || allOpps[index].target_batches,
      updated_at: nowIso,
      updated_by_id: user.id,
      updated_by_name: user.name,
    } as StudentOpportunity;
    allOpps[index] = savedOpp;
  } else {
    // Create new (default to draft if not specified)
    const newId = `opp-${oppData.category || 'misc'}-${Date.now()}`;
    savedOpp = {
      id: newId,
      title: oppData.title.trim(),
      slug: oppData.slug?.trim() || oppData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      category: oppData.category,
      type: oppData.category,
      organizer: organizer.trim(),
      organization: organizer.trim(),
      short_summary: summary.trim(),
      full_description: (oppData.full_description || summary).trim(),
      description: (oppData.full_description || summary).trim(),
      official_url: oppData.official_url.trim(),
      apply_url: oppData.apply_url?.trim() || oppData.official_url.trim(),
      source_url: oppData.source_url?.trim(),
      last_verified_at: oppData.last_verified_at || nowIso.split('T')[0],
      application_deadline: oppData.application_deadline || oppData.deadline,
      deadline: oppData.application_deadline || oppData.deadline,
      event_start_date: oppData.event_start_date,
      event_end_date: oppData.event_end_date,
      publication_start_date: oppData.publication_start_date || formatDateYMD(new Date()),
      publication_end_date: oppData.publication_end_date,
      delivery_format: oppData.delivery_format || 'online',
      price_status: oppData.price_status || 'free',
      stipend_or_reward: oppData.stipend_or_reward,
      eligibility: oppData.eligibility,
      eligibility_requirements: oppData.eligibility_requirements || ['Open to undergraduate students'],
      requirements: oppData.eligibility_requirements || ['Open to undergraduate students'],
      eligibility_summary: oppData.eligibility || oppData.eligibility_summary || 'Undergraduate students',
      target_audience_scope: oppData.target_audience_scope || 'all_students',
      eligible_branches: resolvedBranches,
      target_campuses: oppData.target_campuses || resolvedBranches,
      eligible_tracks: resolvedTracks,
      target_tracks: oppData.target_tracks || resolvedTracks,
      eligible_batch_ids: resolvedBatches,
      target_batches: oppData.target_batches || resolvedBatches,
      location: oppData.location || 'Remote / Hybrid',
      cover_image_url: oppData.cover_image_url,
      featured: Boolean(oppData.featured),
      status: oppData.status || 'draft',
      created_by_id: user.id,
      created_by_name: user.name,
      created_at: nowIso,
      updated_at: nowIso,
    };
    allOpps.unshift(savedOpp);
  }

  saveOpportunities(allOpps);

  logAudit(
    'opportunity',
    savedOpp.id,
    oppData.id ? 'update' : 'create',
    `${user.name} ${oppData.id ? 'updated' : (savedOpp.status === 'published' ? 'published' : 'saved draft for')} Opportunity: "${savedOpp.title}" (${savedOpp.category})`,
    user
  );

  return { success: true, opportunity: savedOpp };
}

/**
 * Admin: Archive an opportunity to preserve history without permanent deletion.
 */
export function archiveOpportunity(
  opportunityId: string,
  user: UserProfile | null
): { success: boolean; error?: string } {
  if (!user || user.role !== 'admin') {
    return { success: false, error: 'Unauthorized: Only administrators can archive opportunities.' };
  }

  const allOpps = getOpportunities();
  const index = allOpps.findIndex((o) => o.id === opportunityId);
  if (index === -1) {
    return { success: false, error: 'Opportunity not found.' };
  }

  allOpps[index] = {
    ...allOpps[index],
    status: 'archived',
    updated_at: new Date().toISOString(),
    updated_by_id: user.id,
    updated_by_name: user.name,
  };

  saveOpportunities(allOpps);

  logAudit(
    'opportunity',
    opportunityId,
    'update',
    `${user.name} archived Opportunity: "${allOpps[index].title}"`,
    user
  );

  return { success: true };
}

/**
 * Admin: Toggle opportunity publication status (published vs unpublished).
 */
export function toggleOpportunityStatus(
  opportunityId: string,
  newStatus: OpportunityPublicationStatus,
  user: UserProfile | null
): { success: boolean; error?: string } {
  if (!user || user.role !== 'admin') {
    return { success: false, error: 'Unauthorized: Only administrators can alter opportunity status.' };
  }

  const allOpps = getOpportunities();
  const index = allOpps.findIndex((o) => o.id === opportunityId);
  if (index === -1) {
    return { success: false, error: 'Opportunity not found.' };
  }

  allOpps[index] = {
    ...allOpps[index],
    status: newStatus,
    updated_at: new Date().toISOString(),
    updated_by_id: user.id,
    updated_by_name: user.name,
  };

  saveOpportunities(allOpps);

  logAudit(
    'opportunity',
    opportunityId,
    'update',
    `${user.name} updated Opportunity status to "${newStatus}" for "${allOpps[index].title}"`,
    user
  );

  return { success: true };
}

/**
 * Admin: Toggle featured status for homepage/spotlight placement.
 */
export function toggleOpportunityFeatured(
  opportunityId: string,
  user: UserProfile | null
): { success: boolean; featured?: boolean; error?: string } {
  if (!user || user.role !== 'admin') {
    return { success: false, error: 'Unauthorized: Only administrators can feature opportunities.' };
  }

  const allOpps = getOpportunities();
  const index = allOpps.findIndex((o) => o.id === opportunityId);
  if (index === -1) {
    return { success: false, error: 'Opportunity not found.' };
  }

  allOpps[index] = {
    ...allOpps[index],
    featured: !allOpps[index].featured,
    updated_at: new Date().toISOString(),
    updated_by_id: user.id,
    updated_by_name: user.name,
  };

  saveOpportunities(allOpps);

  logAudit(
    'opportunity',
    opportunityId,
    'update',
    `${user.name} set featured=${allOpps[index].featured} for "${allOpps[index].title}"`,
    user
  );

  return { success: true, featured: allOpps[index].featured };
}

export function getDailyLearningTestsForUser(user: UserProfile | null): DailyLearningTest[] {
  const allTests = getDailyLearningTests();
  if (!user) return [];
  if (user.role === 'admin') return allTests;
  const userCampus = user.branch_id || user.campus_id;

  if (user.role === 'campus_manager') {
    return allTests.filter((t) => !userCampus || t.branch_id === userCampus);
  }

  if (user.role === 'faculty') {
    // Faculty can view test records for their assigned subjects in their campus
    const mySubjects = getSubjectsForUser(user);
    const subjectIds = new Set(mySubjects.map((s) => s.id));
    return allTests.filter((t) => subjectIds.has(t.subject_id) && (!userCampus || t.branch_id === userCampus));
  }

  if (user.role === 'student') {
    // Strictly isolate: student can ONLY see their own learning tests
    return allTests.filter((t) => t.student_id === user.id);
  }

  return [];
}

export function getDailyLearningTestsBySubject(subjectId: string, user: UserProfile | null): DailyLearningTest[] {
  const userTests = getDailyLearningTestsForUser(user);
  return userTests.filter((t) => t.subject_id === subjectId);
}


// Current User session
export function getCurrentUserId(): string {
  return getItem(STORAGE_KEYS.CURRENT_USER_ID, '');
}

export function setCurrentUserId(userId: string): void {
  setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
}

// --- Action Mutations with Audit Trails & Supabase Persistence ---

export function logAudit(
  entityType: AuditTrailEntry['entity_type'],
  entityId: string,
  action: AuditTrailEntry['action'],
  details: string,
  performedBy: UserProfile
): void {
  const logs = getAuditLogs();
  const newEntry: AuditTrailEntry = {
    id: 'audit-' + Date.now(),
    entity_type: entityType,
    entity_id: entityId,
    action,
    performed_by_id: performedBy.id,
    performed_by_name: performedBy.name,
    details,
    timestamp: new Date().toISOString(),
  };
  setItem(STORAGE_KEYS.AUDIT_LOGS, [newEntry, ...logs]);

  // Persist to Supabase if configured
  if (isSupabaseConfigured) {
    supabaseInsertAudit(newEntry).catch((err) =>
      console.warn('[MSOT] Supabase audit log sync error:', err)
    );
  }
}

// Add / Update Session Log (Faculty)
export function saveSessionLog(
  session: Omit<SessionLog, 'id' | 'created_at'> & { id?: string },
  performedBy: UserProfile
): { success: boolean; error?: string } {
  if (!performedBy || !canFacultyEditSessionLog(performedBy, session as SessionLog)) {
    return {
      success: false,
      error: 'Permission denied: You do not have authorization to create or modify session logs for this faculty or branch.',
    };
  }

  // Prevent duplicate logs for the same scheduled session on the same date
  const logs = getSessionLogs();
  if (session.scheduled_class_id) {
    const existing = logs.find(
      (l) =>
        l.scheduled_class_id === session.scheduled_class_id &&
        l.date === session.date &&
        l.id !== session.id
    );
    if (existing) {
      return {
        success: false,
        error: `A session log already exists for this scheduled class on ${session.date}. Duplicate logs are prohibited.`,
      };
    }
  }

  const logId = session.id || 'sess-log-' + Date.now();
  const newLog: SessionLog = {
    ...session,
    id: logId,
    created_at: new Date().toISOString(),
  };

  const updatedLogs = session.id
    ? logs.map((l) => (l.id === session.id ? newLog : l))
    : [newLog, ...logs];

  setItem(STORAGE_KEYS.SESSION_LOGS, updatedLogs);

  // If session covered topics, persistently update topic completion status!
  if (session.topics_covered && session.topics_covered.length > 0) {
    const topics = getTopics();
    const updatedTopics = topics.map((t) => {
      const match = session.topics_covered.find((tc) => tc.topic_id === t.id);
      if (match) {
        const newPct = Math.min(100, Math.max(0, match.completion_percentage));
        const newStatus =
          newPct >= 100
            ? ('completed' as const)
            : newPct > 0
            ? ('in_progress' as const)
            : t.status;
        const actualDate = newPct >= 100 ? session.date : t.actual_completion_date;

        // Async update to Supabase
        if (isSupabaseConfigured) {
          supabaseUpdateTopic(t.id, {
            completion_percentage: newPct,
            status: newStatus,
            actual_completion_date: actualDate,
          }).catch(console.warn);
        }

        return {
          ...t,
          completion_percentage: newPct,
          status: newStatus,
          actual_completion_date: actualDate,
        };
      }
      return t;
    });
    setItem(STORAGE_KEYS.TOPICS, updatedTopics);
  }

  // If scheduled class had a pending missed record, resolve it
  if (session.scheduled_class_id) {
    const missed = getMissedSessions();
    const updatedMissed = missed.map((m) => {
      if (m.timetable_entry_id === session.scheduled_class_id && m.scheduled_date === session.date) {
        if (isSupabaseConfigured) {
          supabaseUpdateMissedSession(m.id, { status: 'resolved' }).catch(console.warn);
        }
        return { ...m, status: 'resolved' as const };
      }
      return m;
    });
    setItem(STORAGE_KEYS.MISSED_SESSIONS, updatedMissed);
  }

  // Persist session to Supabase
  if (isSupabaseConfigured) {
    supabaseSaveSessionLog(newLog).catch((err) =>
      console.warn('[MSOT] Supabase session log sync error:', err)
    );
  }

  // If class is cancelled, rescheduled or skipped, trigger planned dates recalculation
  if (session.status === 'cancelled' || session.status === 'rescheduled' || session.status === 'skipped') {
    triggerPlannedDatesRecalculation(session.subject_id, performedBy);
  }

  logAudit(
    'session_log',
    logId,
    session.id ? 'update' : 'create',
    `Logged class session on ${session.date} with status: ${session.status}`,
    performedBy
  );

  return { success: true };
}

// Topic updates (Lesson Plan Management)
export function updateTopic(
  topicId: string,
  updates: Partial<Topic>,
  performedBy: UserProfile
): { success: boolean; error?: string } {
  if (!performedBy) return { success: false, error: 'Authentication required' };
  const topics = getTopics();
  const targetTopic = topics.find((t) => t.id === topicId);
  if (!targetTopic) return { success: false, error: 'Topic not found' };
  const subjects = getSubjects();
  const subj = subjects.find((s) => s.id === targetTopic.subject_id);
  if (!canFacultyModifySubject(performedBy, subj)) {
    return { success: false, error: 'Permission denied: You cannot edit topics for this subject.' };
  }

  const updatedTopics = topics.map((t) => {
    if (t.id === topicId) {
      return { ...t, ...updates, updated_at: new Date().toISOString() };
    }
    return t;
  });
  setItem(STORAGE_KEYS.TOPICS, updatedTopics);

  if (isSupabaseConfigured) {
    supabaseUpdateTopic(topicId, updates).catch((err) =>
      console.warn('[MSOT] Supabase topic update error:', err)
    );
  }

  logAudit(
    'topic',
    topicId,
    'update',
    `Updated topic details (Hours: ${updates.planned_hours ?? 'unchanged'}, Status: ${updates.status ?? 'unchanged'}, Scope: ${updates.in_exam_scope ?? 'unchanged'})`,
    performedBy
  );

  return { success: true };
}

export function createTopic(
  topic: Omit<Topic, 'id'>,
  performedBy: UserProfile
): Topic | null {
  if (!performedBy) return null;
  const subjects = getSubjects();
  const subj = subjects.find((s) => s.id === topic.subject_id);
  if (!canFacultyModifySubject(performedBy, subj)) {
    console.error('Permission denied to create topic for subject', topic.subject_id);
    return null;
  }

  const topics = getTopics();
  const newTopic: Topic = {
    ...topic,
    id: 'top-' + Date.now(),
  };
  setItem(STORAGE_KEYS.TOPICS, [...topics, newTopic]);

  if (isSupabaseConfigured) {
    supabaseCreateTopic(newTopic).catch((err) =>
      console.warn('[MSOT] Supabase create topic error:', err)
    );
  }

  logAudit(
    'topic',
    newTopic.id,
    'create',
    `Created new topic: "${newTopic.title}" with ${newTopic.planned_hours} planned hours`,
    performedBy
  );

  return newTopic;
}

export function createUnit(
  unit: Omit<Unit, 'id'>,
  performedBy: UserProfile
): Unit | null {
  if (!performedBy) return null;
  const subjects = getSubjects();
  const subj = subjects.find((s) => s.id === unit.subject_id);
  if (!canFacultyModifySubject(performedBy, subj)) {
    console.error('Permission denied to create unit for subject', unit.subject_id);
    return null;
  }

  const units = getUnits();
  const newUnit: Unit = {
    ...unit,
    id: 'unit-' + Date.now(),
  };
  setItem(STORAGE_KEYS.UNITS, [...units, newUnit]);

  if (isSupabaseConfigured) {
    supabaseCreateUnit(newUnit).catch((err) =>
      console.warn('[MSOT] Supabase create unit error:', err)
    );
  }

  logAudit(
    'unit',
    newUnit.id,
    'create',
    `Created Unit ${newUnit.unit_number}: "${newUnit.title}"`,
    performedBy
  );

  return newUnit;
}

// Recalculate planned dates for all topics of a subject
export function triggerPlannedDatesRecalculation(
  subjectId: string,
  performedBy: UserProfile
): void {
  const topics = getTopics();
  const subjects = getSubjects();
  const semesters = getSemesters();
  const holidays = getHolidays();
  const timetable = getTimetable();

  const subj = subjects.find((s) => s.id === subjectId);
  const sem = semesters.find((s) => s.batch_id === subj?.batch_id);

  if (!sem) return;

  const recalculated = recalculateTopicPlannedDates(
    subjectId,
    topics,
    sem,
    holidays,
    timetable
  );

  setItem(STORAGE_KEYS.TOPICS, recalculated);

  // Sync recalculated topic dates to Supabase
  if (isSupabaseConfigured) {
    const updatedSubjectTopics = recalculated.filter((t) => t.subject_id === subjectId);
    updatedSubjectTopics.forEach((top) => {
      if (top.planned_date) {
        supabaseUpdateTopic(top.id, { planned_date: top.planned_date }).catch(console.warn);
      }
    });
  }

  logAudit(
    'calendar',
    subjectId,
    'recalculate',
    `Triggered planned delivery dates recalculation for subject based on timetable and calendar`,
    performedBy
  );
}

// Calendar & Holiday Updates
export function addHoliday(holiday: Omit<Holiday, 'id'>, performedBy: UserProfile): void {
  const holidays = getHolidays();
  const newHoliday: Holiday = {
    ...holiday,
    id: 'hol-' + Date.now(),
  };
  setItem(STORAGE_KEYS.HOLIDAYS, [...holidays, newHoliday]);

  if (isSupabaseConfigured) {
    supabaseAddHoliday(newHoliday).catch((err) =>
      console.warn('[MSOT] Supabase add holiday error:', err)
    );
  }

  logAudit(
    'calendar',
    newHoliday.id,
    'create',
    `Added holiday "${newHoliday.name}" on ${newHoliday.date}`,
    performedBy
  );

  // Recalculate planned dates for all subjects
  const subjects = getSubjects();
  subjects.forEach((s) => triggerPlannedDatesRecalculation(s.id, performedBy));
}

export function updateSemesterRules(
  semesterId: string,
  updates: Partial<Semester>,
  performedBy: UserProfile
): void {
  const semesters = getSemesters();
  const updated = semesters.map((s) => (s.id === semesterId ? { ...s, ...updates } : s));
  setItem(STORAGE_KEYS.SEMESTERS, updated);

  logAudit(
    'calendar',
    semesterId,
    'update',
    `Updated semester rules (Saturday rule: ${updates.saturday_rule ?? 'unchanged'}, Start: ${updates.start_date ?? 'unchanged'})`,
    performedBy
  );

  // Recalculate topics
  const subjects = getSubjects();
  subjects.forEach((s) => triggerPlannedDatesRecalculation(s.id, performedBy));
}

// Missed Session Escalation Actions
export function sendFacultyReminder(missedId: string, performedBy: UserProfile): void {
  const missed = getMissedSessions();
  const updated = missed.map((m) =>
    m.id === missedId
      ? {
          ...m,
          status: 'reminded' as const,
          last_notified_at: new Date().toISOString(),
        }
      : m
  );
  setItem(STORAGE_KEYS.MISSED_SESSIONS, updated);

  if (isSupabaseConfigured) {
    supabaseUpdateMissedSession(missedId, {
      status: 'reminded',
      last_notified_at: new Date().toISOString(),
    }).catch(console.warn);
  }

  logAudit(
    'session_log',
    missedId,
    'update',
    `Sent pending class log reminder to assigned faculty`,
    performedBy
  );
}

export function escalateMissedSession(
  missedId: string,
  performedBy: UserProfile
): { success: boolean; error?: string } {
  if (!performedBy) return { success: false, error: 'Authentication required' };
  const missed = getMissedSessions();
  const target = missed.find((m) => m.id === missedId);
  if (!target) return { success: false, error: 'Missed session record not found' };

  const targetCampus = target.branch_id || target.campus_id;
  if (targetCampus && !canCampusManagerAccessCampus(performedBy, targetCampus)) {
    return { success: false, error: 'Permission denied: Cannot escalate session for another campus.' };
  }

  const updated = missed.map((m) =>
    m.id === missedId
      ? {
          ...m,
          status: 'escalated' as const,
          escalated_at: new Date().toISOString(),
        }
      : m
  );
  setItem(STORAGE_KEYS.MISSED_SESSIONS, updated);

  if (isSupabaseConfigured) {
    supabaseUpdateMissedSession(missedId, {
      status: 'escalated',
      escalated_at: new Date().toISOString(),
    }).catch(console.warn);
  }

  logAudit(
    'session_log',
    missedId,
    'update',
    `Escalated overdue unlogged session (>48h) to Campus Manager`,
    performedBy
  );

  return { success: true };
}

export function resolveMissedSession(
  missedId: string,
  performedBy: UserProfile
): { success: boolean; error?: string } {
  if (!performedBy) return { success: false, error: 'Authentication required' };
  const missed = getMissedSessions();
  const target = missed.find((m) => m.id === missedId);
  if (!target) return { success: false, error: 'Missed session record not found' };

  const targetCampus = target.branch_id || target.campus_id;
  if (targetCampus && !canCampusManagerAccessCampus(performedBy, targetCampus)) {
    return { success: false, error: 'Permission denied: Cannot resolve session for another campus.' };
  }

  const updated = missed.map((m) =>
    m.id === missedId ? { ...m, status: 'resolved' as const } : m
  );
  setItem(STORAGE_KEYS.MISSED_SESSIONS, updated);

  if (isSupabaseConfigured) {
    supabaseUpdateMissedSession(missedId, { status: 'resolved' }).catch(console.warn);
  }

  logAudit(
    'session_log',
    missedId,
    'update',
    `Resolved missed session escalation status`,
    performedBy
  );

  return { success: true };
}

// Add/Edit Timetable Entry
export function saveTimetableEntry(
  entry: Omit<TimetableEntry, 'id'> & { id?: string },
  performedBy: UserProfile
): void {
  const timetable = getTimetable();
  const entryId = entry.id || 'tt-' + Date.now();
  const newEntry: TimetableEntry = { ...entry, id: entryId };
  const updated = entry.id
    ? timetable.map((t) => (t.id === entry.id ? newEntry : t))
    : [...timetable, newEntry];

  setItem(STORAGE_KEYS.TIMETABLE, updated);

  if (isSupabaseConfigured) {
    supabaseSaveTimetableEntry(newEntry).catch((err) =>
      console.warn('[MSOT] Supabase save timetable slot error:', err)
    );
  }

  logAudit(
    'timetable',
    entryId,
    entry.id ? 'update' : 'create',
    `Saved timetable slot: Day ${entry.day_of_week}, ${entry.start_time}-${entry.end_time}`,
    performedBy
  );

  triggerPlannedDatesRecalculation(entry.subject_id, performedBy);
}

// Examination Management
export function saveExamination(
  exam: Omit<Examination, 'id'> & { id?: string },
  performedBy: UserProfile
): void {
  const exams = getExaminations();
  const examId = exam.id || 'exam-' + Date.now();
  const newExam: Examination = { ...exam, id: examId };
  const updated = exam.id
    ? exams.map((e) => (e.id === exam.id ? newExam : e))
    : [...exams, newExam];

  setItem(STORAGE_KEYS.EXAMINATIONS, updated);

  if (isSupabaseConfigured) {
    supabaseSaveExamination(newExam).catch((err) =>
      console.warn('[MSOT] Supabase save examination error:', err)
    );
  }

  logAudit(
    'calendar',
    examId,
    exam.id ? 'update' : 'create',
    `Configured examination "${exam.name}" on ${exam.exam_date} with ${exam.syllabus_scope_topic_ids.length} topics in syllabus scope`,
    performedBy
  );
}

// ==========================================
// EXTRA CLASS REQUEST & APPROVAL WORKFLOW
// ==========================================

export interface CreateExtraClassRequestInput {
  branch_id: BranchId;
  academic_track: AcademicTrackId;
  batch_id: string;
  subject_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  room?: string;
  topic_ids?: string[];
  topic_titles?: string[];
  reason: string;
  notes?: string;
}

function parseTimeToHours(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h + (m || 0) / 60;
}

export function createExtraClassRequest(
  input: CreateExtraClassRequestInput,
  performedBy: UserProfile
): { success: boolean; request?: ExtraClassRequest; error?: string } {
  if (!performedBy) {
    return { success: false, error: 'Authentication required to submit request.' };
  }

  if (performedBy.role !== 'faculty' && performedBy.role !== 'admin') {
    return {
      success: false,
      error: 'Permission denied: Only faculty members or administrators can request extra classes.',
    };
  }

  // Validate required fields
  if (
    !input.branch_id ||
    !input.academic_track ||
    !input.batch_id ||
    !input.subject_id ||
    !input.date ||
    !input.start_time ||
    !input.end_time ||
    !input.reason?.trim()
  ) {
    return {
      success: false,
      error: 'Please fill in all required fields (Branch, Track, Batch, Subject, Date, Time, and Reason).',
    };
  }

  if (input.start_time >= input.end_time) {
    return { success: false, error: 'End time must be after start time.' };
  }

  const durationHours =
    Math.round((parseTimeToHours(input.end_time) - parseTimeToHours(input.start_time)) * 10) / 10;

  const subjects = getSubjects();
  const batches = getBatches();
  const subject = subjects.find((s) => s.id === input.subject_id);
  const batch = batches.find((b) => b.id === input.batch_id);

  const requestId = 'ecr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const nowIso = new Date().toISOString();

  const newRequest: ExtraClassRequest = {
    id: requestId,
    faculty_id: performedBy.id,
    faculty_name: performedBy.name,
    faculty_email: performedBy.email,
    branch_id: input.branch_id,
    academic_track: input.academic_track,
    batch_id: input.batch_id,
    batch_name: batch?.name || input.batch_id,
    subject_id: input.subject_id,
    subject_name: subject?.name || input.subject_id,
    subject_code: subject?.code || '',
    date: input.date,
    start_time: input.start_time,
    end_time: input.end_time,
    duration_hours: durationHours > 0 ? durationHours : 1.5,
    room: input.room || 'Lecture Hall',
    topic_ids: input.topic_ids || [],
    topic_titles: input.topic_titles || [],
    reason: input.reason.trim(),
    notes: input.notes?.trim() || '',
    status: 'pending',
    created_at: nowIso,
    updated_at: nowIso,
    history: [
      {
        id: 'ecrh-' + Date.now(),
        action: 'Created extra class request',
        performed_by_id: performedBy.id,
        performed_by_name: performedBy.name,
        timestamp: nowIso,
        status: 'pending',
        notes: 'Submitted for Campus Manager review.',
      },
    ],
  };

  const requests = getExtraClassRequests();
  setItem(STORAGE_KEYS.EXTRA_CLASS_REQUESTS, [newRequest, ...requests]);

  logAudit(
    'extra_class',
    requestId,
    'create',
    `Faculty ${performedBy.name} submitted extra class request for ${newRequest.subject_name || newRequest.subject_id} on ${newRequest.date} (${newRequest.start_time}-${newRequest.end_time})`,
    performedBy
  );

  return { success: true, request: newRequest };
}

export function withdrawExtraClassRequest(
  requestId: string,
  performedBy: UserProfile
): { success: boolean; error?: string } {
  if (!performedBy) {
    return { success: false, error: 'Authentication required.' };
  }

  const requests = getExtraClassRequests();
  const target = requests.find((r) => r.id === requestId);

  if (!target) {
    return { success: false, error: 'Request not found.' };
  }

  if (target.status !== 'pending' && target.status !== 'changes_requested') {
    return {
      success: false,
      error: `Cannot withdraw request: Request is already ${target.status}.`,
    };
  }

  if (target.faculty_id !== performedBy.id && !canUserAccessAdmin(performedBy)) {
    return {
      success: false,
      error: 'Permission denied: You can only withdraw your own extra class requests.',
    };
  }

  const nowIso = new Date().toISOString();
  const updated: ExtraClassRequest = {
    ...target,
    status: 'withdrawn',
    updated_at: nowIso,
    history: [
      ...target.history,
      {
        id: 'ecrh-' + Date.now(),
        action: 'Withdrew extra class request',
        performed_by_id: performedBy.id,
        performed_by_name: performedBy.name,
        timestamp: nowIso,
        status: 'withdrawn',
        notes: 'Request withdrawn by faculty.',
      },
    ],
  };

  const nextRequests = requests.map((r) => (r.id === requestId ? updated : r));
  setItem(STORAGE_KEYS.EXTRA_CLASS_REQUESTS, nextRequests);

  logAudit(
    'extra_class',
    requestId,
    'update',
    `Faculty ${performedBy.name} withdrew extra class request ${requestId}`,
    performedBy
  );

  return { success: true };
}

export function reviseExtraClassRequest(
  requestId: string,
  updates: Partial<CreateExtraClassRequestInput> & { revision_notes?: string },
  performedBy: UserProfile
): { success: boolean; request?: ExtraClassRequest; error?: string } {
  if (!performedBy) {
    return { success: false, error: 'Authentication required.' };
  }

  const requests = getExtraClassRequests();
  const target = requests.find((r) => r.id === requestId);

  if (!target) {
    return { success: false, error: 'Request not found.' };
  }

  if (target.status !== 'changes_requested' && target.status !== 'pending') {
    return {
      success: false,
      error: `Cannot revise request with status "${target.status}". Only pending or change-requested requests can be revised.`,
    };
  }

  if (target.faculty_id !== performedBy.id && !canUserAccessAdmin(performedBy)) {
    return {
      success: false,
      error: 'Permission denied: You can only revise your own extra class requests.',
    };
  }

  const startTime = updates.start_time || target.start_time;
  const endTime = updates.end_time || target.end_time;

  if (startTime >= endTime) {
    return { success: false, error: 'End time must be after start time.' };
  }

  const durationHours =
    Math.round((parseTimeToHours(endTime) - parseTimeToHours(startTime)) * 10) / 10;

  const nowIso = new Date().toISOString();
  const updated: ExtraClassRequest = {
    ...target,
    ...updates,
    date: updates.date || target.date,
    start_time: startTime,
    end_time: endTime,
    duration_hours: durationHours > 0 ? durationHours : target.duration_hours,
    reason: updates.reason !== undefined ? updates.reason.trim() : target.reason,
    notes: updates.notes !== undefined ? updates.notes.trim() : target.notes,
    status: 'pending',
    updated_at: nowIso,
    history: [
      ...target.history,
      {
        id: 'ecrh-' + Date.now(),
        action: 'Revised and resubmitted request',
        performed_by_id: performedBy.id,
        performed_by_name: performedBy.name,
        timestamp: nowIso,
        status: 'pending',
        notes: updates.revision_notes || 'Revised parameters and resubmitted for approval.',
      },
    ],
  };

  const nextRequests = requests.map((r) => (r.id === requestId ? updated : r));
  setItem(STORAGE_KEYS.EXTRA_CLASS_REQUESTS, nextRequests);

  logAudit(
    'extra_class',
    requestId,
    'update',
    `Faculty ${performedBy.name} revised extra class request for ${updated.subject_name} (${updated.date} ${updated.start_time}-${updated.end_time})`,
    performedBy
  );

  return { success: true, request: updated };
}

export interface ReviewExtraClassRequestInput {
  decision: 'approve' | 'reject' | 'request_changes';
  reason?: string;
  override_reason?: string;
  change_request_notes?: string;
  room?: string;
}

export function reviewExtraClassRequest(
  requestId: string,
  input: ReviewExtraClassRequestInput,
  reviewer: UserProfile
): { success: boolean; error?: string; conflicts?: ClashConflict[] } {
  if (!reviewer) {
    return { success: false, error: 'Authentication required to review extra class requests.' };
  }

  // Faculty must NOT be able to approve requests or publish events
  if (reviewer.role === 'faculty') {
    return {
      success: false,
      error: 'Permission denied: Faculty members cannot approve extra class requests or directly publish calendar events.',
    };
  }

  if (reviewer.role !== 'campus_manager' && reviewer.role !== 'admin') {
    return {
      success: false,
      error: 'Permission denied: Only Campus Managers or Administrators can review extra class requests.',
    };
  }

  // 1. Fresh fetch from storage to guard against race conditions
  const requests = getExtraClassRequests();
  const request = requests.find((r) => r.id === requestId);

  if (!request) {
    return { success: false, error: 'Request not found.' };
  }

  // 2. Cross-branch isolation check: Campus Manager can review only their branch
  const reviewerBranch = reviewer.branch_id || reviewer.campus_id;
  if (reviewer.role === 'campus_manager' && reviewerBranch && reviewerBranch !== request.branch_id) {
    return {
      success: false,
      error: `Access denied: Campus Managers can only review requests for their assigned branch (${reviewerBranch}).`,
    };
  }

  // 3. Concurrency check: Ensure request is still pending
  if (request.status !== 'pending' && request.status !== 'changes_requested') {
    return {
      success: false,
      error: `This request is no longer pending (current status: ${request.status.toUpperCase()}). Simultaneous approval or modification prevented.`,
    };
  }

  const nowIso = new Date().toISOString();

  // 4. Handle APPROVE
  if (input.decision === 'approve') {
    // Re-check timetable and calendar conflicts at time of submission
    const existingRequests = getExtraClassRequests();
    const timetable = getTimetable();
    const examinations = getExaminations();
    const holidays = getHolidays();
    const subjects = getSubjects();
    const batches = getBatches();

    const clashResult = detectExtraClassClashes(request, {
      existingRequests,
      timetable,
      examinations,
      holidays,
      subjects,
      batches,
    });

    // Duplicate requests can NEVER be approved
    const hasDuplicate = clashResult.conflicts.some((c) => c.type === 'duplicate_request');
    if (hasDuplicate) {
      return {
        success: false,
        error: 'Cannot approve request: A duplicate extra class booking already exists for this subject, batch, date, and time.',
        conflicts: clashResult.conflicts,
      };
    }

    // If other conflicts exist, manager must supply an explicit override reason
    if (clashResult.hasClashes && !input.override_reason?.trim()) {
      return {
        success: false,
        error: 'Schedule conflicts detected. You must resolve the conflict or supply an authorized override reason.',
        conflicts: clashResult.conflicts,
      };
    }

    // Create official calendar event
    const approvedEvent: ApprovedExtraClass = {
      id: 'aec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      request_id: request.id,
      subject_id: request.subject_id,
      subject_name: request.subject_name || '',
      subject_code: request.subject_code || '',
      batch_id: request.batch_id,
      batch_name: request.batch_name || '',
      branch_id: request.branch_id,
      academic_track: request.academic_track,
      date: request.date,
      start_time: request.start_time,
      end_time: request.end_time,
      duration_hours: request.duration_hours,
      room: input.room || request.room || 'Lecture Hall',
      faculty_id: request.faculty_id,
      faculty_name: request.faculty_name,
      topic_ids: request.topic_ids,
      topic_titles: request.topic_titles,
      reason: request.reason,
      approved_by_id: reviewer.id,
      approved_by_name: reviewer.name,
      approved_at: nowIso,
      override_reason: input.override_reason?.trim(),
    };

    const approvedList = getApprovedExtraClasses();
    setItem(STORAGE_KEYS.APPROVED_EXTRA_CLASSES, [approvedEvent, ...approvedList]);

    // Update request status to APPROVED
    const updatedRequest: ExtraClassRequest = {
      ...request,
      status: 'approved',
      room: input.room || request.room,
      override_reason: input.override_reason?.trim(),
      reviewed_by_id: reviewer.id,
      reviewed_by_name: reviewer.name,
      reviewed_at: nowIso,
      updated_at: nowIso,
      history: [
        ...request.history,
        {
          id: 'ecrh-' + Date.now(),
          action: 'Approved extra class request',
          performed_by_id: reviewer.id,
          performed_by_name: reviewer.name,
          timestamp: nowIso,
          status: 'approved',
          notes: input.override_reason?.trim()
            ? `Approved with authorized conflict override: "${input.override_reason.trim()}"`
            : 'Approved without conflicts and scheduled to academic calendar.',
        },
      ],
    };

    const nextRequests = requests.map((r) => (r.id === requestId ? updatedRequest : r));
    setItem(STORAGE_KEYS.EXTRA_CLASS_REQUESTS, nextRequests);

    // Trigger recalculation of planned dates and teaching hours
    triggerPlannedDatesRecalculation(request.subject_id, reviewer);

    logAudit(
      'extra_class',
      request.id,
      'update',
      `${reviewer.role === 'admin' ? 'Administrator' : 'Campus Manager'} ${reviewer.name} approved extra class for ${request.subject_name} on ${request.date} (${request.start_time}-${request.end_time})${input.override_reason ? ' [OVERRIDE: ' + input.override_reason + ']' : ''}`,
      reviewer
    );

    return { success: true };
  }

  // 5. Handle REJECT
  if (input.decision === 'reject') {
    if (!input.reason?.trim()) {
      return {
        success: false,
        error: 'Mandatory rejection reason must be provided.',
      };
    }

    const updatedRequest: ExtraClassRequest = {
      ...request,
      status: 'rejected',
      rejection_reason: input.reason.trim(),
      reviewed_by_id: reviewer.id,
      reviewed_by_name: reviewer.name,
      reviewed_at: nowIso,
      updated_at: nowIso,
      history: [
        ...request.history,
        {
          id: 'ecrh-' + Date.now(),
          action: 'Rejected extra class request',
          performed_by_id: reviewer.id,
          performed_by_name: reviewer.name,
          timestamp: nowIso,
          status: 'rejected',
          notes: `Rejection reason: ${input.reason.trim()}`,
        },
      ],
    };

    const nextRequests = requests.map((r) => (r.id === requestId ? updatedRequest : r));
    setItem(STORAGE_KEYS.EXTRA_CLASS_REQUESTS, nextRequests);

    logAudit(
      'extra_class',
      request.id,
      'update',
      `${reviewer.name} rejected extra class request for ${request.subject_name}. Reason: ${input.reason.trim()}`,
      reviewer
    );

    return { success: true };
  }

  // 6. Handle REQUEST CHANGES
  if (input.decision === 'request_changes') {
    const changeNotes = (input.change_request_notes || input.reason || '').trim();
    if (!changeNotes) {
      return {
        success: false,
        error: 'Please describe the required changes for the faculty member.',
      };
    }

    const updatedRequest: ExtraClassRequest = {
      ...request,
      status: 'changes_requested',
      change_request_notes: changeNotes,
      reviewed_by_id: reviewer.id,
      reviewed_by_name: reviewer.name,
      reviewed_at: nowIso,
      updated_at: nowIso,
      history: [
        ...request.history,
        {
          id: 'ecrh-' + Date.now(),
          action: 'Requested changes for extra class',
          performed_by_id: reviewer.id,
          performed_by_name: reviewer.name,
          timestamp: nowIso,
          status: 'changes_requested',
          notes: `Requested changes: ${changeNotes}`,
        },
      ],
    };

    const nextRequests = requests.map((r) => (r.id === requestId ? updatedRequest : r));
    setItem(STORAGE_KEYS.EXTRA_CLASS_REQUESTS, nextRequests);

    logAudit(
      'extra_class',
      request.id,
      'update',
      `${reviewer.name} requested changes on extra class request for ${request.subject_name}: ${changeNotes}`,
      reviewer
    );

    return { success: true };
  }

  return { success: false, error: 'Invalid decision specified.' };
}

// ==========================================
// 19. DAILY 5-MINUTE RECAP QUIZ SYSTEM
// ==========================================

export function getDailyRecapQuizzes(): DailyRecapQuiz[] {
  return getItem(STORAGE_KEYS.DAILY_RECAP_QUIZZES, INITIAL_DAILY_RECAP_QUIZZES);
}

export function saveDailyRecapQuizzes(quizzes: DailyRecapQuiz[]): void {
  setItem(STORAGE_KEYS.DAILY_RECAP_QUIZZES, quizzes);
  notifyListeners();
}

export function getStudentQuizAttempts(): StudentQuizAttempt[] {
  return getItem(STORAGE_KEYS.STUDENT_QUIZ_ATTEMPTS, INITIAL_STUDENT_QUIZ_ATTEMPTS);
}

export function saveStudentQuizAttempts(attempts: StudentQuizAttempt[]): void {
  setItem(STORAGE_KEYS.STUDENT_QUIZ_ATTEMPTS, attempts);
  notifyListeners();
}

/**
 * Fetch today's recap quiz for a student with answers safely stripped.
 * Returns null if no approved quiz exists for today.
 */
export function getDailyRecapQuizForStudent(
  user: UserProfile | null,
  targetDate?: string
): { quiz: StudentRecapQuizView | null; attempt: StudentQuizAttempt | null } {
  if (!user || user.role !== 'student') {
    return { quiz: null, attempt: null };
  }

  const studentBatchId = user.assigned_batch_ids?.[0];
  const studentBranch = user.branch_id || user.campus_id;
  const dateToUse = targetDate || '2026-10-19';

  const allQuizzes = getDailyRecapQuizzes();
  // Match published quiz for the student's batch and campus for the date
  const matchedQuiz = allQuizzes.find((q) => {
    if (q.status !== 'published') return false;
    if (q.date !== dateToUse) return false;
    if (q.batch_id && studentBatchId) {
      return q.batch_id === studentBatchId;
    }
    if (q.branch_id && studentBranch) {
      return q.branch_id === studentBranch;
    }
    return false;
  });

  if (!matchedQuiz) {
    return { quiz: null, attempt: null };
  }

  // SECURITY: Strip correct_option_index and explanation before sending to student!
  const safeQuestions: StudentRecapQuestion[] = matchedQuiz.questions.map((q) => ({
    id: q.id,
    quiz_id: q.quiz_id,
    question_text: q.question_text,
    options: q.options,
    subject_id: q.subject_id,
    topic_id: q.topic_id,
    topic_title: q.topic_title,
    difficulty: q.difficulty,
    question_type: q.question_type,
  }));

  const studentQuizView: StudentRecapQuizView = {
    id: matchedQuiz.id,
    title: matchedQuiz.title,
    subject_id: matchedQuiz.subject_id,
    subject_name: matchedQuiz.subject_name,
    subject_code: matchedQuiz.subject_code,
    branch_id: matchedQuiz.branch_id,
    batch_id: matchedQuiz.batch_id,
    academic_track: matchedQuiz.academic_track,
    date: matchedQuiz.date,
    estimated_minutes: matchedQuiz.estimated_minutes || 5,
    total_questions: safeQuestions.length,
    questions: safeQuestions,
  };

  const allAttempts = getStudentQuizAttempts();
  const existingAttempt =
    allAttempts.find((a) => a.student_id === user.id && a.quiz_id === matchedQuiz.id) || null;

  return { quiz: studentQuizView, attempt: existingAttempt };
}

/**
 * Start or resume a student quiz attempt.
 */
export function startOrResumeQuizAttempt(
  quizId: string,
  user: UserProfile
): { attempt: StudentQuizAttempt; error?: string } {
  if (user.role !== 'student') {
    return { attempt: null as any, error: 'Only enrolled students may take daily recaps.' };
  }

  const allQuizzes = getDailyRecapQuizzes();
  const quiz = allQuizzes.find((q) => q.id === quizId && q.status === 'published');
  if (!quiz) {
    return { attempt: null as any, error: 'Quiz not found or not published.' };
  }

  // Campus & Batch verification
  const studentBranch = user.branch_id || user.campus_id;
  const studentBatchId = user.assigned_batch_ids?.[0];
  if (quiz.branch_id && studentBranch && quiz.branch_id !== studentBranch) {
    return { attempt: null as any, error: 'Access denied: Quiz belongs to another campus.' };
  }
  if (quiz.batch_id && studentBatchId && quiz.batch_id !== studentBatchId) {
    return { attempt: null as any, error: 'Access denied: Quiz belongs to another batch.' };
  }

  const allAttempts = getStudentQuizAttempts();
  const existing = allAttempts.find((a) => a.student_id === user.id && a.quiz_id === quizId);
  if (existing) {
    return { attempt: existing };
  }

  const newAttempt: StudentQuizAttempt = {
    id: `att-${user.id}-${quiz.id}-${Date.now()}`,
    quiz_id: quiz.id,
    student_id: user.id,
    student_name: user.name,
    batch_id: quiz.batch_id,
    branch_id: quiz.branch_id,
    subject_id: quiz.subject_id,
    date: quiz.date,
    status: 'in_progress',
    started_at: new Date().toISOString(),
    answers: {},
  };

  saveStudentQuizAttempts([...allAttempts, newAttempt]);
  return { attempt: newAttempt };
}

/**
 * Save in-progress answers safely for interrupted attempts.
 */
export function saveQuizAttemptProgress(
  attemptId: string,
  answers: Record<string, number>,
  user: UserProfile
): { success: boolean; attempt?: StudentQuizAttempt; error?: string } {
  const allAttempts = getStudentQuizAttempts();
  const index = allAttempts.findIndex((a) => a.id === attemptId);
  if (index === -1) {
    return { success: false, error: 'Attempt not found.' };
  }

  const attempt = allAttempts[index];
  if (attempt.student_id !== user.id) {
    return { success: false, error: 'Unauthorized attempt access.' };
  }

  // If already completed, do not overwrite answers
  if (attempt.status === 'completed') {
    return { success: true, attempt };
  }

  const updated: StudentQuizAttempt = {
    ...attempt,
    answers: { ...attempt.answers, ...answers },
  };

  allAttempts[index] = updated;
  saveStudentQuizAttempts([...allAttempts]);
  return { success: true, attempt: updated };
}

/**
 * Server-side submission and score calculation.
 * Prevents duplicate attempts, validates answers against master quiz,
 * produces question results and weak topics for revision.
 */
export function submitQuizAttempt(
  attemptId: string,
  answers: Record<string, number>,
  user: UserProfile
): { success: boolean; attempt?: StudentQuizAttempt; error?: string } {
  const allAttempts = getStudentQuizAttempts();
  const index = allAttempts.findIndex((a) => a.id === attemptId);
  if (index === -1) {
    return { success: false, error: 'Attempt not found.' };
  }

  const attempt = allAttempts[index];
  if (attempt.student_id !== user.id) {
    return { success: false, error: 'Unauthorized to submit this attempt.' };
  }

  // Prevent duplicate submission: if already completed, return existing result
  if (attempt.status === 'completed') {
    return { success: true, attempt };
  }

  const allQuizzes = getDailyRecapQuizzes();
  const masterQuiz = allQuizzes.find((q) => q.id === attempt.quiz_id);
  if (!masterQuiz) {
    return { success: false, error: 'Master quiz record not found for scoring.' };
  }

  const mergedAnswers = { ...attempt.answers, ...answers };
  let correctCount = 0;
  const questionResults: QuestionResultItem[] = [];
  const weakTopics: DailyLearningTestWeakTopic[] = [];

  for (const q of masterQuiz.questions) {
    const selectedIndex = mergedAnswers[q.id];
    const isCorrect = selectedIndex !== undefined && selectedIndex === q.correct_option_index;
    if (isCorrect) {
      correctCount++;
    }

    questionResults.push({
      question_id: q.id,
      question_text: q.question_text,
      options: q.options,
      selected_option_index: selectedIndex !== undefined ? selectedIndex : -1,
      correct_option_index: q.correct_option_index,
      is_correct: isCorrect,
      explanation: q.explanation,
      topic_id: q.topic_id,
      topic_title: q.topic_title,
    });

    if (!isCorrect && q.topic_id) {
      weakTopics.push({
        topic_id: q.topic_id,
        topic_title: q.topic_title || 'Syllabus Topic',
        concept: `Concept review needed for ${q.question_text.slice(0, 70)}...`,
        recommended_reading: `Review lecture notes and syllabus objectives for ${q.topic_title || 'this topic'}.`,
      });
    }
  }

  const totalQuestions = masterQuiz.questions.length;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const nowIso = new Date().toISOString();

  const completedAttempt: StudentQuizAttempt = {
    ...attempt,
    answers: mergedAnswers,
    status: 'completed',
    completed_at: nowIso,
    score: correctCount,
    total_questions: totalQuestions,
    percentage,
    question_results: questionResults,
    weak_topics: weakTopics,
  };

  allAttempts[index] = completedAttempt;
  saveStudentQuizAttempts([...allAttempts]);

  // Sync to Daily Learning Tests for academic progression & AI assistant analytics
  const allTests = getDailyLearningTests();
  const existingTestIndex = allTests.findIndex(
    (t) => t.student_id === user.id && t.date === masterQuiz.date && t.subject_id === masterQuiz.subject_id
  );

  const testStatus: 'passed' | 'needs_revision' | 'excellent' =
    percentage >= 80 ? 'excellent' : percentage >= 60 ? 'passed' : 'needs_revision';

  const newTestRecord: DailyLearningTest = {
    id: `dlt-${user.id}-${masterQuiz.id}`,
    student_id: user.id,
    student_name: user.name,
    batch_id: masterQuiz.batch_id,
    branch_id: masterQuiz.branch_id,
    subject_id: masterQuiz.subject_id,
    subject_name: masterQuiz.subject_name,
    date: masterQuiz.date,
    topic_ids: masterQuiz.questions.map((q) => q.topic_id).filter(Boolean) as string[],
    topic_titles: masterQuiz.questions.map((q) => q.topic_title).filter(Boolean) as string[],
    total_questions: totalQuestions,
    score: correctCount,
    percentage,
    status: testStatus,
    weak_topics: weakTopics,
  };

  if (existingTestIndex >= 0) {
    allTests[existingTestIndex] = newTestRecord;
  } else {
    allTests.unshift(newTestRecord);
  }
  setItem(STORAGE_KEYS.DAILY_LEARNING_TESTS, allTests);

  logAudit(
    'daily_recap',
    completedAttempt.id,
    'create',
    `${user.name} completed Daily 5-Minute Recap for ${masterQuiz.subject_name} with score ${correctCount}/${totalQuestions} (${percentage}%)`,
    user
  );

  return { success: true, attempt: completedAttempt };
}

/**
 * Returns performance history and topic-level weak spots for a student.
 */
export function getStudentRecapHistory(user: UserProfile | null): {
  attempts: StudentQuizAttempt[];
  stats: {
    completedCount: number;
    averageScore: number;
    averagePercentage: number;
    weakTopics: DailyLearningTestWeakTopic[];
  };
} {
  if (!user || user.role !== 'student') {
    return {
      attempts: [],
      stats: { completedCount: 0, averageScore: 0, averagePercentage: 0, weakTopics: [] },
    };
  }

  const allAttempts = getStudentQuizAttempts();
  const completedAttempts = allAttempts
    .filter((a) => a.student_id === user.id && a.status === 'completed')
    .sort((a, b) => (b.completed_at || b.date).localeCompare(a.completed_at || a.date));

  const completedCount = completedAttempts.length;
  const totalScore = completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
  const totalPct = completedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0);

  const averageScore = completedCount > 0 ? Number((totalScore / completedCount).toFixed(1)) : 0;
  const averagePercentage = completedCount > 0 ? Math.round(totalPct / completedCount) : 0;

  // Deduplicate weak topics
  const weakTopicMap = new Map<string, DailyLearningTestWeakTopic>();
  completedAttempts.forEach((a) => {
    (a.weak_topics || []).forEach((w) => {
      if (w.topic_id && !weakTopicMap.has(w.topic_id)) {
        weakTopicMap.set(w.topic_id, w);
      }
    });
  });

  return {
    attempts: completedAttempts,
    stats: {
      completedCount,
      averageScore,
      averagePercentage,
      weakTopics: Array.from(weakTopicMap.values()),
    },
  };
}

/**
 * Returns quizzes visible to faculty/staff based on role and campus.
 */
export function getQuizzesForFaculty(user: UserProfile | null): DailyRecapQuiz[] {
  const allQuizzes = getDailyRecapQuizzes();
  if (!user) return [];
  if (user.role === 'admin') return allQuizzes;

  const userCampus = user.branch_id || user.campus_id;

  if (user.role === 'campus_manager') {
    return allQuizzes.filter((q) => !userCampus || q.branch_id === userCampus);
  }

  if (user.role === 'faculty') {
    const mySubjects = getSubjectsForUser(user);
    const subjectIds = new Set(mySubjects.map((s) => s.id));
    return allQuizzes.filter(
      (q) => subjectIds.has(q.subject_id) && (!userCampus || q.branch_id === userCampus)
    );
  }

  return [];
}

/**
 * Create or update a daily recap quiz with faculty permission validation.
 */
export function createOrUpdateDailyRecapQuiz(
  quizData: Partial<DailyRecapQuiz>,
  user: UserProfile
): { success: boolean; quiz?: DailyRecapQuiz; error?: string } {
  if (user.role !== 'faculty' && user.role !== 'admin' && user.role !== 'campus_manager') {
    return { success: false, error: 'Unauthorized: Only faculty and academic staff can manage quizzes.' };
  }

  // Validate subject assignment if faculty
  if (user.role === 'faculty') {
    if (!quizData.subject_id) {
      return { success: false, error: 'Subject is required.' };
    }
    const mySubjects = getSubjectsForUser(user);
    const authorized = mySubjects.some((s) => s.id === quizData.subject_id);
    if (!authorized) {
      return { success: false, error: 'Faculty is not authorized to create quizzes for this subject.' };
    }
  }

  // Validate questions
  const questions = quizData.questions || [];
  if (questions.length === 0) {
    return { success: false, error: 'A daily recap quiz must have at least 1 question (recommended: 5).' };
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.question_text || q.question_text.trim() === '') {
      return { success: false, error: `Question ${i + 1} is missing question text.` };
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return { success: false, error: `Question ${i + 1} must have exactly 4 answer options.` };
    }
    if (q.options.some((opt) => !opt || opt.trim() === '')) {
      return { success: false, error: `Question ${i + 1} has blank answer options.` };
    }
    if (typeof q.correct_option_index !== 'number' || q.correct_option_index < 0 || q.correct_option_index > 3) {
      return { success: false, error: `Question ${i + 1} has an invalid correct option index.` };
    }
    if (!q.explanation || q.explanation.trim() === '') {
      return { success: false, error: `Question ${i + 1} requires an explanation for the correct answer.` };
    }
  }

  const allQuizzes = getDailyRecapQuizzes();
  const nowIso = new Date().toISOString();

  let savedQuiz: DailyRecapQuiz;

  if (quizData.id) {
    // Edit existing quiz
    const index = allQuizzes.findIndex((q) => q.id === quizData.id);
    if (index === -1) {
      return { success: false, error: 'Quiz not found.' };
    }
    savedQuiz = {
      ...allQuizzes[index],
      ...quizData,
      questions: questions.map((q, idx) => ({
        ...q,
        id: q.id || `q-${quizData.id}-${idx + 1}`,
        quiz_id: quizData.id!,
      })),
    } as DailyRecapQuiz;
    allQuizzes[index] = savedQuiz;
  } else {
    // Create new quiz
    const newId = `quiz-${quizData.branch_id?.toLowerCase() || 'rec'}-${Date.now()}`;
    savedQuiz = {
      id: newId,
      title: quizData.title || 'Daily 5-Minute Recap',
      subject_id: quizData.subject_id!,
      subject_name: quizData.subject_name || 'Assigned Course',
      subject_code: quizData.subject_code || 'MSOT',
      branch_id: quizData.branch_id || (user.branch_id as BranchId),
      batch_id: quizData.batch_id || '',
      academic_track: quizData.academic_track || 'Mirai Track',
      date: quizData.date || '2026-10-19',
      estimated_minutes: quizData.estimated_minutes || 5,
      status: quizData.status || 'published',
      created_by_faculty_id: user.id,
      faculty_name: user.name,
      created_at: nowIso,
      questions: questions.map((q, idx) => ({
        ...q,
        id: `q-${newId}-${idx + 1}`,
        quiz_id: newId,
      })),
    };
    allQuizzes.unshift(savedQuiz);
  }

  saveDailyRecapQuizzes(allQuizzes);

  logAudit(
    'daily_recap',
    savedQuiz.id,
    quizData.id ? 'update' : 'create',
    `${user.name} published Daily 5-Minute Recap: "${savedQuiz.title}" for ${savedQuiz.subject_name}`,
    user
  );

  return { success: true, quiz: savedQuiz };
}

