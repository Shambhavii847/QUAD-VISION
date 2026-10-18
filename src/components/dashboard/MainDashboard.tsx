import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getBranches,
  getBatches,
  getSemesters,
  getHolidays,
  getSubjects,
  getTopics,
  getTimetable,
  getExaminations,
  getSessionLogs,
  getMissedSessions,
} from '../../services/storage';
import {
  calculateSubjectProgress,
  determineTrackOverallStatus,
} from '../../utils/calculations';
import { BranchId, AcademicTrackId, SubjectProgressCalculation } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  BookOpen,
  Clock,
  AlertOctagon,
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Building2,
  Lock,
  Plus,
  ArrowUpRight,
  Sparkles,
  BarChart2,
  List,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Link } from 'react-router-dom';

export const MainDashboard: React.FC = () => {
  const { currentUser, isAdmin, isCampusManager } = useAuth();
  const branches = getBranches();

  // Branch isolation: Campus Managers strictly locked to their assigned branch
  const userAssignedBranch = (currentUser?.branch_id || currentUser?.campus_id) as BranchId | undefined;
  const initialBranch: BranchId = isCampusManager && userAssignedBranch ? userAssignedBranch : (userAssignedBranch || 'Ghaziabad');

  const [selectedBranch, setSelectedBranch] = useState<BranchId>(initialBranch);
  const [selectedTrack, setSelectedTrack] = useState<AcademicTrackId>(
    (currentUser?.assigned_track as AcademicTrackId) || 'Mirai Track'
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [showFullChart, setShowFullChart] = useState<boolean>(false);

  // Sync if current user changes
  useEffect(() => {
    if (isCampusManager && userAssignedBranch) {
      setSelectedBranch(userAssignedBranch);
    }
  }, [currentUser, isCampusManager, userAssignedBranch]);

  const batches = getBatches();
  const semesters = getSemesters();
  const allHolidays = getHolidays();
  const subjects = getSubjects();
  const topics = getTopics();
  const allTimetable = getTimetable();
  const examinations = getExaminations();
  const missedSessions = getMissedSessions();
  const sessionLogs = getSessionLogs();

  // Current branch record & university affiliation
  const currentBranchRecord = useMemo(() => {
    return branches.find((b) => b.id === selectedBranch) || branches[0];
  }, [branches, selectedBranch]);

  // Active batch for selected branch & track
  const currentBatch = useMemo(() => {
    return (
      batches.find(
        (b) => (b.branch_id === selectedBranch || b.campus_id === selectedBranch) && b.academic_track === selectedTrack
      ) || batches[0]
    );
  }, [batches, selectedBranch, selectedTrack]);

  // Branch-specific semester calendar
  const currentSemester = useMemo(() => {
    return (
      semesters.find((s) => s.batch_id === currentBatch?.id) ||
      semesters.find((s) => (s.branch_id === selectedBranch || s.campus_id === selectedBranch) && s.academic_track === selectedTrack) ||
      semesters[0]
    );
  }, [semesters, currentBatch, selectedBranch, selectedTrack]);

  // Branch-isolated holidays
  const branchHolidays = useMemo(() => {
    return allHolidays.filter(
      (h) => !h.branch_id || h.branch_id === selectedBranch || h.campus_id === selectedBranch
    );
  }, [allHolidays, selectedBranch]);

  // Branch-isolated timetable
  const branchTimetable = useMemo(() => {
    return allTimetable.filter(
      (t) => t.branch_id === selectedBranch || t.campus_id === selectedBranch || t.batch_id === currentBatch?.id
    );
  }, [allTimetable, selectedBranch, currentBatch]);

  // Current simulation date (Mid-September 2026)
  const currentDateStr = '2026-09-18';
  const semesterEndDate = currentSemester?.end_date || '2026-11-30';

  // Filter subjects belonging to current batch and branch
  const batchSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchBatch = s.batch_id === currentBatch?.id;
      const matchBranch = !s.branch_id || s.branch_id === selectedBranch;
      return matchBatch && matchBranch;
    });
  }, [subjects, currentBatch, selectedBranch]);

  // Compute live progression metrics using strictly branch-isolated calendars & rules
  const subjectProgressList: SubjectProgressCalculation[] = useMemo(() => {
    if (!currentSemester) return [];
    return batchSubjects.map((subj) =>
      calculateSubjectProgress(
        subj,
        topics,
        currentDateStr,
        semesterEndDate,
        currentSemester,
        branchHolidays,
        branchTimetable
      )
    );
  }, [batchSubjects, topics, currentDateStr, semesterEndDate, currentSemester, branchHolidays, branchTimetable]);

  // Select first subject by default
  useEffect(() => {
    if (subjectProgressList.length > 0 && (!selectedSubjectId || !subjectProgressList.some(s => s.subject_id === selectedSubjectId))) {
      setSelectedSubjectId(subjectProgressList[0].subject_id);
    }
  }, [subjectProgressList, selectedSubjectId]);

  const activeSubject = useMemo(() => {
    return subjectProgressList.find((s) => s.subject_id === selectedSubjectId) || subjectProgressList[0];
  }, [subjectProgressList, selectedSubjectId]);

  // Summary aggregations
  const totalSubjects = subjectProgressList.length;
  const totalInScopeHours = subjectProgressList.reduce((acc, s) => acc + s.total_in_scope_hours, 0);
  const totalCoveredHours = subjectProgressList.reduce((acc, s) => acc + s.covered_hours, 0);
  const totalRemainingHours = subjectProgressList.reduce((acc, s) => acc + s.remaining_hours, 0);
  const totalAvailableHours = subjectProgressList.reduce((acc, s) => acc + s.available_teaching_hours, 0);

  const overallCoveragePct =
    totalInScopeHours > 0
      ? (totalCoveredHours / totalInScopeHours) * 100
      : 0;

  // Track Status reflects WORST-performing subject
  const overallTrackStatus = useMemo(() => {
    const statuses = subjectProgressList.map((s) => s.status);
    return determineTrackOverallStatus(statuses);
  }, [subjectProgressList]);

  // Average buffer ratio (finite numbers only)
  const averageBufferRatio = useMemo(() => {
    if (subjectProgressList.length === 0) return 1.25;
    const validBuffers = subjectProgressList.map(s => s.buffer_ratio === 999 ? 2.0 : s.buffer_ratio);
    return (validBuffers.reduce((acc, val) => acc + val, 0) / validBuffers.length);
  }, [subjectProgressList]);

  // Subjects at risk (TIGHT or DANGER)
  const atRiskSubjects = subjectProgressList.filter(
    (s) => s.status === 'DANGER' || s.status === 'TIGHT'
  );

  // Upcoming examinations for this batch & branch
  const batchExams = examinations.filter(
    (e) => e.batch_id === currentBatch?.id || (e.branch_id === selectedBranch && e.academic_track === selectedTrack)
  );

  // Filter recent session logs for this branch
  const recentLogs = useMemo(() => {
    return sessionLogs
      .filter((l) => !l.branch_id || l.branch_id === selectedBranch)
      .slice(0, 3);
  }, [sessionLogs, selectedBranch]);

  // Cross-branch matrix for Admins
  const crossBranchHealthMatrix = useMemo(() => {
    if (!isAdmin) return [];
    return branches.map((b) => {
      const branchBatches = batches.filter((bt) => (bt.branch_id || bt.campus_id) === b.id);
      const branchSubjects = subjects.filter((s) => (s.branch_id || s.campus_id) === b.id);
      const branchMissed = missedSessions.filter((m) => (m.branch_id || m.campus_id) === b.id && m.status !== 'resolved');

      const miraiBatch = branchBatches.find((bt) => bt.academic_track === 'Mirai Track');
      const miraiSubs = branchSubjects.filter((s) => s.batch_id === miraiBatch?.id);
      const miraiSem = semesters.find((s) => s.batch_id === miraiBatch?.id) || semesters[0];
      const miraiProg = miraiSubs.map((s) =>
        calculateSubjectProgress(s, topics, currentDateStr, miraiSem.end_date, miraiSem, allHolidays, allTimetable)
      );
      const miraiStatus = determineTrackOverallStatus(miraiProg.map((p) => p.status));

      return {
        branch: b,
        miraiStatus,
        totalSubjects: branchSubjects.length,
        openEscalations: branchMissed.length,
      };
    });
  }, [isAdmin, branches, batches, subjects, missedSessions, semesters, topics, allHolidays, allTimetable]);

  // Chart data
  const chartData = subjectProgressList.map((s) => ({
    name: s.subject_code,
    fullName: s.subject_name,
    Covered: parseFloat(s.covered_hours.toFixed(2)),
    Remaining: parseFloat(s.remaining_hours.toFixed(2)),
    AvailableFuture: parseFloat(s.available_teaching_hours.toFixed(2)),
    CoveragePct: parseFloat(s.coverage_percentage.toFixed(2)),
  }));

  // Greeting name
  const userName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Educator';

  // Calendar dates for September 2026 (Sept 1 is Tuesday = index 2)
  interface CalendarDay {
    day: number;
    currentMonth: boolean;
    isCurrentDay?: boolean;
    hasSession?: boolean;
  }

  const calendarDays: CalendarDay[] = [
    { day: 30, currentMonth: false, isCurrentDay: false, hasSession: false },
    { day: 31, currentMonth: false, isCurrentDay: false, hasSession: false },
    ...Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      currentMonth: true,
      isCurrentDay: i + 1 === 18,
      hasSession: [4, 8, 11, 14, 15, 18, 22].includes(i + 1),
    })),
    { day: 1, currentMonth: false, isCurrentDay: false, hasSession: false },
    { day: 2, currentMonth: false, isCurrentDay: false, hasSession: false },
    { day: 3, currentMonth: false, isCurrentDay: false, hasSession: false },
  ];

  return (
    <div className="space-y-5 min-w-0 w-full max-w-full pb-8">
      {/* 1. Main Greeting & Capsule Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#161616] tracking-tight">
            Good morning, {userName}
          </h1>
          <p className="text-xs sm:text-sm text-[#736D61] mt-0.5 font-normal">
            {currentBranchRecord?.name} &bull; {currentBatch?.name} &bull; Term ends {semesterEndDate}
          </p>
        </div>

        {/* Filter Capsules */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#EFE8DC] shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-[#78716C]" />
            <span className="text-[11px] font-medium text-[#78716C]">Branch:</span>
            {isCampusManager ? (
              <div className="flex items-center gap-1 text-xs font-semibold text-[#1C1917]">
                <span>{selectedBranch}</span>
                <Lock className="w-3 h-3 text-[#B08800]" />
              </div>
            ) : (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value as BranchId)}
                className="bg-transparent text-xs font-semibold text-[#1C1917] focus:outline-hidden cursor-pointer"
              >
                <option value="Ghaziabad">Ghaziabad (AKTU)</option>
                <option value="Bangalore">Bangalore (VTU)</option>
                <option value="Jaipur">Jaipur (Jagannath)</option>
              </select>
            )}
          </div>

          {/* Track Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#EFE8DC] shadow-2xs">
            <span className="text-[11px] font-medium text-[#78716C]">Track:</span>
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value as AcademicTrackId)}
              className="bg-transparent text-xs font-semibold text-[#1C1917] focus:outline-hidden cursor-pointer"
            >
              <option value="Mirai Track">Mirai Track</option>
              <option value="University Track">University Track</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout inspired by Reference Image */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start min-w-0 w-full">
        {/* ================= LEFT MAIN AREA (8 Cols on Desktop) ================= */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5 min-w-0 w-full">
          {/* 4 Pastel Metric Cards (2x2 Grid) matching Reference Design */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 w-full">
            {/* Card 1: Butter Yellow - Syllabus Scope & Delivered Hours */}
            <div className="card-pastel-yellow relative overflow-hidden rounded-[24px] p-5 shadow-2xs border border-[#F5DE75]/40 transition-all hover:shadow-xs">
              {/* Decorative background watermark */}
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/20 pointer-events-none" />
              
              <div className="flex items-center justify-between gap-2 relative z-10">
                <span className="text-xs font-bold text-[#644B00] uppercase tracking-wider">
                  Delivered Hours
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/80 text-[#161616] border border-[#F5DE75]">
                  {overallCoveragePct.toFixed(0)}% Done
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between relative z-10">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#161616] tracking-tight">
                    {totalCoveredHours.toFixed(1)}h
                  </h3>
                  <p className="text-xs text-[#5A554A] font-medium mt-0.5">
                    of {totalInScopeHours.toFixed(1)}h syllabus scope
                  </p>
                </div>

                {/* Embedded Mini Bar Chart Sparkline */}
                <div className="shrink-0 pl-2">
                  <svg className="w-20 h-10" viewBox="0 0 100 40" fill="none">
                    <rect x="5" y="24" width="8" height="16" rx="4" fill="#161616" opacity="0.18" />
                    <rect x="22" y="16" width="8" height="24" rx="4" fill="#161616" opacity="0.32" />
                    <rect x="39" y="8" width="8" height="32" rx="4" fill="#161616" opacity="0.55" />
                    <rect x="56" y="14" width="8" height="26" rx="4" fill="#161616" opacity="0.4" />
                    <rect x="73" y="4" width="8" height="36" rx="4" fill="#161616" opacity="0.85" />
                    <rect x="90" y="10" width="8" height="30" rx="4" fill="#161616" opacity="0.6" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 2: Bubblegum Pink - Velocity Buffer & Teaching Pace */}
            <div className="card-pastel-pink relative overflow-hidden rounded-[24px] p-5 shadow-2xs border border-[#F6AECB]/40 transition-all hover:shadow-xs">
              <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-white/20 pointer-events-none" />

              <div className="flex items-center justify-between gap-2 relative z-10">
                <span className="text-xs font-bold text-[#701A4A] uppercase tracking-wider">
                  Teaching Velocity
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/80 text-[#701A4A] border border-[#F6AECB]">
                  {averageBufferRatio >= 1.15 ? 'Healthy Pace' : 'Needs Push'}
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between relative z-10">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#161616] tracking-tight">
                    {averageBufferRatio.toFixed(2)}x
                  </h3>
                  <p className="text-xs text-[#5A554A] font-medium mt-0.5">
                    Average course buffer ratio
                  </p>
                </div>

                {/* Embedded Mini Curve Sparkline */}
                <div className="shrink-0 pl-2">
                  <svg className="w-20 h-10" viewBox="0 0 100 40" fill="none">
                    <path
                      d="M4 32 C 22 28, 38 34, 52 16 C 66 2, 78 12, 96 8"
                      stroke="#161616"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="52" cy="16" r="3.5" fill="#161616" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 3: Sage Green - Curriculum Health & Status */}
            <div className="card-pastel-green relative overflow-hidden rounded-[24px] p-5 shadow-2xs border border-[#B8D094]/40 transition-all hover:shadow-xs">
              <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-white/20 pointer-events-none" />

              <div className="flex items-center justify-between gap-2 relative z-10">
                <span className="text-xs font-bold text-[#2D451B] uppercase tracking-wider">
                  Curriculum Health
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-[#2D451B] border border-[#B8D094]">
                  Worst-Subject Rule
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between relative z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-[#161616] tracking-tight">
                      {subjectProgressList.filter(s => s.status === 'ON TRACK').length}/{totalSubjects}
                    </h3>
                    <StatusBadge status={overallTrackStatus} size="sm" showDetails={false} />
                  </div>
                  <p className="text-xs text-[#5A554A] font-medium mt-0.5">
                    Courses strictly on track
                  </p>
                </div>

                {/* Embedded Mini Progress Sparkline */}
                <div className="shrink-0 pl-2">
                  <svg className="w-20 h-10" viewBox="0 0 100 40" fill="none">
                    <path
                      d="M8 28 C 24 12, 46 30, 62 14 C 76 4, 86 16, 94 10"
                      stroke="#161616"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="94" cy="10" r="3.5" fill="#161616" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 4: Powder Blue - Future Timetable Capacity */}
            <div className="card-pastel-blue relative overflow-hidden rounded-[24px] p-5 shadow-2xs border border-[#9EC0EF]/40 transition-all hover:shadow-xs">
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/20 pointer-events-none" />

              <div className="flex items-center justify-between gap-2 relative z-10">
                <span className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">
                  Future Capacity
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/80 text-[#1E3A8A] border border-[#9EC0EF]">
                  {totalRemainingHours.toFixed(1)}h Needed
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between relative z-10">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#161616] tracking-tight">
                    {totalAvailableHours.toFixed(1)}h
                  </h3>
                  <p className="text-xs text-[#5A554A] font-medium mt-0.5">
                    Available teaching slots in calendar
                  </p>
                </div>

                {/* Embedded Step Sparkline */}
                <div className="shrink-0 pl-2">
                  <svg className="w-20 h-10" viewBox="0 0 100 40" fill="none">
                    <path
                      d="M6 30 L 26 30 L 26 22 L 50 22 L 50 14 L 74 14 L 74 6 L 94 6"
                      stroke="#161616"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="94" cy="6" r="3.5" fill="#161616" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Lower Center: Course Capsule Selector & Subject Focus Details */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            {/* Left Course Capsule List (5 Cols) */}
            <div className="md:col-span-5 bg-white rounded-3xl p-5 border border-[#EFE8DC] shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#EFE8DC]/60">
                  <span className="text-xs font-bold text-[#1C1917] tracking-tight">
                    Active Courses ({subjectProgressList.length})
                  </span>
                  <Link
                    to="/progress"
                    className="text-[11px] font-medium text-[#78716C] hover:text-[#1C1917] flex items-center gap-0.5"
                  >
                    <span>All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-2 mt-3">
                  {subjectProgressList.map((sub) => {
                    const isSelected = sub.subject_id === activeSubject?.subject_id;
                    return (
                      <button
                        key={sub.subject_id}
                        onClick={() => setSelectedSubjectId(sub.subject_id)}
                        className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-sm'
                            : 'bg-[#FAF7F0]/80 hover:bg-[#FAF7F0] text-[#1C1917] border-[#EFE8DC]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-[#161616]'}`}>
                            {sub.subject_code}
                          </span>
                          <StatusBadge status={sub.status} size="sm" showDetails={false} />
                        </div>
                        <p className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#736D61]'}`}>
                          {sub.subject_name}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          <span className={isSelected ? 'text-white/70' : 'text-[#736D61]'}>
                            {sub.covered_hours.toFixed(1)}h / {sub.total_in_scope_hours.toFixed(1)}h
                          </span>
                          <span className={`font-bold ${isSelected ? 'text-[#F9DF7B]' : 'text-[#161616]'}`}>
                            {sub.coverage_percentage.toFixed(0)}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Selected Subject Focus Card (7 Cols) */}
            <div className="md:col-span-7 card-pastel-pink rounded-[24px] p-5 border border-[#F6AECB]/50 shadow-2xs flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/20 pointer-events-none" />

              <div className="relative z-10 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/90 text-xs font-bold text-[#161616] border border-[#F6AECB]">
                      {activeSubject?.subject_code}
                    </span>
                    <span className="text-[11px] font-semibold text-[#701A4A]">
                      Focus Details
                    </span>
                  </div>
                  {activeSubject && <StatusBadge status={activeSubject.status} size="sm" showDetails={false} />}
                </div>

                <div>
                  <h4 className="text-base sm:text-lg font-extrabold text-[#161616] leading-snug">
                    {activeSubject?.subject_name}
                  </h4>
                  <p className="text-xs text-[#5A554A] mt-0.5 font-medium">
                    Faculty Lead: <strong>{activeSubject?.faculty_name}</strong>
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5A554A]">Syllabus Delivery</span>
                    <span className="font-extrabold text-[#161616]">
                      {activeSubject?.covered_hours.toFixed(1)}h / {activeSubject?.total_in_scope_hours.toFixed(1)}h ({activeSubject?.coverage_percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-2.5 overflow-hidden border border-[#F6AECB]/40">
                    <div
                      className="h-full rounded-full bg-[#161616]"
                      style={{ width: `${Math.min(100, activeSubject?.coverage_percentage || 0)}%` }}
                    />
                  </div>
                </div>

                {/* Metric pill row */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/70 border border-[#F6AECB]/40">
                    <span className="text-[10px] text-[#701A4A] font-bold block uppercase">Teaching Buffer</span>
                    <span className="font-extrabold text-[#161616]">
                      {activeSubject?.buffer_ratio === 999 ? 'Inf' : `${activeSubject?.buffer_ratio.toFixed(2)}x`}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/70 border border-[#F6AECB]/40">
                    <span className="text-[10px] text-[#701A4A] font-bold block uppercase">Future Slots</span>
                    <span className="font-extrabold text-[#161616]">
                      {activeSubject?.available_teaching_hours.toFixed(1)}h left
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Link Pills */}
              <div className="mt-4 pt-3 border-t border-[#F6AECB]/50 flex items-center justify-between gap-2 relative z-10">
                <Link
                  to="/lesson-plan"
                  className="px-4 py-2 rounded-full bg-[#161616] text-white text-xs font-semibold hover:bg-black transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Syllabus Plan</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#F9DF7B]" />
                </Link>
                <Link
                  to="/faculty"
                  className="px-4 py-2 rounded-full bg-white/80 hover:bg-white text-[#161616] text-xs font-semibold border border-[#F6AECB] transition-all"
                >
                  Log Session
                </Link>
              </div>
            </div>
          </div>

          {/* Toggleable Recharts Capacity Chart */}
          <div className="bg-white rounded-3xl p-6 border border-[#EFE8DC] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#1C1917] text-sm sm:text-base">
                  Batch Progression Overview
                </h3>
                <p className="text-xs text-[#78716C]">
                  Covered Hours vs Remaining Workload against Future Teaching Slots
                </p>
              </div>
              <button
                onClick={() => setShowFullChart(!showFullChart)}
                className="text-xs font-medium text-[#1C1917] bg-[#FAF7F0] px-3.5 py-1.5 rounded-full border border-[#EFE8DC] hover:bg-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                <BarChart2 className="w-3.5 h-3.5 text-[#78716C]" />
                <span>{showFullChart ? 'Compact View' : 'Expand Chart'}</span>
              </button>
            </div>

            <div className={`${showFullChart ? 'h-72' : 'h-52'} w-full pt-1 transition-all duration-200`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFE8DC" opacity={0.8} />
                  <XAxis dataKey="name" stroke="#A8A29E" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis stroke="#A8A29E" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.96)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: '16px',
                      borderColor: '#EFE8DC',
                      fontSize: '12px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
                      color: '#1C1917',
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '6px', fontSize: '11px', fontWeight: 600 }} />
                  <Bar dataKey="Covered" fill="#B8D094" radius={[6, 6, 0, 0]} name="Covered Hours" />
                  <Bar dataKey="Remaining" fill="#F9DF7B" radius={[6, 6, 0, 0]} name="Remaining Hours" />
                  <Bar dataKey="AvailableFuture" fill="#9EC0EF" radius={[6, 6, 0, 0]} name="Available Slots" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (4 Cols on Desktop) ================= */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5 min-w-0 w-full">
          {/* Calendar Widget matching Reference Image */}
          <div className="bg-white rounded-3xl p-5 border border-[#EFE8DC] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="font-bold text-[#1C1917] text-base tracking-tight">
                  September 2026
                </h3>
                <p className="text-[11px] text-[#78716C]">Academic Session Mid-Term</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-1.5 rounded-full hover:bg-[#FAF4E8] text-[#736D61] transition-colors"
                  aria-label="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  className="p-1.5 rounded-full hover:bg-[#FAF4E8] text-[#736D61] transition-colors"
                  aria-label="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-[#8E8B83]">
              <span>S</span>
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
              {calendarDays.map((cd, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center py-1">
                  <div
                    className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      cd.isCurrentDay
                        ? 'bg-[#161616] text-[#FAF4E8] shadow-xs'
                        : cd.currentMonth
                        ? 'text-[#161616] hover:bg-[#FAF4E8]'
                        : 'text-[#8E8B83]/40'
                    }`}
                  >
                    {cd.day}
                  </div>
                  {/* Event dot */}
                  {cd.hasSession && (
                    <span className="w-1 h-1 rounded-full bg-[#F6AECB] mt-0.5" />
                  )}
                </div>
              ))}
            </div>

            {/* Log Class Session Capsule Button */}
            <div className="pt-2">
              <Link
                to="/faculty"
                className="w-full py-2.5 px-4 rounded-full bg-[#161616] hover:bg-black text-[#FAF4E8] text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs"
              >
                <Plus className="w-4 h-4 text-[#F9DF7B]" />
                <span>+ Log Class Session</span>
              </Link>
            </div>
          </div>

          {/* Activity & Targets Timeline matching Reference Image */}
          <div className="bg-white rounded-3xl p-5 border border-[#EFE8DC] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#EFE8DC]/60">
              <span className="font-bold text-[#1C1917] text-sm tracking-tight">
                Activity & Targets
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF7F0] text-[#78716C] border border-[#EFE8DC]">
                Live Stream
              </span>
            </div>

            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#EFE8DC]">
              {/* Event 1: Recent Log */}
              {recentLogs.length > 0 && (
                <div className="relative pl-7">
                  <div className="absolute left-1.5 top-2.5 w-3 h-3 rounded-full bg-[#B8D094] border-2 border-white -translate-x-1/2" />
                  <div className="card-pastel-green rounded-2xl p-3 border border-[#B8D094]/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#2D451B] uppercase">Session Logged</span>
                      <span className="text-[10px] text-[#5A554A] font-semibold">{recentLogs[0].date}</span>
                    </div>
                    <p className="font-bold text-xs text-[#161616] mt-0.5 truncate">
                      {recentLogs[0].classwork_status || 'Delivered syllabus topic session'}
                    </p>
                    <p className="text-[10px] text-[#5A554A] mt-0.5">
                      Duration: <strong>{recentLogs[0].duration_hours}h</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Event 2: Target Examination */}
              {batchExams.length > 0 && (
                <div className="relative pl-7">
                  <div className="absolute left-1.5 top-2.5 w-3 h-3 rounded-full bg-[#F6AECB] border-2 border-white -translate-x-1/2" />
                  <div className="card-pastel-pink rounded-2xl p-3 border border-[#F6AECB]/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#701A4A] uppercase">Exam Milestone</span>
                      <span className="text-[10px] text-[#701A4A] font-bold">{batchExams[0].exam_date}</span>
                    </div>
                    <p className="font-bold text-xs text-[#161616] mt-0.5 truncate">
                      {batchExams[0].name}
                    </p>
                    <p className="text-[10px] text-[#5A554A] mt-0.5">
                      Scope: {batchExams[0].syllabus_scope_topic_ids.length} Syllabus Topics
                    </p>
                  </div>
                </div>
              )}

              {/* Event 3: At-Risk Alerts or Status Notice */}
              <div className="relative pl-7">
                <div className="absolute left-1.5 top-2.5 w-3 h-3 rounded-full bg-[#F9DF7B] border-2 border-white -translate-x-1/2" />
                <div className="card-pastel-yellow rounded-2xl p-3 border border-[#F9DF7B]/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#644B00] uppercase">
                      {atRiskSubjects.length > 0 ? 'Buffer Warning' : 'Horizon Health'}
                    </span>
                    <span className="text-[10px] font-semibold text-[#644B00]">
                      {atRiskSubjects.length > 0 ? `${atRiskSubjects.length} Alerts` : 'Nominal'}
                    </span>
                  </div>
                  <p className="font-bold text-xs text-[#161616] mt-0.5">
                    {atRiskSubjects.length > 0
                      ? `${atRiskSubjects[0].subject_code} buffer ratio is ${atRiskSubjects[0].buffer_ratio.toFixed(2)}x`
                      : 'All curriculum buffers exceed target 1.15x threshold'}
                  </p>
                </div>
              </div>
            </div>

            {/* View Full Timetable Capsule Button */}
            <div className="pt-2">
              <Link
                to="/calendar"
                className="w-full py-2.5 px-4 rounded-full border border-[#EFE8DC] bg-[#FAF7F0] hover:bg-white text-[#1C1917] text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-[#78716C]" />
                <span>View Full Timetable</span>
              </Link>
            </div>
          </div>

          {/* Admin Cross-Branch Widget (strictly for Admins) */}
          {isAdmin && crossBranchHealthMatrix.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-[#EFE8DC] shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1C1917]">
                  Cross-Branch Comparison
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 text-[#78716C]">
                  3 Branches
                </span>
              </div>

              <div className="space-y-2">
                {crossBranchHealthMatrix.map((item) => (
                  <div
                    key={item.branch.id}
                    className="p-2.5 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] flex items-center justify-between gap-2 hover:bg-white transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-[#1C1917] truncate">{item.branch.name}</p>
                      <p className="text-[10px] text-[#78716C]">
                        {item.branch.university_short_name} &bull; {item.totalSubjects} subjects
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={item.miraiStatus} size="sm" showDetails={false} />
                      <button
                        onClick={() => setSelectedBranch(item.branch.id)}
                        className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                          selectedBranch === item.branch.id
                            ? 'bg-[#1C1917] text-white shadow-2xs'
                            : 'bg-white text-[#1C1917] hover:bg-[#FAF7F0] border border-[#EFE8DC]'
                        }`}
                      >
                        {selectedBranch === item.branch.id ? 'Viewing' : 'Inspect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
