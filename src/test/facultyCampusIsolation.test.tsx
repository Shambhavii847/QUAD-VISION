import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../services/authContext';
import { BookshelfHome } from '../components/lessonPlan/BookshelfHome';
import { ExamReadinessDashboard } from '../components/exams/ExamReadinessDashboard';
import { SessionLoggingModal } from '../components/faculty/SessionLoggingModal';
import {
  setRawSessionForTesting,
  clearActiveSession,
  canFacultyModifySubject,
  canFacultyEditSessionLog,
} from '../services/authService';
import {
  getSubjectsForUser,
  getExaminationsForUser,
  getBatchesForUser,
  getSessionLogsForUser,
  getSubjects,
  resetToDemoData,
} from '../services/storage';
import { INITIAL_USERS } from '../data/mockData';
import { UserProfile, SessionLog } from '../types';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </AuthProvider>
  );
};

describe('Faculty Interface Campus Isolation & UI Cleanup Verification', () => {
  const gzbFaculty = INITIAL_USERS.find((u) => u.id === 'user-fac-radhika')!; // Ghaziabad
  const blrFaculty = INITIAL_USERS.find((u) => u.id === 'user-fac-anand')!;   // Bangalore
  const jprFaculty = INITIAL_USERS.find((u) => u.id === 'user-fac-vikram')!;  // Jaipur
  const adminUser  = INITIAL_USERS.find((u) => u.role === 'admin')!;
  const gzbManager = INITIAL_USERS.find((u) => u.id === 'user-mgr-gzb')!;

  beforeEach(() => {
    resetToDemoData();
    clearActiveSession();
  });

  const loginAs = (user: UserProfile) => {
    setRawSessionForTesting({
      token: 'test-sess-' + user.id,
      userId: user.id,
      role: user.role,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });
  };

  // 1. Learning Library (BookshelfHome) for Faculty
  describe('1. Learning Library (BookshelfHome) for Faculty', () => {
    it('Ghaziabad Faculty (Dr. Radhika Sharma): Shows no Campus Affiliations card and no cross-campus filter tabs', () => {
      loginAs(gzbFaculty);
      renderWithProviders(<BookshelfHome onSelectSubject={() => {}} />);

      // Must NOT render "Campus Affiliations" card or mention other universities
      expect(screen.queryByText('Campus Affiliations')).not.toBeInTheDocument();
      expect(screen.queryByText(/Supports AKTU \(Ghaziabad\), VTU \(Bangalore\) and Jagannath University/i)).not.toBeInTheDocument();

      // Must NOT render "All Campuses" button or other campus buttons
      expect(screen.queryByRole('button', { name: /^All Campuses$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Bangalore Branch/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Jaipur Branch/i })).not.toBeInTheDocument();

      // Assigned campus is displayed in the context pill
      expect(screen.getByText('Ghaziabad Campus')).toBeInTheDocument();

      // Shows only Radhika's Ghaziabad subjects
      expect(screen.getByText('CS301')).toBeInTheDocument();
      expect(screen.queryByText('BCS301')).not.toBeInTheDocument(); // Bangalore subject
      expect(screen.queryByText('JNU301')).not.toBeInTheDocument(); // Jaipur subject
    });

    it('Bangalore Faculty (Dr. Anand Murthy): Shows only Bangalore subjects and no other-campus options', () => {
      loginAs(blrFaculty);
      renderWithProviders(<BookshelfHome onSelectSubject={() => {}} />);

      expect(screen.queryByText('Campus Affiliations')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^All Campuses$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Ghaziabad Branch/i })).not.toBeInTheDocument();
      expect(screen.getByText('Bangalore Campus')).toBeInTheDocument();

      // Bangalore Mirai subject
      expect(screen.getByText('CS301')).toBeInTheDocument();
      // Should not see Ghaziabad's CS302 or KCS301
      expect(screen.queryByText('CS302')).not.toBeInTheDocument();
      expect(screen.queryByText('KCS301')).not.toBeInTheDocument();
    });

    it('Jaipur Faculty (Prof. Vikram Rathore): Shows only Jaipur subjects and no other-campus options', () => {
      loginAs(jprFaculty);
      renderWithProviders(<BookshelfHome onSelectSubject={() => {}} />);

      expect(screen.queryByText('Campus Affiliations')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^All Campuses$/i })).not.toBeInTheDocument();
      expect(screen.getByText('Jaipur Campus')).toBeInTheDocument();

      // Should not see Bangalore's BCS301
      expect(screen.queryByText('BCS301')).not.toBeInTheDocument();
    });

    it('Admin retains cross-campus controls and "All Campuses" buttons in Learning Library', () => {
      loginAs(adminUser);
      renderWithProviders(<BookshelfHome onSelectSubject={() => {}} />);

      // Admin has cross-campus buttons
      expect(screen.getByRole('button', { name: /^All Campuses$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Ghaziabad Branch/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Bangalore Branch/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Jaipur Branch/i })).toBeInTheDocument();
    });
  });

  // 2. Exam Readiness Dashboard for Faculty
  describe('2. Exam Readiness Dashboard for Faculty', () => {
    it('Faculty interface removes "All Branches" and other-campus dropdown options', () => {
      loginAs(gzbFaculty);
      renderWithProviders(<ExamReadinessDashboard />);

      // Must NOT render a select element with "All Branches" or other campus options for faculty
      expect(screen.queryByRole('option', { name: /All Branches/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Bangalore \(VTU\)/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Jaipur \(Jagannath Univ\)/i })).not.toBeInTheDocument();

      // Displays assigned campus context cleanly
      expect(screen.getAllByText(/Ghaziabad/i).length).toBeGreaterThan(0);
    });

    it('Admin retains "All Branches" and campus switching dropdown in Exam Readiness', () => {
      loginAs(adminUser);
      renderWithProviders(<ExamReadinessDashboard />);

      // Admin has dropdown with All Branches and all campuses
      expect(screen.getByRole('option', { name: /All Branches/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Ghaziabad \(AKTU\)/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Bangalore \(VTU\)/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Jaipur \(Jagannath Univ\)/i })).toBeInTheDocument();
    });
  });

  // 3. Session Logging Modal for Faculty
  describe('3. Session Logging Modal for Faculty', () => {
    it('Faculty interface locks campus to assigned branch and removes other-campus and legacy campus dropdown options', () => {
      loginAs(gzbFaculty);
      renderWithProviders(
        <SessionLoggingModal isOpen={true} onClose={() => {}} />
      );

      // Campus selector is read-only for faculty, not a select with other campuses
      expect(screen.queryByRole('option', { name: /Bangalore \(VTU\)/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /HI-Tech \(Hyderabad\)/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Ratnam \(Bangalore\)/i })).not.toBeInTheDocument();

      // Displays assigned campus
      expect(screen.getByText(/Ghaziabad Branch/i)).toBeInTheDocument();
    });
  });

  // 4. Backend & Service Enforcement
  describe('4. Backend and Data Layer Security Enforcement', () => {
    it('canFacultyModifySubject blocks cross-campus attempts', () => {
      const allSubjects = getSubjects();
      const blrSubject = allSubjects.find((s) => s.branch_id === 'Bangalore')!;
      const jprSubject = allSubjects.find((s) => s.branch_id === 'Jaipur')!;
      const gzbSubject = allSubjects.find((s) => s.id === 'subj-gzb-cs301')!;

      // Radhika (Ghaziabad) can modify her assigned subject
      expect(canFacultyModifySubject(gzbFaculty, gzbSubject)).toBe(true);

      // Radhika cannot modify Bangalore or Jaipur subjects
      expect(canFacultyModifySubject(gzbFaculty, blrSubject)).toBe(false);
      expect(canFacultyModifySubject(gzbFaculty, jprSubject)).toBe(false);

      // Anand (Bangalore) cannot modify Ghaziabad subjects
      expect(canFacultyModifySubject(blrFaculty, gzbSubject)).toBe(false);
    });

    it('canFacultyEditSessionLog blocks cross-campus session modifications', () => {
      const mockGzbLog: SessionLog = {
        id: 'sess-1',
        subject_id: 'subj-gzb-cs301',
        faculty_id: gzbFaculty.id,
        branch_id: 'Ghaziabad',
        batch_id: 'batch-gzb-cs-2026',
        topics_covered: [{ topic_id: 'top-1', completion_percentage: 100 }],
        topics_remaining: ['top-2'],
        classwork_status: 'completed',
        homework_status: 'given',
        date: '2026-09-18',
        duration_hours: 1.5,
        status: 'completed',
        created_at: new Date().toISOString(),
      };

      const mockBlrLog: SessionLog = {
        id: 'sess-2',
        subject_id: 'subj-blr-cs301',
        faculty_id: blrFaculty.id,
        branch_id: 'Bangalore',
        batch_id: 'batch-blr-cs-2026',
        topics_covered: [{ topic_id: 'top-a', completion_percentage: 100 }],
        topics_remaining: ['top-b'],
        classwork_status: 'completed',
        homework_status: 'given',
        date: '2026-09-18',
        duration_hours: 1.5,
        status: 'completed',
        created_at: new Date().toISOString(),
      };

      // Authorized for own session
      expect(canFacultyEditSessionLog(gzbFaculty, mockGzbLog)).toBe(true);
      expect(canFacultyEditSessionLog(blrFaculty, mockBlrLog)).toBe(true);

      // Denied for cross-campus or other faculty sessions
      expect(canFacultyEditSessionLog(gzbFaculty, mockBlrLog)).toBe(false);
      expect(canFacultyEditSessionLog(blrFaculty, mockGzbLog)).toBe(false);
    });

    it('getSubjectsForUser strictly restricts faculty to their assigned campus and subjects', () => {
      const radhikaSubs = getSubjectsForUser(gzbFaculty);
      expect(radhikaSubs.length).toBeGreaterThan(0);
      expect(radhikaSubs.every((s) => s.branch_id === 'Ghaziabad')).toBe(true);
      expect(radhikaSubs.some((s) => s.branch_id === 'Bangalore')).toBe(false);
      expect(radhikaSubs.some((s) => s.branch_id === 'Jaipur')).toBe(false);

      const anandSubs = getSubjectsForUser(blrFaculty);
      expect(anandSubs.length).toBeGreaterThan(0);
      expect(anandSubs.every((s) => s.branch_id === 'Bangalore')).toBe(true);
      expect(anandSubs.some((s) => s.branch_id === 'Ghaziabad')).toBe(false);

      const vikramSubs = getSubjectsForUser(jprFaculty);
      expect(vikramSubs.length).toBeGreaterThan(0);
      expect(vikramSubs.every((s) => s.branch_id === 'Jaipur')).toBe(true);
      expect(vikramSubs.some((s) => s.branch_id === 'Ghaziabad')).toBe(false);
    });

    it('getExaminationsForUser strictly isolates faculty to their campus exams', () => {
      const radhikaExams = getExaminationsForUser(gzbFaculty);
      expect(radhikaExams.every((e) => (e.branch_id || 'Ghaziabad') === 'Ghaziabad')).toBe(true);
      expect(radhikaExams.some((e) => e.branch_id === 'Bangalore')).toBe(false);
    });

    it('getBatchesForUser strictly isolates faculty to their campus batches', () => {
      const radhikaBatches = getBatchesForUser(gzbFaculty);
      expect(radhikaBatches.every((b) => (b.branch_id || b.campus_id) === 'Ghaziabad')).toBe(true);
      expect(radhikaBatches.some((b) => b.branch_id === 'Bangalore')).toBe(false);
    });
  });
});
