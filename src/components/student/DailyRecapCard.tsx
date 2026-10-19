import React, { useState, useEffect } from 'react';
import { useAuth } from '../../services/authContext';
import {
  StudentRecapQuizView,
  StudentQuizAttempt,
} from '../../types';
import {
  getDailyRecapQuizForStudent,
  startOrResumeQuizAttempt,
  subscribeToDataChanges,
} from '../../services/storage';
import { DailyRecapQuizModal } from './DailyRecapQuizModal';
import { DailyRecapResultsModal } from './DailyRecapResultsModal';
import { StudentRecapHistoryModal } from './StudentRecapHistoryModal';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Play,
  RotateCcw,
  BookOpen,
  ArrowRight,
  History,
  FileCheck2,
  Calendar,
} from 'lucide-react';

export const DailyRecapCard: React.FC = () => {
  const { currentUser } = useAuth();

  const [quizData, setQuizData] = useState<{
    quiz: StudentRecapQuizView | null;
    attempt: StudentQuizAttempt | null;
  }>({ quiz: null, attempt: null });

  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [activeAttempt, setActiveAttempt] = useState<StudentQuizAttempt | null>(null);

  const loadDailyQuiz = () => {
    if (!currentUser) return;
    const res = getDailyRecapQuizForStudent(currentUser);
    setQuizData(res);
    if (res.attempt) {
      setActiveAttempt(res.attempt);
    }
  };

  useEffect(() => {
    loadDailyQuiz();
    const unsubscribe = subscribeToDataChanges(loadDailyQuiz);
    return () => unsubscribe();
  }, [currentUser]);

  if (!currentUser || currentUser.role !== 'student') return null;

  const { quiz, attempt } = quizData;

  const handleStartOrResume = () => {
    if (!quiz) return;
    const res = startOrResumeQuizAttempt(quiz.id, currentUser);
    if (res.attempt) {
      setActiveAttempt(res.attempt);
      setIsQuizModalOpen(true);
    }
  };

  const handleQuizSubmitted = (submittedAttempt: StudentQuizAttempt) => {
    setActiveAttempt(submittedAttempt);
    setIsQuizModalOpen(false);
    setIsResultsModalOpen(true);
    loadDailyQuiz();
  };

  const isCompleted = attempt?.status === 'completed';
  const isInProgress = attempt?.status === 'in_progress';
  const isNotStarted = !attempt || attempt.status === 'not_started';

  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-[#FCFAF6] to-[#FAF5EB] rounded-3xl p-5 sm:p-6 border border-[#EFE8DC] shadow-[0_2px_12px_rgba(28,25,23,0.03)] transition-all">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#FBE69B]/25 via-[#FDE047]/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left Info Column */}
          <div className="space-y-2 max-w-xl">
            {/* Top pill row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#FEF9E7] text-[#854D0E] border border-[#FBE69B]">
                <Sparkles className="w-3.5 h-3.5 text-[#B08800]" />
                <span>Daily 5-Minute Recap</span>
              </span>

              {/* Status Badge */}
              {quiz ? (
                isCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EEF7EF] text-[#1E4627] border border-[#C8E8CD]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Completed</span>
                  </span>
                ) : isInProgress ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF9E7] text-[#614800] border border-[#FBE69B]">
                    <Clock className="w-3 h-3 text-[#B08800]" />
                    <span>In Progress</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF7F0] text-[#71695F] border border-[#EFE8DC]">
                    <span>Not Started</span>
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF7F0] text-[#8C8275] border border-[#EFE8DC]">
                  <span>Rest Day</span>
                </span>
              )}

              <span className="text-[11px] text-[#8C8275]">
                • {currentUser.branch_id || 'Campus'}
              </span>
            </div>

            {/* Title & Subject */}
            {quiz ? (
              <>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-[#1C1917] tracking-tight">
                  {quiz.title}
                </h3>
                <p className="text-xs text-[#71695F] leading-relaxed">
                  Focus: <strong>{quiz.subject_name} ({quiz.subject_code})</strong> • Fast 5-question comprehension check to solidify your daily lecture retention.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-serif font-bold text-[#1C1917] tracking-tight">
                  No Recap Scheduled Today
                </h3>
                <p className="text-xs text-[#71695F] leading-relaxed">
                  Your faculty hasn't published a 5-minute recap for your batch today. You're completely up to date!
                </p>
              </>
            )}

            {/* Quick Specs / Score Summary */}
            {quiz && (
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <span className="flex items-center gap-1.5 text-[#71695F]">
                  <Clock className="w-3.5 h-3.5 text-[#A89F91]" />
                  <span>~{quiz.estimated_minutes} min duration</span>
                </span>
                <span className="w-1 h-1 rounded-full bg-[#D8CFC0]" />
                <span className="text-[#71695F]">
                  <strong>{quiz.total_questions}</strong> Questions
                </span>

                {isCompleted && attempt && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-[#D8CFC0]" />
                    <span className="px-2.5 py-0.5 rounded-md bg-[#EEF7EF] text-[#1E4627] font-bold text-[11px] border border-[#C8E8CD]">
                      Score: {attempt.score} / {attempt.total_questions || 5} ({attempt.percentage}%)
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Action Column */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-2.5 shrink-0">
            {quiz ? (
              isCompleted && attempt ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResultsModalOpen(true)}
                    className="px-4 py-2.5 rounded-2xl bg-[#1C1917] text-white hover:bg-[#2C2724] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <BookOpen className="w-4 h-4 text-[#FBE69B]" />
                    <span>Review Answers</span>
                  </button>
                </div>
              ) : isInProgress ? (
                <button
                  type="button"
                  onClick={handleStartOrResume}
                  className="px-5 py-2.5 rounded-2xl bg-[#1C1917] text-[#FBE69B] hover:bg-[#2C2724] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ring-2 ring-[#B08800]/20"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Resume Today's Recap</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartOrResume}
                  className="px-5 py-2.5 rounded-2xl bg-[#1C1917] text-[#FBE69B] hover:bg-[#2C2724] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Today's Recap</span>
                </button>
              )
            ) : null}

            {/* History link */}
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="text-xs text-[#71695F] hover:text-[#1C1917] flex items-center gap-1.5 transition-colors cursor-pointer py-1"
            >
              <History className="w-3.5 h-3.5 text-[#8C8275]" />
              <span className="font-medium underline decoration-[#EFE8DC] underline-offset-4">
                View Past Recaps
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Quiz Modal */}
      {quiz && activeAttempt && (
        <DailyRecapQuizModal
          isOpen={isQuizModalOpen}
          onClose={() => {
            setIsQuizModalOpen(false);
            loadDailyQuiz();
          }}
          quiz={quiz}
          initialAttempt={activeAttempt}
          onQuizSubmitted={handleQuizSubmitted}
        />
      )}

      {/* Results Modal */}
      {activeAttempt && isCompleted && (
        <DailyRecapResultsModal
          isOpen={isResultsModalOpen}
          onClose={() => setIsResultsModalOpen(false)}
          attempt={activeAttempt}
          subjectName={quiz?.subject_name}
        />
      )}

      {/* Past History Modal */}
      <StudentRecapHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </>
  );
};
