import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../services/authContext';
import { setRawSessionForTesting, clearActiveSession } from '../services/authService';
import {
  UserProfile,
  DailyRecapQuiz,
  StudentQuizAttempt,
} from '../types';
import {
  getDailyRecapQuizForStudent,
  startOrResumeQuizAttempt,
  saveQuizAttemptProgress,
  submitQuizAttempt,
  getStudentRecapHistory,
  getQuizzesForFaculty,
  createOrUpdateDailyRecapQuiz,
  getDailyRecapQuizzes,
  saveDailyRecapQuizzes,
  getStudentQuizAttempts,
  saveStudentQuizAttempts,
  resetToDemoData,
} from '../services/storage';
import {
  INITIAL_DAILY_RECAP_QUIZZES,
  INITIAL_STUDENT_QUIZ_ATTEMPTS,
} from '../data/mockData';
import { DailyRecapCard } from '../components/student/DailyRecapCard';
import { DailyRecapQuizModal } from '../components/student/DailyRecapQuizModal';
import { DailyRecapResultsModal } from '../components/student/DailyRecapResultsModal';

describe('Daily 5-Minute Recap Feature Verification', () => {
  const mockAmanStudent: UserProfile = {
    id: 'user-student-aman',
    name: 'Aman Gupta (Ghaziabad Student)',
    email: 'aman.gzb@msot.edu',
    role: 'student',
    branch_id: 'Ghaziabad',
    campus_id: 'Ghaziabad',
    assigned_batch_ids: ['batch-gzb-mirai'],
  };

  const mockDeepaStudent: UserProfile = {
    id: 'user-student-deepa',
    name: 'Deepa Swaminathan (Bangalore Student)',
    email: 'deepa.blr@msot.edu',
    role: 'student',
    branch_id: 'Bangalore',
    campus_id: 'Bangalore',
    assigned_batch_ids: ['batch-blr-vtu'],
  };

  const mockRadhikaFaculty: UserProfile = {
    id: 'user-fac-radhika',
    name: 'Dr. Radhika Sharma',
    email: 'radhika.gzb@msot.edu',
    role: 'faculty',
    branch_id: 'Ghaziabad',
    campus_id: 'Ghaziabad',
    assigned_track: 'Mirai Track',
    assigned_subject_ids: ['subj-gzb-cs301'],
  };

  const mockAdmin: UserProfile = {
    id: 'user-admin',
    name: 'Institutional Administrator',
    email: 'admin@msot.edu',
    role: 'admin',
  };

  const loginAs = (user: UserProfile) => {
    setRawSessionForTesting({
      token: 'test-sess-' + user.id,
      userId: user.id,
      role: user.role,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });
  };

  beforeEach(() => {
    resetToDemoData();
    clearActiveSession();
  });

  describe('1. Student Experience & Security', () => {
    it('returns today\'s scheduled quiz for student\'s batch with answers safely stripped', () => {
      const { quiz, attempt } = getDailyRecapQuizForStudent(mockAmanStudent, '2026-10-19');

      expect(quiz).not.toBeNull();
      expect(quiz?.subject_code).toBe('CS301');
      expect(quiz?.batch_id).toBe('batch-gzb-mirai');
      expect(quiz?.estimated_minutes).toBe(5);
      expect(quiz?.total_questions).toBe(5);

      // CRITICAL SECURITY REQUIREMENT:
      // None of the questions in the student view payload should have correct_option_index or explanation!
      quiz?.questions.forEach((q: any) => {
        expect(q.correct_option_index).toBeUndefined();
        expect(q.explanation).toBeUndefined();
        expect(q.options).toHaveLength(4);
      });
    });

    it('isolates quiz content by campus and curriculum track', () => {
      // Ghaziabad Mirai Student receives Ghaziabad Mirai quiz
      const amanRes = getDailyRecapQuizForStudent(mockAmanStudent, '2026-10-19');
      expect(amanRes.quiz?.branch_id).toBe('Ghaziabad');
      expect(amanRes.quiz?.academic_track).toBe('Mirai Track');
      expect(amanRes.quiz?.subject_name).toContain('Mirai');

      // Bangalore VTU Student receives VTU-affiliated quiz
      const deepaRes = getDailyRecapQuizForStudent(mockDeepaStudent, '2026-10-19');
      expect(deepaRes.quiz?.branch_id).toBe('Bangalore');
      expect(deepaRes.quiz?.academic_track).toBe('University Track');
      expect(deepaRes.quiz?.title).toContain('VTU');
      expect(deepaRes.quiz?.subject_code).toBe('BCS301');
    });

    it('returns null if no quiz is scheduled for the student\'s batch on that date', () => {
      const res = getDailyRecapQuizForStudent(mockAmanStudent, '2026-12-25');
      expect(res.quiz).toBeNull();
    });

    it('does not allow non-students to call student quiz endpoint', () => {
      const res = getDailyRecapQuizForStudent(mockRadhikaFaculty, '2026-10-19');
      expect(res.quiz).toBeNull();
    });
  });

  describe('2. Quiz Attempt Lifecycle: Start, Progress & Resuming', () => {
    it('creates an in-progress attempt and resumes saved answers without data loss', () => {
      const { quiz } = getDailyRecapQuizForStudent(mockAmanStudent, '2026-10-19');
      expect(quiz).not.toBeNull();

      // 1. Start attempt
      const startRes = startOrResumeQuizAttempt(quiz!.id, mockAmanStudent);
      expect(startRes.error).toBeUndefined();
      expect(startRes.attempt.status).toBe('in_progress');
      expect(startRes.attempt.student_id).toBe(mockAmanStudent.id);

      const attemptId = startRes.attempt.id;

      // 2. Student answers Question 1 and Question 2
      const q1Id = quiz!.questions[0].id;
      const q2Id = quiz!.questions[1].id;
      const progressRes = saveQuizAttemptProgress(
        attemptId,
        { [q1Id]: 1, [q2Id]: 2 },
        mockAmanStudent
      );
      expect(progressRes.success).toBe(true);
      expect(progressRes.attempt?.answers[q1Id]).toBe(1);
      expect(progressRes.attempt?.answers[q2Id]).toBe(2);

      // 3. Student leaves and resumes later -> same attempt with answers is retrieved
      const resumeRes = startOrResumeQuizAttempt(quiz!.id, mockAmanStudent);
      expect(resumeRes.attempt.id).toBe(attemptId);
      expect(resumeRes.attempt.answers[q1Id]).toBe(1);
      expect(resumeRes.attempt.answers[q2Id]).toBe(2);
    });

    it('blocks students from starting a quiz belonging to another campus', () => {
      const blrQuiz = getDailyRecapQuizzes().find((q) => q.branch_id === 'Bangalore');
      expect(blrQuiz).toBeDefined();

      const res = startOrResumeQuizAttempt(blrQuiz!.id, mockAmanStudent);
      expect(res.error).toContain('Access denied');
    });
  });

  describe('3. Server-Side Submission & Duplicate Prevention', () => {
    it('validates submission, calculates score securely, and attaches explanations and weak topics', () => {
      const { quiz } = getDailyRecapQuizForStudent(mockAmanStudent, '2026-10-19');
      const startRes = startOrResumeQuizAttempt(quiz!.id, mockAmanStudent);
      const attemptId = startRes.attempt.id;

      // Questions for quiz-gzb-mirai-today:
      // q-gzb-1: correct is 1
      // q-gzb-2: correct is 2
      // q-gzb-3: correct is 1
      // q-gzb-4: correct is 0
      // q-gzb-5: correct is 1
      const studentAnswers = {
        'q-gzb-1': 1, // correct
        'q-gzb-2': 2, // correct
        'q-gzb-3': 0, // incorrect (selected 0, correct 1)
        'q-gzb-4': 0, // correct
        'q-gzb-5': 1, // correct
      };

      const submitRes = submitQuizAttempt(attemptId, studentAnswers, mockAmanStudent);
      expect(submitRes.success).toBe(true);

      const completed = submitRes.attempt!;
      expect(completed.status).toBe('completed');
      expect(completed.score).toBe(4);
      expect(completed.total_questions).toBe(5);
      expect(completed.percentage).toBe(80);

      // Result includes full question details and explanations
      expect(completed.question_results).toHaveLength(5);
      const q3Result = completed.question_results?.find((r) => r.question_id === 'q-gzb-3');
      expect(q3Result?.is_correct).toBe(false);
      expect(q3Result?.explanation).toContain('LIFO property');

      // Generates weak topic for revision
      expect(completed.weak_topics?.length).toBeGreaterThan(0);
      expect(completed.weak_topics?.[0].topic_title).toContain('Stack Invariants');
    });

    it('prevents duplicate submissions from altering score or duplicating attempts', () => {
      const { quiz } = getDailyRecapQuizForStudent(mockAmanStudent, '2026-10-19');
      const startRes = startOrResumeQuizAttempt(quiz!.id, mockAmanStudent);
      const attemptId = startRes.attempt.id;

      const firstSubmit = submitQuizAttempt(
        attemptId,
        { 'q-gzb-1': 1, 'q-gzb-2': 2, 'q-gzb-3': 1, 'q-gzb-4': 0, 'q-gzb-5': 1 },
        mockAmanStudent
      );
      expect(firstSubmit.attempt?.score).toBe(5);

      // Attempt second submission with different answers -> must NOT change score
      const secondSubmit = submitQuizAttempt(
        attemptId,
        { 'q-gzb-1': 0, 'q-gzb-2': 0, 'q-gzb-3': 0, 'q-gzb-4': 0, 'q-gzb-5': 0 },
        mockAmanStudent
      );
      expect(secondSubmit.attempt?.score).toBe(5); // Preserved original score
    });
  });

  describe('4. Faculty Management & Permission Constraints', () => {
    it('allows faculty to create and publish quizzes for assigned subjects', () => {
      const newQuizData: Partial<DailyRecapQuiz> = {
        title: 'Heaps & Priority Queues Fast Recap',
        subject_id: 'subj-gzb-cs301',
        branch_id: 'Ghaziabad',
        batch_id: 'batch-gzb-mirai',
        date: '2026-10-20',
        status: 'published',
        questions: [
          {
            id: 'q-heap-1',
            quiz_id: '',
            question_text: 'What is the time complexity to insert into a binary min-heap?',
            options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
            correct_option_index: 1,
            explanation: 'Percolate up takes at most the height of the tree, which is O(log n).',
            subject_id: 'subj-gzb-cs301',
            difficulty: 'easy',
            question_type: 'recall',
          },
        ],
      };

      const res = createOrUpdateDailyRecapQuiz(newQuizData, mockRadhikaFaculty);
      expect(res.success).toBe(true);
      expect(res.quiz?.title).toBe('Heaps & Priority Queues Fast Recap');
    });

    it('blocks faculty from creating quizzes for unauthorized subjects', () => {
      const unauthorizedQuiz: Partial<DailyRecapQuiz> = {
        title: 'VTU Pointers Test',
        subject_id: 'subj-blr-bcs301', // VTU Bangalore subject!
        branch_id: 'Bangalore',
        questions: [
          {
            id: 'q-test',
            quiz_id: '',
            question_text: 'Test?',
            options: ['A', 'B', 'C', 'D'],
            correct_option_index: 0,
            explanation: 'Exp',
            subject_id: 'subj-blr-bcs301',
            difficulty: 'easy',
            question_type: 'recall',
          },
        ],
      };

      const res = createOrUpdateDailyRecapQuiz(unauthorizedQuiz, mockRadhikaFaculty);
      expect(res.success).toBe(false);
      expect(res.error).toContain('not authorized');
    });

    it('validates question formatting (options count, explanations)', () => {
      const invalidQuiz: Partial<DailyRecapQuiz> = {
        title: 'Invalid Quiz',
        subject_id: 'subj-gzb-cs301',
        questions: [
          {
            id: 'q-bad',
            quiz_id: '',
            question_text: 'Question with 2 options only',
            options: ['Yes', 'No'], // Invalid: must have 4 options
            correct_option_index: 0,
            explanation: 'Exp',
            subject_id: 'subj-gzb-cs301',
            difficulty: 'easy',
            question_type: 'recall',
          },
        ],
      };

      const res = createOrUpdateDailyRecapQuiz(invalidQuiz, mockRadhikaFaculty);
      expect(res.success).toBe(false);
      expect(res.error).toContain('must have exactly 4 answer options');
    });

    it('Admin retains authority to view and manage all quizzes across branches', () => {
      const adminQuizzes = getQuizzesForFaculty(mockAdmin);
      expect(adminQuizzes.length).toBeGreaterThanOrEqual(3);

      const campuses = new Set(adminQuizzes.map((q) => q.branch_id));
      expect(campuses.has('Ghaziabad')).toBe(true);
      expect(campuses.has('Bangalore')).toBe(true);
      expect(campuses.has('Jaipur')).toBe(true);
    });
  });

  describe('5. UI Component Rendering', () => {
    it('renders DailyRecapCard on Student Dashboard with status and start action', () => {
      loginAs(mockAmanStudent);
      render(
        <AuthProvider>
          <MemoryRouter>
            <DailyRecapCard />
          </MemoryRouter>
        </AuthProvider>
      );

      expect(screen.getByText(/Daily 5-Minute Recap/i)).toBeInTheDocument();
      expect(screen.getByText(/Trees & Hierarchical Balancing/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Start Today's Recap/i })).toBeInTheDocument();
    });

    it('renders DailyRecapResultsModal with score, review, and syllabus links', () => {
      const mockCompletedAttempt: StudentQuizAttempt = {
        id: 'att-test',
        quiz_id: 'quiz-gzb-mirai-today',
        student_id: mockAmanStudent.id,
        student_name: mockAmanStudent.name,
        batch_id: 'batch-gzb-mirai',
        branch_id: 'Ghaziabad',
        subject_id: 'subj-gzb-cs301',
        date: '2026-10-19',
        status: 'completed',
        started_at: '2026-10-19T09:00:00Z',
        completed_at: '2026-10-19T09:04:30Z',
        answers: { 'q-1': 1 },
        score: 4,
        total_questions: 5,
        percentage: 80,
        question_results: [
          {
            question_id: 'q-1',
            question_text: 'In an AVL tree, what is the maximum height difference?',
            options: ['0', '1', '2', 'Log₂(n)'],
            selected_option_index: 1,
            correct_option_index: 1,
            is_correct: true,
            explanation: 'Balance factor must be in {-1, 0, 1}.',
            topic_id: 'top-gzb-3',
            topic_title: 'Binary Search Tree Balancing',
          },
        ],
        weak_topics: [],
      };

      render(
        <MemoryRouter>
          <DailyRecapResultsModal
            isOpen={true}
            onClose={() => {}}
            attempt={mockCompletedAttempt}
            subjectName="Data Structures & Algorithms"
          />
        </MemoryRouter>
      );

      expect(screen.getByText(/Final Recap Score/i)).toBeInTheDocument();
      expect(screen.getByText(/4 \/ 5/i)).toBeInTheDocument();
      expect(screen.getByText(/High Comprehension/i)).toBeInTheDocument();
      expect(screen.getByText(/Why this answer is correct:/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Done for Today/i })).toBeInTheDocument();
    });
  });
});
