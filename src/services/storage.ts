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
} from '../data/mockData';
import { recalculateTopicPlannedDates } from '../utils/calculations';
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
    const subjects = getSubjects().filter(
      (s) => s.faculty_id === user.id || user.assigned_subject_ids?.includes(s.id)
    );
    const batchIds = new Set(subjects.map((s) => s.batch_id));
    return allBatches.filter((b) => batchIds.has(b.id));
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
    return allSubjects.filter(
      (s) => s.faculty_id === user.id || user.assigned_subject_ids?.includes(s.id)
    );
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
    return allExams.filter((e) => myBatchIds.has(e.batch_id));
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
    return allLogs.filter((l) => l.faculty_id === user.id);
  }
  if (user.role === 'student') {
    const allowedSubjects = getSubjectsForUser(user);
    const allowedSubjectIds = new Set(allowedSubjects.map((s) => s.id));
    return allLogs.filter((l) => allowedSubjectIds.has(l.subject_id));
  }
  return [];
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
