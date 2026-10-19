import React from 'react';
import { Link } from 'react-router-dom';
import { StudentQuizAttempt } from '../../types';
import {
  X,
  CheckCircle2,
  XCircle,
  Sparkles,
  BookOpen,
  ArrowRight,
  RotateCcw,
  GraduationCap,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface DailyRecapResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempt: StudentQuizAttempt;
  subjectName?: string;
  onRetake?: () => void;
}

export const DailyRecapResultsModal: React.FC<DailyRecapResultsModalProps> = ({
  isOpen,
  onClose,
  attempt,
  subjectName,
}) => {
  if (!isOpen) return null;

  const score = attempt.score ?? 0;
  const total = attempt.total_questions || 5;
  const pct = attempt.percentage ?? Math.round((score / total) * 100);
  const results = attempt.question_results || [];
  const weakTopics = attempt.weak_topics || [];

  const optionLetters = ['A', 'B', 'C', 'D'];

  const performanceTier =
    pct >= 80
      ? { label: 'High Comprehension', color: 'bg-[#EEF7EF] text-[#1E4627] border-[#C8E8CD]', desc: 'Outstanding grasp of today’s syllabus lecture objectives.' }
      : pct >= 60
      ? { label: 'Steady Progress', color: 'bg-[#FEF9E7] text-[#614800] border-[#FBE69B]', desc: 'Solid recall with a few nuanced concepts worth reviewing.' }
      : { label: 'Revision Recommended', color: 'bg-[#FDF2F4] text-[#701C2F] border-[#F8CAD4]', desc: 'Review the identified syllabus units before the upcoming exam.' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#FDFBF7] rounded-3xl border border-[#EFE8DC] shadow-[0_16px_50px_rgba(28,25,23,0.18)] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 px-6 border-b border-[#EFE8DC] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#EEF7EF] border border-[#C8E8CD] flex items-center justify-center text-[#1E4627] shadow-2xs">
              <Sparkles className="w-4 h-4 text-[#2A5C37]" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#1E4627] uppercase tracking-wider">
                Recap Performance & Review
              </span>
              <h2 className="text-sm sm:text-base font-bold text-[#1C1917]">
                {subjectName || 'Daily 5-Minute Recap'} • {attempt.date}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#71695F] hover:text-[#1C1917] hover:bg-[#FAF7F0] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6 flex-1">
          {/* Score & Summary Banner */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-white to-[#FAF7F0] border border-[#EFE8DC] shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-[#71695F] font-medium block">
                  Final Recap Score
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-bold font-serif text-[#1C1917]">
                    {score} / {total}
                  </span>
                  <span className="text-sm font-semibold text-[#71695F]">
                    ({pct}%)
                  </span>
                </div>
              </div>

              <div className="sm:text-right">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${performanceTier.color}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{performanceTier.label}</span>
                </span>
                <p className="text-[11px] text-[#71695F] mt-1.5 max-w-xs">
                  {performanceTier.desc}
                </p>
              </div>
            </div>

            <div className="w-full bg-[#EFE8DC] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct >= 80 ? 'bg-[#4ADE80]' : pct >= 60 ? 'bg-[#FACC15]' : 'bg-[#F87171]'
                }`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>

          {/* Topics Needing Revision Alert Box */}
          {weakTopics.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#FEF9E7] border border-[#FBE69B] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#614800]">
                <AlertTriangle className="w-4 h-4 text-[#B08800]" />
                <span>Recommended Syllabus Revision ({weakTopics.length} Concepts)</span>
              </div>
              <p className="text-xs text-[#71695F] leading-relaxed">
                Concepts flagged for quick review based on today's recap:
              </p>
              <div className="space-y-1.5 pt-1">
                {weakTopics.map((wt, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white/90 border border-[#FBE69B] text-xs flex items-start justify-between gap-2"
                  >
                    <div>
                      <span className="font-semibold text-[#1C1917] block">
                        • {wt.topic_title || 'Syllabus Topic'}
                      </span>
                      <span className="text-[11px] text-[#71695F] block mt-0.5">
                        {wt.concept}
                      </span>
                    </div>
                    {wt.topic_id && (
                      <Link
                        to={`/lesson-plan?topicId=${wt.topic_id}`}
                        onClick={onClose}
                        className="shrink-0 text-[11px] font-semibold text-[#854D0E] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Syllabus</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#EFE8DC]">
              <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                Question Explanations & Answers
              </h3>
              <span className="text-xs text-[#71695F]">
                {score} of {total} correct
              </span>
            </div>

            <div className="space-y-4">
              {results.map((res, qIdx) => {
                const isCorrect = res.is_correct;
                return (
                  <div
                    key={res.question_id || qIdx}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isCorrect
                        ? 'bg-white border-[#C8E8CD]'
                        : 'bg-white border-[#F8CAD4]'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isCorrect ? (
                          <div className="w-5 h-5 rounded-full bg-[#EEF7EF] border border-[#C8E8CD] text-[#1E4627] flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2A5C37]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#FDF2F4] border border-[#F8CAD4] text-[#701C2F] flex items-center justify-center shrink-0">
                            <XCircle className="w-3.5 h-3.5 text-[#701C2F]" />
                          </div>
                        )}
                        <span className="text-xs font-bold text-[#1C1917]">
                          Question {qIdx + 1}
                        </span>
                        {res.topic_title && (
                          <span className="text-[11px] text-[#71695F] px-2 py-0.5 rounded-md bg-[#FAF7F0] border border-[#EFE8DC]">
                            {res.topic_title}
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isCorrect
                            ? 'bg-[#EEF7EF] text-[#1E4627]'
                            : 'bg-[#FDF2F4] text-[#701C2F]'
                        }`}
                      >
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    {/* Question Prompt */}
                    <p className="text-sm font-semibold text-[#1C1917] mt-2.5 leading-relaxed">
                      {res.question_text}
                    </p>

                    {/* Options Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {res.options.map((optText, optIdx) => {
                        const isStudentChoice = res.selected_option_index === optIdx;
                        const isCorrectOption = res.correct_option_index === optIdx;

                        let styleClasses = 'bg-[#FAF7F0] border-[#EFE8DC] text-[#71695F]';
                        if (isCorrectOption) {
                          styleClasses = 'bg-[#EEF7EF] border-[#C8E8CD] text-[#1E4627] font-semibold';
                        } else if (isStudentChoice && !isCorrect) {
                          styleClasses = 'bg-[#FDF2F4] border-[#F8CAD4] text-[#701C2F] font-semibold';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${styleClasses}`}
                          >
                            <span className="w-5 h-5 rounded-md bg-white/80 border border-current flex items-center justify-center text-[10px] font-bold shrink-0">
                              {optionLetters[optIdx]}
                            </span>
                            <span className="truncate flex-1">{optText}</span>
                            {isCorrectOption && (
                              <span className="text-[10px] font-bold text-[#2A5C37] shrink-0">
                                ✓ Correct
                              </span>
                            )}
                            {isStudentChoice && !isCorrect && (
                              <span className="text-[10px] font-bold text-[#701C2F] shrink-0">
                                ✗ Your choice
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation Box */}
                    {res.explanation && (
                      <div className="mt-3.5 p-3 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs space-y-1">
                        <span className="font-semibold text-[#1C1917] flex items-center gap-1.5 text-[11px]">
                          <BookOpen className="w-3.5 h-3.5 text-[#B08800]" />
                          <span>Why this answer is correct:</span>
                        </span>
                        <p className="text-[#5C554D] leading-relaxed text-[11px]">
                          {res.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 px-6 border-t border-[#EFE8DC] bg-white flex items-center justify-between">
          <span className="text-xs text-[#71695F]">
            Optional checkpoint • Stored in your recap history
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1C1917] text-white hover:bg-[#2C2724] text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            Done for Today
          </button>
        </div>
      </div>
    </div>
  );
};
