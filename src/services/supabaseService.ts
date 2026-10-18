import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  UserProfile,
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
  UserRole,
} from '../types';

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Diagnostic test to verify live connection to Supabase project
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
  tablesFound?: string[];
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      connected: false,
      error: 'Supabase credentials not configured in environment (.env).',
    };
  }

  const start = performance.now();
  try {
    // Attempt a light query to check credentials and connectivity
    const { data, error } = await supabase.from('campuses').select('id, name').limit(1);

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      return {
        connected: false,
        latencyMs,
        error: error.message || 'Failed to query Supabase database.',
      };
    }

    return {
      connected: true,
      latencyMs,
      tablesFound: ['campuses'],
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message || 'Network error connecting to Supabase host.',
    };
  }
}

// ==============================================================================
// AUTHENTICATION API
// ==============================================================================

export async function supabaseSignIn(
  email: string,
  password: string
): Promise<ServiceResult<{ user: UserProfile; session: any }>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data.user) {
      return { data: null, error: 'No user returned from authentication service.' };
    }

    // Fetch user profile from public.profiles
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    const profile: UserProfile = {
      id: data.user.id,
      email: data.user.email || email,
      name: profileData?.name || (data.user.user_metadata?.name as string) || email.split('@')[0],
      role: (profileData?.role as UserRole) || (data.user.user_metadata?.role as UserRole) || 'student',
      campus_id: (profileData?.campus_id as CampusId) || (data.user.user_metadata?.campus_id as CampusId),
      avatar_url: profileData?.avatar_url || data.user.user_metadata?.avatar_url,
    };

    return { data: { user: profile, session: data.session }, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Login request failed.' };
  }
}

export async function supabaseSignUp(
  email: string,
  password: string,
  name: string,
  role: UserRole = 'student',
  campusId?: CampusId
): Promise<ServiceResult<{ user: UserProfile | null; requiresConfirmation: boolean }>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name,
          role,
          campus_id: campusId,
        },
      },
    });

    if (error) {
      return { data: null, error: error.message };
    }

    const requiresConfirmation = !data.session;
    let user: UserProfile | null = null;

    if (data.user) {
      user = {
        id: data.user.id,
        email: data.user.email || email,
        name,
        role,
        campus_id: campusId,
      };

      // Also ensure profile exists in public.profiles table if trigger hasn't fired yet
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email || email,
        name,
        role,
        campus_id: campusId,
      });
    }

    return {
      data: { user, requiresConfirmation },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err.message || 'Registration request failed.' };
  }
}

export async function supabaseSignOut(): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: null };
  }

  const { error } = await supabase.auth.signOut();
  return { error: error ? error.message : null };
}

export async function supabaseResetPassword(email: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase not configured' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  return { error: error ? error.message : null };
}

export async function supabaseGetCurrentUser(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profile) {
      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        campus_id: profile.campus_id,
        avatar_url: profile.avatar_url,
      };
    }

    return {
      id: session.user.id,
      email: session.user.email || '',
      name: (session.user.user_metadata?.name as string) || 'User',
      role: (session.user.user_metadata?.role as UserRole) || 'student',
      campus_id: (session.user.user_metadata?.campus_id as CampusId) || 'HI-Tech',
    };
  } catch {
    return null;
  }
}

// ==============================================================================
// DATABASE QUERIES & MUTATIONS (CRUD)
// ==============================================================================

export async function supabaseFetchAllData() {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const [
      usersRes,
      batchesRes,
      semestersRes,
      holidaysRes,
      subjectsRes,
      unitsRes,
      topicsRes,
      timetableRes,
      examsRes,
      sessionLogsRes,
      missedRes,
      auditRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('batches').select('*'),
      supabase.from('semesters').select('*'),
      supabase.from('holidays').select('*'),
      supabase.from('subjects').select('*'),
      supabase.from('units').select('*'),
      supabase.from('topics').select('*'),
      supabase.from('timetable_entries').select('*'),
      supabase.from('examinations').select('*'),
      supabase.from('session_logs').select('*').order('date', { ascending: false }),
      supabase.from('missed_sessions').select('*'),
      supabase.from('audit_trail').select('*').order('created_at', { ascending: false }),
    ]);

    return {
      users: (usersRes.data as UserProfile[]) || [],
      batches: (batchesRes.data as Batch[]) || [],
      semesters: (semestersRes.data as Semester[]) || [],
      holidays: (holidaysRes.data as Holiday[]) || [],
      subjects: (subjectsRes.data as Subject[]) || [],
      units: (unitsRes.data as Unit[]) || [],
      topics: (topicsRes.data as Topic[]) || [],
      timetable: (timetableRes.data as TimetableEntry[]) || [],
      examinations: (examsRes.data as Examination[]) || [],
      sessionLogs: (sessionLogsRes.data as SessionLog[]) || [],
      missedSessions: (missedRes.data as MissedSessionRecord[]) || [],
      auditLogs: (auditRes.data as AuditTrailEntry[]) || [],
    };
  } catch (err) {
    console.warn('[MSOT] Supabase fetch all data encountered an issue:', err);
    return null;
  }
}

// Session Log Persistence
export async function supabaseSaveSessionLog(
  log: Omit<SessionLog, 'id' | 'created_at'> & { id?: string }
): Promise<ServiceResult<SessionLog>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('session_logs')
      .upsert({
        ...log,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// Topic Update
export async function supabaseUpdateTopic(
  topicId: string,
  updates: Partial<Topic>
): Promise<ServiceResult<Topic>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('topics')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', topicId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// Create Topic
export async function supabaseCreateTopic(
  topic: Omit<Topic, 'id'>
): Promise<ServiceResult<Topic>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('topics')
      .insert(topic)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// Create Unit
export async function supabaseCreateUnit(
  unit: Omit<Unit, 'id'>
): Promise<ServiceResult<Unit>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('units')
      .insert(unit)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// Add Holiday
export async function supabaseAddHoliday(
  holiday: Omit<Holiday, 'id'>
): Promise<ServiceResult<Holiday>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('holidays')
      .insert(holiday)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// Timetable Entry
export async function supabaseSaveTimetableEntry(
  entry: Omit<TimetableEntry, 'id'> & { id?: string }
): Promise<ServiceResult<TimetableEntry>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('timetable_entries')
      .upsert(entry)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// Examination
export async function supabaseSaveExamination(
  exam: Omit<Examination, 'id'> & { id?: string }
): Promise<ServiceResult<Examination>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('examinations')
      .upsert(exam)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// Missed Session Update
export async function supabaseUpdateMissedSession(
  id: string,
  updates: Partial<MissedSessionRecord>
): Promise<ServiceResult<MissedSessionRecord>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('missed_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// Audit Trail Insert
export async function supabaseInsertAudit(
  entry: Omit<AuditTrailEntry, 'id' | 'timestamp'>
): Promise<ServiceResult<AuditTrailEntry>> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('audit_trail')
      .insert({
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        action: entry.action,
        performed_by: entry.performed_by_id,
        details: { text: entry.details, author: entry.performed_by_name },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}
