import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getBranches,
  getBatches,
  getSemesters,
  getHolidays,
  getSubjects,
  getSubjectsForUser,
  getTopics,
  getTimetable,
} from '../../services/storage';
import {
  calculateSubjectProgress,
  isTopicOverdue,
} from '../../utils/calculations';
import { BranchId, AcademicTrackId } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  TrendingUp,
  Filter,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ChevronDown,
  Building2,
  Lock,
} from 'lucide-react';

export const SubjectProgressDashboard: React.FC = () => {
  const { currentUser, isCampusManager, isFaculty, isAdmin } = useAuth();
  const branches = getBranches();

  const userAssignedBranch = (currentUser?.branch_id || currentUser?.campus_id) as BranchId | undefined;
  const initialBranch: BranchId = !isAdmin && userAssignedBranch ? userAssignedBranch : (userAssignedBranch || 'Ghaziabad');

  const [selectedBranch, setSelectedBranch] = useState<BranchId>(initialBranch);
  const [selectedTrack, setSelectedTrack] = useState<AcademicTrackId>(
    (currentUser?.assigned_track as AcademicTrackId) || 'Mirai Track'
  );
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  useEffect(() => {
    if (!isAdmin && userAssignedBranch) {
      setSelectedBranch(userAssignedBranch);
    }
  }, [currentUser, isAdmin, userAssignedBranch]);

  const batches = getBatches();
  const semesters = getSemesters();
  const allHolidays = getHolidays();
  const subjects = getSubjects();
  const topics = getTopics();
  const allTimetable = getTimetable();

  const currentBranchRecord = branches.find((b) => b.id === selectedBranch) || branches[0];

  const currentBatch = useMemo(() => {
    return (
      batches.find(
        (b) => (b.branch_id === selectedBranch || b.campus_id === selectedBranch) && b.academic_track === selectedTrack
      ) || batches[0]
    );
  }, [batches, selectedBranch, selectedTrack]);

  const currentSemester = useMemo(() => {
    return (
      semesters.find((s) => s.batch_id === currentBatch?.id) ||
      semesters.find((s) => (s.branch_id === selectedBranch || s.campus_id === selectedBranch) && s.academic_track === selectedTrack) ||
      semesters[0]
    );
  }, [semesters, currentBatch, selectedBranch, selectedTrack]);

  const currentDateStr = '2026-09-18';
  const targetDateStr = currentSemester?.end_date || '2026-11-30';

  const branchHolidays = useMemo(() => {
    return allHolidays.filter(
      (h) => !h.branch_id || h.branch_id === selectedBranch || h.campus_id === selectedBranch
    );
  }, [allHolidays, selectedBranch]);

  const branchTimetable = useMemo(() => {
    return allTimetable.filter(
      (t) => t.branch_id === selectedBranch || t.campus_id === selectedBranch || t.batch_id === currentBatch?.id
    );
  }, [allTimetable, selectedBranch, currentBatch]);

  const batchSubjects = useMemo(() => {
    if (isFaculty) {
      const mySubjects = getSubjectsForUser(currentUser);
      return mySubjects.filter((s) => !s.academic_track || s.academic_track === selectedTrack);
    }
    return subjects.filter((s) => {
      const matchBatch = s.batch_id === currentBatch?.id;
      const matchBranch = !s.branch_id || s.branch_id === selectedBranch;
      return matchBatch && matchBranch;
    });
  }, [subjects, currentBatch, selectedBranch, isFaculty, currentUser, selectedTrack]);

  const progressList = useMemo(() => {
    if (!currentSemester) return [];
    return batchSubjects.map((sub) =>
      calculateSubjectProgress(
        sub,
        topics,
        currentDateStr,
        targetDateStr,
        currentSemester,
        branchHolidays,
        branchTimetable
      )
    );
  }, [batchSubjects, topics, currentDateStr, targetDateStr, currentSemester, branchHolidays, branchTimetable]);

  const filteredList = useMemo(() => {
    if (selectedSubjectFilter === 'all') return progressList;
    return progressList.filter((p) => p.subject_id === selectedSubjectFilter);
  }, [progressList, selectedSubjectFilter]);

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8DC] shadow-[0_2px_12px_rgba(28,25,23,0.03)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] px-3 py-0.5 rounded-full bg-[#FEF9E7] text-[#614800] border border-[#FBE69B] font-medium">
                Progression Analysis
              </span>
              <span className="text-xs text-[#71695F]">
                • {currentBranchRecord?.name} ({currentBranchRecord?.university_short_name})
              </span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#1C1917] tracking-tight">
              Subject Progression & Buffer Ratio
            </h1>
            <p className="text-xs text-[#71695F] mt-1 max-w-2xl leading-relaxed">
              Curriculum delivery pace, remaining syllabus hours, and buffer calculations for {currentBranchRecord?.university_affiliation}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs">
              <Building2 className="w-3.5 h-3.5 text-[#71695F]" />
              <span className="font-medium text-[#71695F]">Branch:</span>
              {!isAdmin ? (
                <div className="flex items-center gap-1.5 font-semibold text-[#1C1917]">
                  <span>{selectedBranch}</span>
                  {isCampusManager && <Lock className="w-3 h-3 text-[#B08800]" />}
                </div>
              ) : (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value as BranchId)}
                  className="bg-transparent font-semibold text-[#1C1917] focus:outline-hidden cursor-pointer"
                >
                  <option value="Ghaziabad">Ghaziabad (AKTU)</option>
                  <option value="Bangalore">Bangalore (VTU)</option>
                  <option value="Jaipur">Jaipur (Jagannath Univ)</option>
                </select>
              )}
            </div>

            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs">
              <span className="font-medium text-[#71695F]">Track:</span>
              <select
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value as AcademicTrackId)}
                className="bg-transparent font-semibold text-[#1C1917] focus:outline-hidden cursor-pointer"
              >
                <option value="Mirai Track">Mirai Track</option>
                <option value="University Track">University Track ({currentBranchRecord?.university_short_name})</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Deep Dive Cards */}
      <div className="space-y-6">
        {filteredList.map((calc) => {
          const subTopics = topics
            .filter((t) => t.subject_id === calc.subject_id)
            .sort((a, b) => a.sequence_order - b.sequence_order);

          return (
            <div
              key={calc.subject_id}
              className="warm-card overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-6 border-b border-[#EFE8DC] bg-[#FDFBF7] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-[#1C1917] text-[#FBE69B]">
                      {calc.subject_code}
                    </span>
                    <h2 className="text-lg font-bold text-[#1C1917] tracking-tight">
                      {calc.subject_name}
                    </h2>
                  </div>
                  <p className="text-xs text-[#71695F]">
                    Faculty In Charge: <strong>{calc.faculty_name}</strong> • Scheduled Target Finish:{' '}
                    <strong>{calc.planned_completion_date || targetDateStr}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={calc.status} size="lg" />
                </div>
              </div>

              {/* 5 Subject Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-6 bg-white border-b border-[#EFE8DC]">
                <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC]">
                  <span className="text-xs font-normal text-[#71695F] block">
                    In-Scope Syllabus
                  </span>
                  <span className="text-xl font-bold text-[#1C1917] mt-1 block">
                    {calc.total_in_scope_hours.toFixed(1)}h
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#EEF7EF] border border-[#C8E8CD]">
                  <span className="text-xs font-normal text-[#1E4627] block">
                    Covered Hours
                  </span>
                  <span className="text-xl font-bold text-[#1E4627] mt-1 block">
                    {calc.covered_hours.toFixed(1)}h
                  </span>
                  <span className="text-[11px] text-[#1E4627] font-medium block mt-0.5">
                    ({calc.coverage_percentage.toFixed(1)}%)
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FEF9E7] border border-[#FBE69B]">
                  <span className="text-xs font-normal text-[#614800] block">
                    Remaining Hours
                  </span>
                  <span className="text-xl font-bold text-[#614800] mt-1 block">
                    {calc.remaining_hours.toFixed(1)}h
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F0F6FD] border border-[#CCE0F9]">
                  <span className="text-xs font-normal text-[#193B6D] block">
                    Available Slots
                  </span>
                  <span className="text-xl font-bold text-[#193B6D] mt-1 block">
                    {calc.available_teaching_hours.toFixed(1)}h
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC]">
                  <span className="text-xs font-normal text-[#71695F] block">
                    Buffer Ratio
                  </span>
                  <span className="text-xl font-bold text-[#1C1917] mt-1 block">
                    {calc.buffer_ratio === 999 ? 'Inf' : calc.buffer_ratio.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-[#71695F] block mt-0.5">
                    Target &ge; 1.15
                  </span>
                </div>
              </div>

              {/* Topics Breakdown List */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#1C1917] text-sm">
                    Topic Breakdown & Scheduled Delivery Dates
                  </h3>
                  <span className="text-xs text-[#71695F]">
                    {subTopics.length} Curriculum Topics
                  </span>
                </div>

                <div className="divide-y divide-[#EFE8DC] border border-[#EFE8DC] rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF7F0] text-[#71695F] font-semibold border-b border-[#EFE8DC]">
                      <tr>
                        <th className="py-2.5 px-3.5">#</th>
                        <th className="py-2.5 px-3.5">Topic Title</th>
                        <th className="py-2.5 px-3.5">Planned Hours</th>
                        <th className="py-2.5 px-3.5">Scheduled Date</th>
                        <th className="py-2.5 px-3.5">Status</th>
                        <th className="py-2.5 px-3.5 text-right">Completion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE8DC]/70">
                      {subTopics.map((top) => {
                        const isOverdue = isTopicOverdue(top, currentDateStr);
                        return (
                          <tr key={top.id} className="hover:bg-[#FAF7F0]/40 transition-colors">
                            <td className="py-2.5 px-3.5 text-[#9C9488]">{top.sequence_order}</td>
                            <td className="py-2.5 px-3.5 font-medium text-[#1C1917]">
                              <div>{top.title}</div>
                              {top.status === 'skipped' && (
                                <span className="text-[11px] text-[#9C9488] italic">
                                  Excluded from scope
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-[#71695F]">
                              {top.planned_hours.toFixed(1)}h
                            </td>
                            <td className="py-2.5 px-3.5 whitespace-nowrap">
                              <span className={`text-xs ${
                                isOverdue ? 'text-[#701C2F] font-semibold' : 'text-[#1C1917]'
                              }`}>
                                {top.planned_date || 'TBD'}
                              </span>
                              {isOverdue && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#FDF2F4] text-[#701C2F] border border-[#F8CAD4]">
                                  Overdue
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 capitalize text-[#71695F]">
                              {top.status.replace('_', ' ')}
                            </td>
                            <td className="py-2.5 px-3.5 text-right">
                              <span className="font-semibold text-[#1C1917]">
                                {top.completion_percentage}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
