import React, { useState, useMemo, useEffect } from 'react';
import {
  getBranches,
  getExaminations,
  getExaminationsForUser,
  getSubjects,
  getSubjectsForUser,
  getTopics,
  getSemesters,
  getHolidays,
  getTimetable,
  saveExamination,
  getBatches,
} from '../../services/storage';
import { calculateExamReadiness } from '../../utils/calculations';
import { Examination, ExamReadinessCalculation, BranchId, AcademicTrackId } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { MetricCard } from '../common/MetricCard';
import { Modal } from '../common/Modal';
import { useAuth } from '../../services/authContext';
import {
  GraduationCap,
  Calendar,
  AlertTriangle,
  Clock,
  BookOpen,
  CheckCircle2,
  Plus,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  FileText,
  Building2,
  Lock,
} from 'lucide-react';

export const ExamReadinessDashboard: React.FC = () => {
  const { currentUser, isAdmin, isCampusManager, isFaculty } = useAuth();
  const branches = getBranches();

  const userAssignedBranch = (currentUser?.branch_id || currentUser?.campus_id) as BranchId | undefined;
  const initialBranch: BranchId | 'all' = !isAdmin && userAssignedBranch ? userAssignedBranch : 'all';

  const [selectedBranch, setSelectedBranch] = useState<BranchId | 'all'>(initialBranch);
  const [selectedTrack, setSelectedTrack] = useState<AcademicTrackId | 'all'>('all');

  useEffect(() => {
    if (!isAdmin && userAssignedBranch) {
      setSelectedBranch(userAssignedBranch);
    }
  }, [currentUser, isAdmin, userAssignedBranch]);

  // Use scoped examinations and subjects based on authenticated user
  const examinations = useMemo(() => {
    if (!currentUser || isAdmin) return getExaminations();
    return getExaminationsForUser(currentUser);
  }, [currentUser, isAdmin]);

  const subjects = useMemo(() => {
    if (!currentUser || isAdmin) return getSubjects();
    return getSubjectsForUser(currentUser);
  }, [currentUser, isAdmin]);
  const topics = getTopics();
  const semesters = getSemesters();
  const allHolidays = getHolidays();
  const allTimetable = getTimetable();
  const batches = getBatches();

  // Filter examinations by branch and track
  const filteredExaminations = useMemo(() => {
    return examinations.filter((exam) => {
      const sub = subjects.find((s) => s.id === exam.subject_id);
      const examBranch = exam.branch_id || sub?.branch_id;
      const examTrack = exam.academic_track || sub?.academic_track;

      const matchBranch = selectedBranch === 'all' || examBranch === selectedBranch;
      const matchTrack = selectedTrack === 'all' || examTrack === selectedTrack;
      return matchBranch && matchTrack;
    });
  }, [examinations, subjects, selectedBranch, selectedTrack]);

  const [selectedExamId, setSelectedExamId] = useState<string>('');

  useEffect(() => {
    if (filteredExaminations.length > 0) {
      if (!filteredExaminations.some((e) => e.id === selectedExamId)) {
        setSelectedExamId(filteredExaminations[0].id);
      }
    } else {
      setSelectedExamId('');
    }
  }, [filteredExaminations, selectedExamId]);

  // New exam modal state
  const [isNewExamModalOpen, setIsNewExamModalOpen] = useState(false);
  const [newExamSubjectId, setNewExamSubjectId] = useState(subjects[0]?.id || '');
  const [newExamName, setNewExamName] = useState('');
  const [newExamDate, setNewExamDate] = useState('2026-10-15');
  const [newExamTopicIds, setNewExamTopicIds] = useState<string[]>([]);

  const currentDateStr = '2026-09-18';

  // Calculate exam readiness for all filtered exams using branch-specific calendar & slots
  const examReadinessList: ExamReadinessCalculation[] = useMemo(() => {
    return filteredExaminations
      .map((exam) => {
        const sub = subjects.find((s) => s.id === exam.subject_id);
        if (!sub) return null;
        const examBranch = exam.branch_id || sub.branch_id;
        const sem =
          semesters.find((s) => s.batch_id === sub.batch_id) ||
          semesters.find((s) => (s.branch_id || s.campus_id) === examBranch) ||
          semesters[0];

        const holidays = allHolidays.filter(
          (h) => !h.branch_id || (h.branch_id || h.campus_id) === examBranch
        );

        const tt = allTimetable.filter(
          (t) => (t.branch_id || t.campus_id) === examBranch || (!t.branch_id && t.batch_id === sub.batch_id)
        );

        return calculateExamReadiness(
          exam.id,
          exam.name,
          exam.exam_date,
          sub,
          topics,
          exam.syllabus_scope_topic_ids,
          currentDateStr,
          sem,
          holidays,
          tt
        );
      })
      .filter(Boolean) as ExamReadinessCalculation[];
  }, [filteredExaminations, subjects, semesters, allHolidays, allTimetable, topics, currentDateStr]);

  const selectedReadiness = examReadinessList.find((r) => r.examination_id === selectedExamId);
  const selectedExam = examinations.find((e) => e.id === selectedExamId);
  const selectedSubject = subjects.find((s) => s.id === selectedExam?.subject_id);
  const examSubjectTopics = topics.filter((t) => t.subject_id === selectedExam?.subject_id);

  // Topics for the subject currently picked in the "Add Exam" modal
  const currentModalSubjectTopics = topics.filter((t) => t.subject_id === newExamSubjectId);

  const handleCreateExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const sub = subjects.find((s) => s.id === newExamSubjectId);
    const batch = batches.find((b) => b.id === sub?.batch_id);

    saveExamination(
      {
        batch_id: sub?.batch_id || '',
        subject_id: newExamSubjectId,
        branch_id: sub?.branch_id || (selectedBranch !== 'all' ? selectedBranch : undefined),
        academic_track: sub?.academic_track || batch?.academic_track,
        name: newExamName,
        exam_date: newExamDate,
        syllabus_scope_topic_ids: newExamTopicIds,
      },
      currentUser
    );

    setIsNewExamModalOpen(false);
    setNewExamName('');
  };

  const handleToggleModalTopic = (topicId: string) => {
    if (newExamTopicIds.includes(topicId)) {
      setNewExamTopicIds(newExamTopicIds.filter((id) => id !== topicId));
    } else {
      setNewExamTopicIds([...newExamTopicIds, topicId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8DC] shadow-[0_2px_12px_rgba(28,25,23,0.03)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] px-3 py-0.5 rounded-full bg-[#FEF9E7] text-[#614800] border border-[#FBE69B] font-medium">
                Assessment Readiness
              </span>
              <span className="text-xs text-[#71695F]">
                • Mid-Term & Final Examination Windows
              </span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#1C1917] tracking-tight">
              Exam Readiness & Scope Projection
            </h1>
            <p className="text-xs text-[#71695F] mt-1 max-w-2xl leading-relaxed">
              Assessment preparedness evaluates only topics assigned to examination syllabus scopes against scheduled class slots.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Branch Context */}
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs">
              <Building2 className="w-3.5 h-3.5 text-[#71695F]" />
              <span className="font-medium text-[#71695F]">Branch:</span>
              {!isAdmin ? (
                <div className="flex items-center gap-1.5 font-semibold text-[#1C1917]">
                  <span>{userAssignedBranch || (selectedBranch !== 'all' ? selectedBranch : 'Assigned Campus')}</span>
                  {isCampusManager && <Lock className="w-3 h-3 text-[#B08800]" />}
                </div>
              ) : (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value as any)}
                  className="bg-transparent font-semibold text-[#1C1917] focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Branches</option>
                  <option value="Ghaziabad">Ghaziabad (AKTU)</option>
                  <option value="Bangalore">Bangalore (VTU)</option>
                  <option value="Jaipur">Jaipur (Jagannath Univ)</option>
                </select>
              )}
            </div>

            {/* Track Filter */}
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs">
              <span className="font-medium text-[#71695F]">Track:</span>
              <select
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value as any)}
                className="bg-transparent font-semibold text-[#1C1917] focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Tracks</option>
                <option value="Mirai Track">Mirai Track</option>
                <option value="University Track">University Track</option>
              </select>
            </div>

            {(isAdmin || isCampusManager) && (
              <button
                onClick={() => {
                  setNewExamTopicIds(currentModalSubjectTopics.map((t) => t.id));
                  setIsNewExamModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#2C2825] text-white font-medium text-xs shadow-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#FBE69B]" />
                <span>Configure Exam</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Exam Tabs / Selector */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
        {filteredExaminations.map((exam) => {
          const readiness = examReadinessList.find((r) => r.examination_id === exam.id);
          const isSelected = exam.id === selectedExamId;
          const status = readiness?.status || 'ON TRACK';

          return (
            <button
              key={exam.id}
              onClick={() => setSelectedExamId(exam.id)}
              className={`px-4 py-3 rounded-2xl text-left border transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-white border-[#1C1917] shadow-md ring-2 ring-[#1C1917]/10'
                  : 'bg-white/80 border-[#EFE8DC] hover:bg-white text-[#71695F]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-xs text-[#1C1917]">{exam.name}</span>
                <StatusBadge status={status} size="sm" showDetails={false} />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#71695F]">
                {exam.branch_id && (
                  <span className="font-medium text-[#701C2F] bg-[#FDF2F4] px-1.5 rounded border border-[#F8CAD4]">
                    {exam.branch_id}
                  </span>
                )}
                <span>Date: {exam.exam_date}</span>
                <span>• {readiness ? `${readiness.coverage_percentage.toFixed(0)}% Ready` : '0%'}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Exam Detailed Metrics */}
      {selectedReadiness && (
        <div className="space-y-6">
          {/* Exam Summary Header */}
          <div className="warm-card p-6 border-l-4 border-l-[#1C1917]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-medium text-[#71695F] block mb-1">
                  Active Examination Assessment
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917]">
                  {selectedReadiness.examination_name} ({selectedReadiness.subject_name})
                </h2>
                <p className="text-xs text-[#71695F] mt-1">
                  Exam Date: <strong>{selectedReadiness.exam_date}</strong> • Evaluation Date: <strong>{currentDateStr}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] text-[#71695F] font-medium block">Readiness Level</span>
                  <StatusBadge status={selectedReadiness.status} size="lg" />
                </div>
              </div>
            </div>
          </div>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Exam Scope Hours"
              value={`${selectedReadiness.total_in_scope_hours.toFixed(1)}h`}
              subtitle="Hours in examination syllabus"
              icon={<BookOpen className="w-4 h-4 text-[#1C1917]" />}
              highlightColor="charcoal"
            />

            <MetricCard
              title="Covered Syllabus"
              value={`${selectedReadiness.covered_hours.toFixed(1)}h`}
              subtitle={`${selectedReadiness.coverage_percentage.toFixed(1)}% delivered`}
              icon={<CheckCircle2 className="w-4 h-4 text-[#1E4627]" />}
              highlightColor="green"
              progress={{
                value: selectedReadiness.coverage_percentage,
                color: 'bg-[#4ADE80]',
              }}
            />

            <MetricCard
              title="Remaining Hours"
              value={`${selectedReadiness.remaining_hours.toFixed(1)}h`}
              subtitle="Hours needed before exam"
              icon={<Clock className="w-4 h-4 text-[#614800]" />}
              highlightColor="yellow"
            />

            <MetricCard
              title="Available Slots"
              value={`${selectedReadiness.available_teaching_hours.toFixed(1)}h`}
              subtitle={`Buffer ratio: ${selectedReadiness.buffer_ratio === 999 ? 'Inf' : selectedReadiness.buffer_ratio.toFixed(2)}`}
              icon={<Calendar className="w-4 h-4 text-[#193B6D]" />}
              highlightColor="blue"
            />
          </div>

          {/* Topics in Scope and Urgent Attention */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 warm-card p-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#EFE8DC]">
                <div>
                  <h3 className="font-semibold text-[#1C1917] text-base">
                    Topics Assigned to Examination Scope
                  </h3>
                  <p className="text-xs text-[#71695F]">
                    Only topics explicitly tagged in this examination scope affect the readiness calculation.
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-[#1C1917]">
                  {selectedExam?.syllabus_scope_topic_ids.length} Topics
                </span>
              </div>

              <div className="divide-y divide-[#EFE8DC] mt-3">
                {examSubjectTopics
                  .filter((t) => selectedExam?.syllabus_scope_topic_ids.includes(t.id))
                  .map((top) => {
                    const isCompleted = top.status === 'completed';
                    const isOverdue = top.planned_date && top.planned_date < currentDateStr && !isCompleted;

                    return (
                      <div
                        key={top.id}
                        className="py-3 flex items-center justify-between gap-4 hover:bg-[#FAF7F0]/30 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs text-[#1C1917]">{top.title}</span>
                            {isOverdue && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FDF2F4] text-[#701C2F] border border-[#F8CAD4]">
                                Overdue
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#71695F]">
                            Planned: {top.planned_hours.toFixed(1)}h • Scheduled Target: {top.planned_date || 'N/A'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-semibold text-[#1C1917] block">
                              {top.completion_percentage}%
                            </span>
                            <span className="text-[10px] text-[#71695F] capitalize">{top.status.replace('_', ' ')}</span>
                          </div>
                          <div className="w-16 bg-[#FAF7F0] border border-[#EFE8DC] rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#4ADE80]"
                              style={{ width: `${top.completion_percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Attention Panel */}
            <div className="warm-card p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-[#1C1917] text-base flex items-center gap-2 pb-3 border-b border-[#EFE8DC]">
                  <AlertTriangle className="w-4 h-4 text-[#E8637E]" />
                  <span>Pending Topics in Exam Scope</span>
                </h3>

                <div className="space-y-3 mt-4">
                  {selectedReadiness.urgent_attention_topics.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-[#EEF7EF] border border-[#C8E8CD] text-center space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-[#4ADE80] mx-auto" />
                      <p className="font-semibold text-[#1E4627] text-xs">Full Syllabus Covered</p>
                      <p className="text-[11px] text-[#1E4627]">
                        All exam scope topics have been delivered with 100% completion.
                      </p>
                    </div>
                  ) : (
                    selectedReadiness.urgent_attention_topics.slice(0, 4).map((top) => (
                      <div
                        key={top.topic_id}
                        className="p-3 rounded-2xl border border-[#EFE8DC] bg-[#FDFBF7] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs text-[#1C1917] truncate max-w-[180px]">
                            {top.title}
                          </span>
                          {top.is_overdue && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#FDF2F4] text-[#701C2F]">
                              Overdue
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#71695F]">
                          <span>Weight: {top.planned_hours.toFixed(1)}h</span>
                          <span className="font-semibold text-[#1C1917]">{top.completion_percentage}% Done</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#EFE8DC] text-xs text-[#71695F]">
                <p>Status uses buffer ratio of available hours to remaining syllabus hours.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Exam Modal */}
      <Modal
        isOpen={isNewExamModalOpen}
        onClose={() => setIsNewExamModalOpen(false)}
        title="Configure Examination Window"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateExamSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Course / Subject
            </label>
            <select
              value={newExamSubjectId}
              onChange={(e) => {
                setNewExamSubjectId(e.target.value);
                const subTopics = topics.filter((t) => t.subject_id === e.target.value);
                setNewExamTopicIds(subTopics.map((t) => t.id));
              }}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-medium"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}: {s.name} ({s.academic_track})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#1C1917] mb-1">
                Examination Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mid-Term Assessment 2"
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
              />
            </div>

            <div>
              <label className="block font-medium text-[#1C1917] mb-1">
                Exam Date
              </label>
              <input
                type="date"
                required
                value={newExamDate}
                onChange={(e) => setNewExamDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
              />
            </div>
          </div>

          {/* Topics Scope Checklist */}
          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Select Syllabus Topics Included in Exam Scope
            </label>
            <div className="border border-[#EFE8DC] rounded-2xl p-3 bg-[#FAF7F0]/40 max-h-48 overflow-y-auto space-y-2">
              {currentModalSubjectTopics.map((top) => (
                <label
                  key={top.id}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={newExamTopicIds.includes(top.id)}
                    onChange={() => handleToggleModalTopic(top.id)}
                    className="rounded border-[#EFE8DC] text-[#1C1917]"
                  />
                  <span className="font-medium text-[#1C1917] text-xs">
                    {top.sequence_order}. {top.title} ({top.planned_hours}h)
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE8DC]">
            <button
              type="button"
              onClick={() => setIsNewExamModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#EFE8DC] bg-white text-[#1C1917] font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#2C2825] text-white font-medium cursor-pointer"
            >
              Save Exam Window
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
