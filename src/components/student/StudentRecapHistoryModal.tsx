import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import { StudentQuizAttempt } from '../../types';
import { getStudentRecapHistory } from '../../services/storage';
import { DailyRecapResultsModal } from './DailyRecapResultsModal';
import {
  X,
  History,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  BookOpen,
  Award,
} from 'lucide-react';

interface StudentRecapHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentRecapHistoryModal: React.FC<StudentRecapHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const [selectedAttempt, setSelectedAttempt] = useState<StudentQuizAttempt | null>(null);

  if (!isOpen || !currentUser) return null;

  const { attempts, stats } = getStudentRecapHistory(currentUser);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-xl bg-[#FDFBF7] rounded-3xl border border-[#EFE8DC] shadow-[0_16px_50px_rgba(28,25,23,0.18)] flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 px-6 border-b border-[#EFE8DC] bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#FEF9E7] border border-[#FBE69B] flex items-center justify-center text-[#854D0E] shadow-2xs">
                <History className="w-4 h-4 text-[#B08800]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#1C1917]">
                  My 5-Minute Recap History
                </h2>
                <p className="text-xs text-[#71695F]">
                  Review previous daily quiz attempts and flagged revision topics
                </p>
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

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 p-4 px-6 bg-[#FAF7F0] border-b border-[#EFE8DC] text-center">
            <div className="p-2.5 rounded-xl bg-white border border-[#EFE8DC] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-[#8C8275] block">
                Completed
              </span>
              <span className="text-lg font-bold text-[#1C1917]">
                {stats.completedCount}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#EFE8DC] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-[#8C8275] block">
                Avg Score
              </span>
              <span className="text-lg font-bold text-[#1C1917]">
                {stats.averageScore} / 5
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#EFE8DC] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-[#8C8275] block">
                Avg Accuracy
              </span>
              <span className="text-lg font-bold text-[#2A5C37]">
                {stats.averagePercentage}%
              </span>
            </div>
          </div>

          {/* Attempts List */}
          <div className="p-6 overflow-y-auto space-y-3 flex-1">
            {attempts.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#EFE8DC] flex items-center justify-center mx-auto text-[#71695F] shadow-2xs">
                  <History className="w-5 h-5 text-[#8C8275]" />
                </div>
                <h4 className="text-sm font-bold text-[#1C1917]">No Past Recaps Yet</h4>
                <p className="text-xs text-[#71695F] max-w-xs mx-auto">
                  Complete today's 5-minute recap on your dashboard to begin building your personal revision archive.
                </p>
              </div>
            ) : (
              attempts.map((att) => {
                const pct = att.percentage ?? 0;
                return (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => setSelectedAttempt(att)}
                    className="w-full text-left p-4 rounded-2xl bg-white border border-[#EFE8DC] hover:border-[#1C1917]/30 hover:shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#1C1917]">
                          {att.date}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FAF7F0] border border-[#EFE8DC] text-[#71695F]">
                          Daily Recap
                        </span>
                      </div>
                      <p className="text-xs text-[#71695F] truncate">
                        Completed at {att.completed_at ? new Date(att.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Earlier'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#1C1917] block">
                          {att.score} / {att.total_questions || 5}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            pct >= 80 ? 'text-[#2A5C37]' : pct >= 60 ? 'text-[#854D0E]' : 'text-[#701C2F]'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#8C8275] group-hover:text-[#1C1917] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 px-6 border-t border-[#EFE8DC] bg-white flex items-center justify-between">
            <span className="text-[11px] text-[#71695F]">
              Low-pressure personal learning logs
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1C1917] text-white hover:bg-[#2C2724] text-xs font-semibold cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {selectedAttempt && (
        <DailyRecapResultsModal
          isOpen={true}
          onClose={() => setSelectedAttempt(null)}
          attempt={selectedAttempt}
        />
      )}
    </>
  );
};
