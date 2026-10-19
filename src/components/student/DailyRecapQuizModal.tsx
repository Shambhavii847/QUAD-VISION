import React, { useState, useEffect } from 'react';
import { useAuth } from '../../services/authContext';
import {
  StudentRecapQuizView,
  StudentQuizAttempt,
} from '../../types';
import {
  saveQuizAttemptProgress,
  submitQuizAttempt,
} from '../../services/storage';
import {
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  HelpCircle,
  BookmarkCheck,
} from 'lucide-react';

interface DailyRecapQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: StudentRecapQuizView;
  initialAttempt: StudentQuizAttempt;
  onQuizSubmitted: (attempt: StudentQuizAttempt) => void;
}

export const DailyRecapQuizModal: React.FC<DailyRecapQuizModalProps> = ({
  isOpen,
  onClose,
  quiz,
  initialAttempt,
  onQuizSubmitted,
}) => {
  const { currentUser } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(
    initialAttempt.answers || {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync answers if attempt updates
  useEffect(() => {
    if (initialAttempt?.answers) {
      setAnswers(initialAttempt.answers);
    }
  }, [initialAttempt]);

  if (!isOpen || !currentUser) return null;

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  const handleSelectOption = (optionIndex: number) => {
    if (!currentQuestion) return;
    const nextAnswers = {
      ...answers,
      [currentQuestion.id]: optionIndex,
    };
    setAnswers(nextAnswers);

    // Save in-progress answers automatically so interrupted quizzes can resume
    saveQuizAttemptProgress(initialAttempt.id, nextAnswers, currentUser);
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowConfirmSubmit(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleFinalSubmit = () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = submitQuizAttempt(initialAttempt.id, answers, currentUser);
    setIsSubmitting(false);

    if (result.success && result.attempt) {
      setShowConfirmSubmit(false);
      onQuizSubmitted(result.attempt);
    } else {
      setErrorMessage(result.error || 'Failed to submit quiz attempt.');
    }
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#FDFBF7] rounded-3xl border border-[#EFE8DC] shadow-[0_16px_50px_rgba(28,25,23,0.18)] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 px-6 border-b border-[#EFE8DC] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FEF9E7] border border-[#FBE69B] flex items-center justify-center text-[#854D0E] shadow-2xs">
              <Sparkles className="w-4 h-4 text-[#B08800]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#854D0E] uppercase tracking-wider">
                  Daily 5-Minute Recap
                </span>
                <span className="w-1 h-1 rounded-full bg-[#D8CFC0]" />
                <span className="text-xs text-[#71695F] flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3 text-[#A89F91]" />
                  ~{quiz.estimated_minutes} min
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#1C1917] truncate max-w-md">
                {quiz.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#71695F] hover:text-[#1C1917] hover:bg-[#FAF7F0] transition-colors cursor-pointer"
            title="Save & Close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress & Stepper Bar */}
        <div className="px-6 py-3 bg-[#FAF7F0] border-b border-[#EFE8DC] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#1C1917]">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span className="text-[#8C8275]">
              ({answeredCount} of {totalQuestions} answered)
            </span>
          </div>

          {/* Stepper pills */}
          <div className="flex items-center gap-1.5">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-6 h-6 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center ${
                    isCurrent
                      ? 'bg-[#1C1917] text-white ring-2 ring-[#1C1917]/20 shadow-2xs'
                      : isAnswered
                      ? 'bg-[#EEF7EF] text-[#1E4627] border border-[#C8E8CD]'
                      : 'bg-white text-[#71695F] border border-[#EFE8DC] hover:bg-[#FAF7F0]'
                  }`}
                  title={`Question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Content Area */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6 flex-1">
          {currentQuestion ? (
            <>
              {/* Question Context Pill */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#FAF7F0] border border-[#EFE8DC] text-[11px] font-semibold text-[#71695F]">
                  {quiz.subject_code} • {quiz.subject_name}
                </span>
                {currentQuestion.topic_title && (
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-[#EFE8DC] text-[11px] text-[#71695F] truncate max-w-xs">
                    Topic: {currentQuestion.topic_title}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#F3F4F6] text-[#4B5563]">
                  {currentQuestion.difficulty}
                </span>
              </div>

              {/* Question Prompt */}
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-serif font-bold text-[#1C1917] leading-relaxed">
                  {currentQuestion.question_text}
                </h3>
                <p className="text-xs text-[#8C8275]">
                  Select the single most correct answer below.
                </p>
              </div>

              {/* Options List */}
              <div className="space-y-3">
                {currentQuestion.options.map((optionText, optIdx) => {
                  const isSelected = answers[currentQuestion.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 group ${
                        isSelected
                          ? 'bg-white border-[#1C1917] shadow-sm ring-2 ring-[#1C1917]/15'
                          : 'bg-white/80 border-[#EFE8DC] hover:bg-white hover:border-[#D8CFC0]'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#1C1917] text-white shadow-2xs'
                            : 'bg-[#FAF7F0] border border-[#EFE8DC] text-[#71695F] group-hover:bg-[#EFE8DC]'
                        }`}
                      >
                        {optionLetters[optIdx]}
                      </span>
                      <span
                        className={`text-sm leading-relaxed ${
                          isSelected ? 'font-semibold text-[#1C1917]' : 'text-[#3D3833]'
                        }`}
                      >
                        {optionText}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-[#71695F]">
              No questions found in this quiz.
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#FDF2F4] border border-[#F8CAD4] text-[#701C2F] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Bottom Actions Footer */}
        <div className="p-4 sm:p-5 px-6 border-t border-[#EFE8DC] bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentIndex === 0
                  ? 'bg-[#FAF7F0] border-[#EFE8DC] text-[#B8B0A2] cursor-not-allowed'
                  : 'bg-white border-[#EFE8DC] text-[#1C1917] hover:bg-[#FAF7F0] cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-[#71695F] hover:text-[#1C1917] transition-colors cursor-pointer hidden sm:inline-block"
              title="Resume anytime from dashboard"
            >
              Save & Exit
            </button>
          </div>

          <div className="flex items-center gap-2">
            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-xl bg-[#1C1917] text-white hover:bg-[#2C2724] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(true)}
                className="px-5 py-2 rounded-xl bg-[#1C1917] text-[#FBE69B] hover:bg-[#2C2724] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Recap</span>
              </button>
            )}
          </div>
        </div>

        {/* Confirmation Modal Overlay */}
        {showConfirmSubmit && (
          <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-[#EFE8DC] shadow-xl text-center space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF9E7] border border-[#FBE69B] text-[#854D0E] flex items-center justify-center mx-auto shadow-2xs">
                <BookmarkCheck className="w-6 h-6 text-[#B08800]" />
              </div>

              <div>
                <h4 className="text-base font-bold text-[#1C1917]">
                  Submit Your 5-Minute Recap?
                </h4>
                <p className="text-xs text-[#71695F] mt-1.5 leading-relaxed">
                  You have answered <strong>{answeredCount}</strong> of{' '}
                  <strong>{totalQuestions}</strong> questions.
                  {answeredCount < totalQuestions && (
                    <span className="block text-[#B45309] font-medium mt-1">
                      ⚠️ Note: Unanswered questions will be scored as incorrect.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-[#EFE8DC] bg-white text-xs font-semibold text-[#71695F] hover:bg-[#FAF7F0] cursor-pointer transition-colors"
                >
                  Review Answers
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#1C1917] text-[#FBE69B] hover:bg-[#2C2724] text-xs font-bold cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Scoring...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm & Submit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
