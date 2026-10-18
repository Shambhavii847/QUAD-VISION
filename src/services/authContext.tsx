import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, CampusId } from '../types';
import {
  getUsers,
  getCurrentUserId,
  setCurrentUserId as setStoredUserId,
  subscribeToDataChanges,
  initializeStorageIfNeeded,
  syncWithSupabase,
} from './storage';
import {
  authenticateLocalUser,
  getActiveSession,
  clearActiveSession,
} from './authService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  supabaseSignIn,
  supabaseSignUp,
  supabaseSignOut,
  supabaseResetPassword,
  supabaseGetCurrentUser,
} from './supabaseService';

interface AuthContextType {
  currentUser: UserProfile | null;
  users: UserProfile[];
  isDemoMode: boolean;
  isBackendConnected: boolean;
  login: (
    identifier: string,
    password?: string,
    portalType?: 'student' | 'faculty' | 'staff'
  ) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    role?: UserRole,
    campusId?: CampusId
  ) => Promise<{ success: boolean; error?: string; requiresConfirmation?: boolean }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  // Deprecated impersonation stubs - completely disabled for privacy/security
  switchUserById?: (userId: string) => void;
  switchRole?: (role: UserRole) => void;
  isAdmin: boolean;
  isCampusManager: boolean;
  isFaculty: boolean;
  isStudent: boolean;
  canEditLessonPlan: boolean;
  canLogSession: boolean;
  canManageAdmin: boolean;
  canEscalate: boolean;
  reSyncDatabase: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  initializeStorageIfNeeded();

  const [users, setUsers] = useState<UserProfile[]>(getUsers());
  const [supabaseUser, setSupabaseUser] = useState<UserProfile | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(isSupabaseConfigured);

  // Restore authenticated user from secure session or active Supabase session
  const [activeUser, setActiveUser] = useState<UserProfile | null>(() => {
    const active = getActiveSession();
    return active.user;
  });

  // Subscribe to storage changes
  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      const allUsers = getUsers();
      setUsers(allUsers);
      const active = getActiveSession();
      setActiveUser(active.user);
    });
    return unsubscribe;
  }, []);

  // Supabase Auth listener
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Check existing active session
    supabaseGetCurrentUser().then((user) => {
      if (user) {
        setSupabaseUser(user);
        setActiveUser(user);
        setIsBackendConnected(true);
      }
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const user = await supabaseGetCurrentUser();
          setSupabaseUser(user);
          setActiveUser(user);
          setIsBackendConnected(true);
        } else if (event === 'SIGNED_OUT') {
          setSupabaseUser(null);
          setActiveUser(null);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Current active user is strictly determined from verified server or session state, NEVER a default fallback
  const currentUser: UserProfile | null = supabaseUser || activeUser || null;

  const login = async (
    identifier: string,
    password: string = '',
    portalType: 'student' | 'faculty' | 'staff' = 'staff'
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
    // 1. If Supabase is configured, attempt real Supabase Auth
    if (isSupabaseConfigured && supabase) {
      const result = await supabaseSignIn(identifier, password);
      if (result.error) {
        return { success: false, error: result.error };
      }

      if (result.data?.user) {
        // Enforce portal segmentation
        const role = result.data.user.role;
        if (portalType === 'student' && role !== 'student') {
          await supabaseSignOut();
          return { success: false, error: 'Access denied: Non-student credential.' };
        }
        if (portalType === 'faculty' && role !== 'faculty') {
          await supabaseSignOut();
          return { success: false, error: 'Access denied: Non-faculty credential.' };
        }
        if (portalType === 'staff' && role !== 'admin' && role !== 'campus_manager') {
          await supabaseSignOut();
          return { success: false, error: 'Access denied: Non-staff credential.' };
        }

        setSupabaseUser(result.data.user);
        setActiveUser(result.data.user);
        setStoredUserId(result.data.user.id);
        return { success: true, user: result.data.user };
      }
    }

    // 2. Real cryptographic authentication via authService
    const res = await authenticateLocalUser(identifier, password, portalType);
    if (!res.success || !res.user) {
      return { success: false, error: res.error || 'Authentication failed.' };
    }

    setStoredUserId(res.user.id);
    setActiveUser(res.user);
    return { success: true, user: res.user };
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: UserRole = 'student',
    campusId?: CampusId
  ) => {
    if (isSupabaseConfigured && supabase) {
      const result = await supabaseSignUp(email, password, name, role, campusId);
      if (result.error) {
        return { success: false, error: result.error };
      }
      return {
        success: true,
        requiresConfirmation: result.data?.requiresConfirmation,
      };
    }

    // Register local profile
    const newDemoUser: UserProfile = {
      id: 'user-' + Date.now(),
      email: email.trim(),
      name,
      role,
      campus_id: campusId || 'Ghaziabad',
      branch_id: (campusId as any) || 'Ghaziabad',
    };
    const updatedUsers = [newDemoUser, ...users];
    setUsers(updatedUsers);
    return { success: true, requiresConfirmation: false };
  };

  const resetPassword = async (email: string) => {
    if (isSupabaseConfigured && supabase) {
      const res = await supabaseResetPassword(email);
      if (res.error) {
        return { success: false, error: res.error };
      }
      return { success: true };
    }
    return {
      success: true,
      error: 'In a production Supabase instance, a password recovery link is dispatched to your institutional email.',
    };
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabaseSignOut();
      setSupabaseUser(null);
    }
    clearActiveSession();
    setStoredUserId('');
    setActiveUser(null);
  };

  // Impersonation disabled
  const switchUserById = () => {
    console.warn('[Security] Persona switching and user impersonation have been permanently disabled.');
  };

  const switchRole = () => {
    console.warn('[Security] Role switching controls have been permanently disabled.');
  };

  const reSyncDatabase = async () => {
    return await syncWithSupabase();
  };

  const isAdmin = currentUser?.role === 'admin';
  const isCampusManager = currentUser?.role === 'campus_manager';
  const isFaculty = currentUser?.role === 'faculty';
  const isStudent = currentUser?.role === 'student';

  const canEditLessonPlan = isAdmin || isCampusManager || isFaculty;
  const canLogSession = isAdmin || isCampusManager || isFaculty;
  const canManageAdmin = isAdmin;
  const canEscalate = isAdmin || isCampusManager;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isDemoMode: !isSupabaseConfigured,
        isBackendConnected,
        login,
        signUp,
        resetPassword,
        logout,
        switchUserById,
        switchRole,
        isAdmin,
        isCampusManager,
        isFaculty,
        isStudent,
        canEditLessonPlan,
        canLogSession,
        canManageAdmin,
        canEscalate,
        reSyncDatabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
