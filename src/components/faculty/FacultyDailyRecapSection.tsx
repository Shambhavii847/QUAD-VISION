import React, { useState, useEffect } from 'react';
import { useAuth } from '../../services/authContext';
import {
  DailyRecapQuiz,
  DailyRecapQuestion,
  Subject,
  Batch,
  Topic,
} from '../../types';
import {
  getQuizzesForFaculty,
  getSubjectsForUser,
  getBatchesForUser,
  getTopics,
  createOrUpdateDailyRecapQuiz,
  subscribeToDataChanges,
} from '../../services/storage';
import {
  Sparkles,
  Plus,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  AlertCircle,
  X,
  Send,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';

export const FacultyDailyRecapSection: React.FC = () => {
  const { currentUser, isAdmin, isCampusManager, isFaculty } = useAuth();

  const [quizzes, setQuizzes] = useState<DailyRecapQuiz[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [previewQuiz, setPreviewQuiz] = useState<DailyRecapQuiz | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<DailyRecapQuiz | null>(null);

  const loadQuizzes = () => {
    if (!currentUser) return;
    setQuizzes(getQuizzesForFaculty(currentUser));
  };

  useEffect(() => {
    loadQuizzes();
    const unsubscribe = subscribeToDataChanges(loadQuizzes);
    return () => unsubscribe();
  }, [currentUser]);

  if (!currentUser || (!isFaculty && !isAdmin && !isCampusManager)) return null;

  const accessibleSubjects = getSubjectsForUser(currentUser);
  const accessibleBatches = getBatchesForUser(currentUser);
  const allTopics = getTopics();

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white border border-[#EFE8DC] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FEF9E7] border border-[#FBE69B] flex items-center justify-center text-[#854D0E] shadow-2xs shrink-0">
            <Sparkles className="w-5 h-5 text-[#B08800]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#1C1917]">
                Daily 5-Minute Recaps
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF7F0] border border-[#EFE8DC] text-[#71695F]">
                {quizzes.length} Scheduled
              </span>
            </div>
            <p className="text-xs text-[#71695F] mt-0.5">
              Publish 5-question comprehension quizzes aligned with your teaching syllabus
            </p>
          </div>
        </div>

        {(isFaculty || isAdmin) && (
          <button
            type="button"
            onClick={() => {
              setEditingQuiz(null);
              setIsEditorOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#1C1917] text-[#FBE69B] hover:bg-[#2C2724] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Create Daily Recap</span>
          </button>
        )}
      </div>

      {/* Quizzes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {quizzes.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white/70 rounded-2xl border border-dashed border-[#D8CFC0] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] flex items-center justify-center mx-auto text-[#71695F]">
              <Sparkles className="w-4 h-4 text-[#8C8275]" />
            </div>
            <h4 className="text-xs font-bold text-[#1C1917]">No Daily Recaps Published Yet</h4>
            <p className="text-[11px] text-[#71695F] max-w-sm mx-auto">
              Create a 5-minute recap for your assigned courses to help students consolidate daily concepts.
            </p>
          </div>
        ) : (
          quizzes.map((q) => (
            <div
              key={q.id}
              className="p-4 rounded-2xl bg-white border border-[#EFE8DC] shadow-2xs hover:border-[#1C1917]/25 transition-all flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#854D0E] bg-[#FEF9E7] border border-[#FBE69B] px-2 py-0.5 rounded-md">
                    {q.date}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold capitalize ${
                      q.status === 'published'
                        ? 'bg-[#EEF7EF] text-[#1E4627] border border-[#C8E8CD]'
                        : 'bg-[#FAF7F0] text-[#71695F] border border-[#EFE8DC]'
                    }`}
                  >
                    {q.status}
                  </span>
                </div>

                <h4 className="font-bold text-sm text-[#1C1917] line-clamp-1">{q.title}</h4>
                <p className="text-xs text-[#71695F] line-clamp-1">
                  {q.subject_name} ({q.subject_code})
                </p>

                <div className="flex items-center gap-2 text-[11px] text-[#8C8275] pt-1">
                  <span>{q.questions.length} Questions</span>
                  <span>•</span>
                  <span>~{q.estimated_minutes} mins</span>
                  <span>•</span>
                  <span>{q.branch_id}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#EFE8DC] text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewQuiz(q)}
                  className="font-medium text-[#71695F] hover:text-[#1C1917] flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>

                {(isFaculty || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuiz(q);
                      setIsEditorOpen(true);
                    }}
                    className="font-medium text-[#854D0E] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <DailyRecapEditorModal
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingQuiz(null);
            loadQuizzes();
          }}
          initialQuiz={editingQuiz}
          accessibleSubjects={accessibleSubjects}
          accessibleBatches={accessibleBatches}
          topics={allTopics}
        />
      )}

      {/* Preview Modal */}
      {previewQuiz && (
        <DailyRecapPreviewModal
          isOpen={true}
          onClose={() => setPreviewQuiz(null)}
          quiz={previewQuiz}
        />
      )}
    </div>
  );
};

// ==========================================
// Daily Recap Editor Modal Component
// ==========================================

interface DailyRecapEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuiz: DailyRecapQuiz | null;
  accessibleSubjects: Subject[];
  accessibleBatches: Batch[];
  topics: Topic[];
}

const DailyRecapEditorModal: React.FC<DailyRecapEditorModalProps> = ({
  isOpen,
  onClose,
  initialQuiz,
  accessibleSubjects,
  accessibleBatches,
  topics,
}) => {
  const { currentUser } = useAuth();

  const [title, setTitle] = useState(initialQuiz?.title || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    initialQuiz?.subject_id || accessibleSubjects[0]?.id || ''
  );
  const [selectedBatchId, setSelectedBatchId] = useState(
    initialQuiz?.batch_id || accessibleBatches[0]?.id || ''
  );
  const [date, setDate] = useState(initialQuiz?.date || '2026-10-19');
  const [status, setStatus] = useState<'draft' | 'published'>(
    initialQuiz?.status || 'published'
  );

  // Default questions (create 5 slots)
  const [questions, setQuestions] = useState<DailyRecapQuestion[]>(() => {
    if (initialQuiz?.questions && initialQuiz.questions.length > 0) {
      return initialQuiz.questions;
    }
    return Array.from({ length: 5 }, (_, idx) => ({
      id: `q-new-${idx + 1}`,
      quiz_id: '',
      question_text: '',
      options: ['', '', '', ''],
      correct_option_index: 0,
      explanation: '',
      subject_id: accessibleSubjects[0]?.id || '',
      topic_id: '',
      topic_title: '',
      difficulty: 'medium',
      question_type: 'understanding',
    }));
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const currentSubject = accessibleSubjects.find((s) => s.id === selectedSubjectId);
  const subjectTopics = topics.filter((t) => t.subject_id === selectedSubjectId);

  const handleQuestionChange = (
    index: number,
    field: keyof DailyRecapQuestion,
    value: any
  ) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    const newOptions = [...updated[qIndex].options];
    newOptions[optIndex] = text;
    updated[qIndex] = { ...updated[qIndex], options: newOptions };
    setQuestions(updated);
  };

  const handleSave = () => {
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Please enter a title for the daily recap.');
      return;
    }

    if (!selectedSubjectId) {
      setErrorMessage('Please select a subject.');
      return;
    }

    const payload: Partial<DailyRecapQuiz> = {
      ...(initialQuiz ? { id: initialQuiz.id } : {}),
      title,
      subject_id: selectedSubjectId,
      subject_name: currentSubject?.name || 'Subject',
      subject_code: currentSubject?.code || 'CS',
      branch_id: currentSubject?.branch_id || (currentUser.branch_id as any),
      batch_id: selectedBatchId,
      academic_track: currentSubject?.academic_track || 'Mirai Track',
      date,
      estimated_minutes: 5,
      status,
      questions: questions.map((q) => {
        const matchingTopic = subjectTopics.find((t) => t.id === q.topic_id);
        return {
          ...q,
          subject_id: selectedSubjectId,
          topic_title: matchingTopic?.title || q.topic_title || '',
        };
      }),
    };

    const res = createOrUpdateDailyRecapQuiz(payload, currentUser);
    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to save quiz.');
    }
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#FDFBF7] rounded-3xl border border-[#EFE8DC] shadow-[0_16px_50px_rgba(28,25,23,0.18)] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 px-6 border-b border-[#EFE8DC] bg-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#1C1917]">
              {initialQuiz ? 'Edit Daily Recap Quiz' : 'Create Daily 5-Minute Recap'}
            </h3>
            <p className="text-xs text-[#71695F]">
              Design 5 multiple-choice questions aligned with your syllabus topic
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#71695F] hover:text-[#1C1917] hover:bg-[#FAF7F0] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 p-4 rounded-2xl bg-white border border-[#EFE8DC]">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-[#1C1917] block mb-1">
                Recap Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Binary Search Trees & Balancing Rotations 5-Min Recap"
                className="w-full text-xs p-2.5 rounded-xl border border-[#EFE8DC] bg-[#FAF7F0] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1C1917]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#1C1917] block mb-1">
                Schedule Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#EFE8DC] bg-[#FAF7F0] focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#1C1917] block mb-1">
                Course / Subject *
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#EFE8DC] bg-[#FAF7F0] focus:bg-white focus:outline-hidden cursor-pointer"
              >
                {accessibleSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#1C1917] block mb-1">
                Target Batch *
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#EFE8DC] bg-[#FAF7F0] focus:bg-white focus:outline-hidden cursor-pointer"
              >
                {accessibleBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#1C1917] block mb-1">
                Publication Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#EFE8DC] bg-[#FAF7F0] focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="published">Published (Live for Students)</option>
                <option value="draft">Draft (Faculty Only)</option>
              </select>
            </div>
          </div>

          {/* 5 Questions Section */}
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-[#EFE8DC]">
              <span className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                Recap Questions ({questions.length} Questions)
              </span>
              <span className="text-xs text-[#71695F]">
                4 options each with 1 designated correct answer
              </span>
            </div>

            {questions.map((q, qIdx) => (
              <div
                key={q.id || qIdx}
                className="p-5 rounded-2xl bg-white border border-[#EFE8DC] shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1917] px-2.5 py-1 rounded-lg bg-[#FAF7F0] border border-[#EFE8DC]">
                    Question {qIdx + 1}
                  </span>

                  <div className="flex items-center gap-2">
                    <select
                      value={q.topic_id || ''}
                      onChange={(e) => handleQuestionChange(qIdx, 'topic_id', e.target.value)}
                      className="text-[11px] p-1.5 rounded-lg border border-[#EFE8DC] bg-[#FAF7F0] max-w-[200px]"
                    >
                      <option value="">-- Syllabus Topic --</option>
                      {subjectTopics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>

                    <select
                      value={q.difficulty}
                      onChange={(e) => handleQuestionChange(qIdx, 'difficulty', e.target.value)}
                      className="text-[11px] p-1.5 rounded-lg border border-[#EFE8DC] bg-[#FAF7F0]"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Prompt input */}
                <div>
                  <label className="text-[11px] font-semibold text-[#71695F] block mb-1">
                    Question Text *
                  </label>
                  <textarea
                    rows={2}
                    value={q.question_text}
                    onChange={(e) => handleQuestionChange(qIdx, 'question_text', e.target.value)}
                    placeholder="Enter question prompt..."
                    className="w-full text-xs p-2.5 rounded-xl border border-[#EFE8DC] bg-[#FAF7F0] focus:bg-white focus:outline-hidden"
                  />
                </div>

                {/* 4 Options */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-[#71695F] block">
                    Answer Options (Click radio button to mark correct option)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((optText, optIdx) => {
                      const isCorrect = q.correct_option_index === optIdx;
                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                            isCorrect ? 'bg-[#EEF7EF] border-[#C8E8CD]' : 'bg-[#FAF7F0] border-[#EFE8DC]'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct-opt-${qIdx}`}
                            checked={isCorrect}
                            onChange={() => handleQuestionChange(qIdx, 'correct_option_index', optIdx)}
                            className="cursor-pointer text-[#1C1917]"
                          />
                          <span className="text-xs font-bold text-[#71695F]">{optionLetters[optIdx]}.</span>
                          <input
                            type="text"
                            value={optText}
                            onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                            placeholder={`Option ${optionLetters[optIdx]}`}
                            className="w-full text-xs bg-transparent focus:outline-hidden"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="text-[11px] font-semibold text-[#71695F] block mb-1">
                    Explanation for Correct Answer (Shown to students after submission) *
                  </label>
                  <textarea
                    rows={2}
                    value={q.explanation}
                    onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                    placeholder="Explain why this option is correct and provide learning hints..."
                    className="w-full text-xs p-2.5 rounded-xl border border-[#EFE8DC] bg-[#FAF7F0] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            ))}
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#FDF2F4] border border-[#F8CAD4] text-[#701C2F] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 px-6 border-t border-[#EFE8DC] bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#EFE8DC] text-xs font-semibold text-[#71695F] hover:bg-[#FAF7F0] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#1C1917] text-[#FBE69B] hover:bg-[#2C2724] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Save & Publish Recap</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Daily Recap Preview Modal
// ==========================================

const DailyRecapPreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  quiz: DailyRecapQuiz;
}> = ({ isOpen, onClose, quiz }) => {
  if (!isOpen) return null;
  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#FDFBF7] rounded-3xl border border-[#EFE8DC] shadow-[0_16px_50px_rgba(28,25,23,0.18)] flex flex-col max-h-[92vh] overflow-hidden">
        <div className="p-4 sm:p-5 px-6 border-b border-[#EFE8DC] bg-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#854D0E] uppercase tracking-wider">
              Faculty Preview
            </span>
            <h3 className="text-base font-bold text-[#1C1917]">{quiz.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#71695F] hover:text-[#1C1917] hover:bg-[#FAF7F0] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {quiz.questions.map((q, idx) => (
            <div key={q.id || idx} className="p-4 rounded-2xl bg-white border border-[#EFE8DC] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1C1917]">Question {idx + 1}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF7F0] text-[#71695F]">
                  {q.difficulty} • {q.question_type}
                </span>
              </div>
              <p className="text-sm font-semibold text-[#1C1917]">{q.question_text}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {q.options.map((opt, optIdx) => {
                  const isCorrect = q.correct_option_index === optIdx;
                  return (
                    <div
                      key={optIdx}
                      className={`p-2 rounded-xl border text-xs flex items-center gap-2 ${
                        isCorrect ? 'bg-[#EEF7EF] border-[#C8E8CD] text-[#1E4627] font-semibold' : 'bg-[#FAF7F0] border-[#EFE8DC]'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-md bg-white border border-current flex items-center justify-center text-[10px] font-bold">
                        {optionLetters[optIdx]}
                      </span>
                      <span className="truncate">{opt}</span>
                      {isCorrect && <span className="ml-auto text-[10px] font-bold text-[#2A5C37]">✓ Answer</span>}
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <div className="p-2.5 rounded-xl bg-[#FAF7F0] text-[11px] text-[#71695F]">
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 px-6 border-t border-[#EFE8DC] bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1C1917] text-white text-xs font-semibold cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
