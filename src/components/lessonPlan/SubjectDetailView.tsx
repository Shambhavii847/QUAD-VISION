import React, { useState, useMemo } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getSubjects,
  getUnits,
  getTopics,
  getBatches,
  getSemesters,
  getHolidays,
  getTimetable,
  getSessionLogs,
  updateTopic,
  createTopic,
  createUnit,
  triggerPlannedDatesRecalculation,
} from '../../services/storage';
import {
  Subject,
  Unit,
  Topic,
  TopicStatus,
  ProgressionStatus,
} from '../../types';
import {
  calculateHoursInScope,
  calculateCoveredHours,
  calculateRemainingHours,
  calculateCoveragePercentage,
  calculateSubjectProgress,
} from '../../utils/calculations';
import { BookCover, getBookTheme } from './BookCover';
import { SessionLoggingModal } from '../faculty/SessionLoggingModal';
import { Modal } from '../common/Modal';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  Plus,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  Building2,
  GraduationCap,
  FileText,
  ShieldCheck,
  ClipboardList,
  AlertTriangle,
  FileCheck2,
} from 'lucide-react';

interface SubjectDetailViewProps {
  subjectId: string;
  onBack: () => void;
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  subjectId,
  onBack,
}) => {
  const { currentUser, canEditLessonPlan, isStudent } = useAuth();

  const subjects = getSubjects();
  const allUnits = getUnits();
  const allTopics = getTopics();
  const batches = getBatches();
  const semesters = getSemesters();
  const holidays = getHolidays();
  const timetable = getTimetable();
  const sessionLogs = getSessionLogs();

  const subject = subjects.find((s) => s.id === subjectId) || subjects[0];
  const subjectUnits = allUnits
    .filter((u) => u.subject_id === subject?.id)
    .sort((a, b) => a.unit_number - b.unit_number);
  const subjectTopics = allTopics.filter((t) => t.subject_id === subject?.id);

  // Subject batch & semester
  const subjectBatch = batches.find((b) => b.id === subject?.batch_id);
  const subjectSemester =
    semesters.find((s) => s.batch_id === subject?.batch_id) ||
    semesters.find((s) => s.branch_id === subject?.branch_id) ||
    semesters[0];

  // Subject session logs
  const subjectLogs = sessionLogs.filter((l) => l.subject_id === subject?.id);

  // Calculation metrics
  const inScopeHours = calculateHoursInScope(subjectTopics);
  const coveredHours = calculateCoveredHours(subjectTopics);
  const remainingHours = calculateRemainingHours(inScopeHours, coveredHours);
  const coveragePercentage = calculateCoveragePercentage(coveredHours, inScopeHours);

  // Progression calculation (status: ON TRACK, TIGHT, DANGER)
  const currentDateStr = '2026-09-18';
  const targetDateStr = subjectSemester?.end_date || '2026-11-30';
  const branchHolidays = holidays.filter(
    (h) => !h.branch_id || h.branch_id === subject?.branch_id
  );

  const progressCalc = calculateSubjectProgress(
    subject,
    allTopics,
    currentDateStr,
    targetDateStr,
    subjectSemester,
    branchHolidays,
    timetable
  );

  // Exam scope percentage
  const examScopeTopics = subjectTopics.filter((t) => t.in_exam_scope);
  const examScopePercentage = subjectTopics.length > 0
    ? Math.round((examScopeTopics.length / subjectTopics.length) * 100)
    : 100;

  // Book theme for visual styling
  const bookTheme = getBookTheme(subject);

  // Accordion state
  const [expandedUnitIds, setExpandedUnitIds] = useState<Record<string, boolean>>({});

  // Topic filter inside current subject
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [topicStatusFilter, setTopicStatusFilter] = useState<string>('all');

  // Expanded session log details
  const [expandedTopicLogId, setExpandedTopicLogId] = useState<string | null>(null);

  // Modals state
  const [isNewTopicModalOpen, setIsNewTopicModalOpen] = useState(false);
  const [isNewUnitModalOpen, setIsNewUnitModalOpen] = useState(false);
  const [isSessionLoggingModalOpen, setIsSessionLoggingModalOpen] = useState(false);
  const [selectedUnitIdForTopic, setSelectedUnitIdForTopic] = useState<string>('');

  // Form states
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicHours, setNewTopicHours] = useState(3.0);
  const [newTopicInExamScope, setNewTopicInExamScope] = useState(true);

  const [newUnitNumber, setNewUnitNumber] = useState(1);
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newUnitDescription, setNewUnitDescription] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Toggle unit accordion
  const toggleUnitAccordion = (unitId: string) => {
    setExpandedUnitIds((prev) => ({
      ...prev,
      [unitId]: prev[unitId] === undefined ? false : !prev[unitId],
    }));
  };

  const handleToggleAllUnits = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    subjectUnits.forEach((u) => {
      next[u.id] = expand;
    });
    setExpandedUnitIds(next);
  };

  const handleUpdateTopicStatus = (topicId: string, newStatus: TopicStatus) => {
    if (!currentUser || !canEditLessonPlan) return;
    const newPct = newStatus === 'completed' ? 100 : newStatus === 'not_started' || newStatus === 'skipped' ? 0 : 50;
    updateTopic(
      topicId,
      {
        status: newStatus,
        completion_percentage: newPct,
        actual_completion_date: newStatus === 'completed' ? '2026-09-18' : undefined,
      },
      currentUser
    );
    showNotice(`Updated topic status to ${newStatus.replace('_', ' ')}`);
  };

  const handleUpdateTopicPct = (topicId: string, pct: number) => {
    if (!currentUser || !canEditLessonPlan) return;
    const newStatus: TopicStatus = pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'not_started';
    updateTopic(
      topicId,
      {
        completion_percentage: pct,
        status: newStatus,
        actual_completion_date: pct >= 100 ? '2026-09-18' : undefined,
      },
      currentUser
    );
  };

  const handleToggleExamScope = (topicId: string, currentVal: boolean) => {
    if (!currentUser || !canEditLessonPlan) return;
    updateTopic(topicId, { in_exam_scope: !currentVal }, currentUser);
    showNotice('Updated exam scope for topic.');
  };

  const handleTriggerRecalculate = () => {
    if (!currentUser) return;
    triggerPlannedDatesRecalculation(subject.id, currentUser);
    showNotice('Recalculated planned delivery dates across timetable slots!');
  };

  const handleCreateTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !canEditLessonPlan) return;
    const unitId = selectedUnitIdForTopic || subjectUnits[0]?.id;
    if (!unitId) return;

    createTopic(
      {
        unit_id: unitId,
        subject_id: subject.id,
        title: newTopicTitle,
        planned_hours: Number(newTopicHours),
        sequence_order: subjectTopics.length + 1,
        status: 'not_started',
        completion_percentage: 0,
        in_exam_scope: newTopicInExamScope,
      },
      currentUser
    );

    setIsNewTopicModalOpen(false);
    setNewTopicTitle('');
    triggerPlannedDatesRecalculation(subject.id, currentUser);
    showNotice('New topic added to syllabus and scheduled!');
  };

  const handleCreateUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !canEditLessonPlan) return;

    createUnit(
      {
        subject_id: subject.id,
        unit_number: Number(newUnitNumber),
        title: newUnitTitle,
        description: newUnitDescription,
      },
      currentUser
    );

    setIsNewUnitModalOpen(false);
    setNewUnitTitle('');
    setNewUnitDescription('');
    showNotice('New syllabus unit created!');
  };

  // Status badge styling
  const statusConfig: Record<
    ProgressionStatus,
    { label: string; bg: string; text: string; dot: string; border: string }
  > = {
    COMPLETE: {
      label: 'Complete (100%)',
      bg: 'bg-[#EEF7EF]',
      text: 'text-[#1E4627]',
      dot: 'bg-[#22C55E]',
      border: 'border-[#C8E8CD]',
    },
    'ON TRACK': {
      label: `On Track (Buffer ${progressCalc.buffer_ratio.toFixed(2)})`,
      bg: 'bg-[#EEF7EF]',
      text: 'text-[#1E4627]',
      dot: 'bg-[#22C55E]',
      border: 'border-[#C8E8CD]',
    },
    TIGHT: {
      label: `Tight (Buffer ${progressCalc.buffer_ratio.toFixed(2)})`,
      bg: 'bg-[#FEF9E7]',
      text: 'text-[#78350F]',
      dot: 'bg-[#EAB308]',
      border: 'border-[#FBE69B]',
    },
    DANGER: {
      label: `Behind (Buffer ${progressCalc.buffer_ratio.toFixed(2)})`,
      bg: 'bg-[#FDF2F4]',
      text: 'text-[#831843]',
      dot: 'bg-[#EC4899]',
      border: 'border-[#F8CAD4]',
    },
  };

  const statusStyle = statusConfig[progressCalc.status] || statusConfig['ON TRACK'];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation: Prominent "Back to Library" Button & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-[#EFE8DC] text-[#1C1917] hover:bg-[#FAF7F0] font-semibold text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
          id="back-to-library-btn"
        >
          <ArrowLeft className="w-4 h-4 text-[#71695F] group-hover:-translate-x-1 transition-transform" />
          <span>Back to Library</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[#71695F]">
          <span className="hover:text-[#1C1917] cursor-pointer" onClick={onBack}>
            Learning Library
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[#9C9488]" />
          <span>{subject.branch_id || 'Academic Branch'}</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#9C9488]" />
          <span className="font-semibold text-[#1C1917] truncate max-w-[200px]">
            {subject.code}
          </span>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-2xl bg-[#EEF7EF] border border-[#C8E8CD] text-[#1E4627] font-medium text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* SUBJECT HERO BANNER (Preserves Visual Identity of the Bookshelf) */}
      <div
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br ${bookTheme.coverBg} border ${bookTheme.borderColor} shadow-[0_4px_24px_rgba(28,25,23,0.05)]`}
      >
        {/* Texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
          style={{ backgroundImage: bookTheme.embossPattern }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left: Miniature Book Cover + Subject Details */}
          <div className="flex items-start gap-5 sm:gap-6">
            {/* 3D Mini Book Display */}
            <div className="hidden sm:block shrink-0">
              <BookCover
                subject={subject}
                unitsCount={subjectUnits.length}
                topicsCount={subjectTopics.length}
                coveragePercentage={coveragePercentage}
                coveredHours={coveredHours}
                totalHours={inScopeHours}
                status={progressCalc.status}
                size="mini"
              />
            </div>

            {/* Subject Information */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full ${bookTheme.badgeBg} ${bookTheme.badgeText}`}
                >
                  {subject.academic_track || 'Academic Track'}
                </span>

                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/70 border border-black/10 text-[#1C1917]">
                  {subject.branch_id || 'Campus'} • {subject.university_name || 'Affiliated'}
                </span>

                <span className="text-xs text-[#1C1917]/70 font-medium">
                  Semester {subject.semester_number || 3} • {subject.total_credits || 4} Credits
                </span>
              </div>

              <div>
                <span className="text-xs font-black font-mono tracking-widest uppercase text-[#1C1917]/70 block">
                  {subject.code}
                </span>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] tracking-tight mt-0.5">
                  {subject.name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#1C1917]/80 pt-1">
                {subject.faculty_name && (
                  <span className="font-medium">
                    Instructor: <strong>{subject.faculty_name}</strong>
                  </span>
                )}
                {subjectBatch && (
                  <>
                    <span className="text-black/30">•</span>
                    <span>Batch: <strong>{subjectBatch.name}</strong></span>
                  </>
                )}
              </div>

              {/* Status and Exam Scope indicators */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} shadow-2xs`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                  <span>{statusStyle.label}</span>
                </span>

                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/80 border border-black/10 text-[#1C1917] shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2A5C37]" />
                  <span>Exam Scope: {examScopePercentage}% of syllabus</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Coverage Percentage Ring / Capsule & Faculty Actions */}
          <div className="flex flex-col items-start md:items-end gap-3.5 shrink-0 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-black/10">
            {/* Coverage Capsule */}
            <div className="p-4 rounded-2xl bg-white/90 border border-white/80 shadow-sm backdrop-blur-xs w-full sm:w-auto text-center sm:text-right">
              <span className="text-[11px] font-semibold text-[#71695F] block uppercase tracking-wider">
                Overall Syllabus Coverage
              </span>
              <div className="flex items-baseline justify-center sm:justify-end gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-serif font-bold text-[#1C1917]">
                  {coveragePercentage.toFixed(0)}%
                </span>
                <span className="text-xs text-[#71695F] font-medium">
                  ({coveredHours.toFixed(1)} / {inScopeHours.toFixed(1)} hrs)
                </span>
              </div>
            </div>

            {/* Action buttons (Only for faculty / managers / admin) */}
            {canEditLessonPlan && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSessionLoggingModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF7F0] border border-[#EFE8DC] text-[#1C1917] text-xs font-medium shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Log a class session for this subject"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-[#2A5C37]" />
                  <span>Log Class</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerRecalculate}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF7F0] border border-[#EFE8DC] text-[#1C1917] text-xs font-medium shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Recalculate planned dates"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#1C1917]" />
                  <span>Recalculate</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewUnitNumber(subjectUnits.length + 1);
                    setIsNewUnitModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF7F0] border border-[#EFE8DC] text-[#1C1917] text-xs font-medium shadow-2xs transition-all cursor-pointer"
                >
                  + Add Unit
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedUnitIdForTopic(subjectUnits[0]?.id || '');
                    setIsNewTopicModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#2C2825] text-white text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#FBE69B]" />
                  <span>Add Topic</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOUR ACADEMIC METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="warm-card p-4">
          <span className="text-xs font-normal text-[#71695F] block">Hours in Scope</span>
          <span className="text-xl sm:text-2xl font-bold text-[#1C1917] mt-1 block">
            {inScopeHours.toFixed(1)}h
          </span>
          <span className="text-[11px] text-[#9C9488] block mt-0.5">Active curriculum topics</span>
        </div>

        <div className="warm-card p-4">
          <span className="text-xs font-normal text-[#71695F] block">Covered Hours</span>
          <span className="text-xl sm:text-2xl font-bold text-[#1E4627] mt-1 block">
            {coveredHours.toFixed(1)}h
          </span>
          <span className="text-[11px] text-[#1E4627] font-medium block mt-0.5">
            {coveragePercentage.toFixed(1)}% delivered
          </span>
        </div>

        <div className="warm-card p-4">
          <span className="text-xs font-normal text-[#71695F] block">Remaining Hours</span>
          <span className="text-xl sm:text-2xl font-bold text-[#78350F] mt-1 block">
            {remainingHours.toFixed(1)}h
          </span>
          <span className="text-[11px] text-[#9C9488] block mt-0.5">Required to complete</span>
        </div>

        <div className="warm-card p-4">
          <span className="text-xs font-normal text-[#71695F] block">Syllabus Structure</span>
          <span className="text-xl sm:text-2xl font-bold text-[#1C1917] mt-1 block">
            {subjectUnits.length} Units
          </span>
          <span className="text-[11px] text-[#71695F] block mt-0.5">
            {subjectTopics.length} Total Lessons
          </span>
        </div>
      </div>

      {/* TOPIC SEARCH, STATUS FILTER & ACCORDION CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          {/* Topic search */}
          <div className="flex items-center gap-2 bg-white border border-[#EFE8DC] rounded-xl px-3 py-1.5 text-xs shadow-2xs">
            <Search className="w-3.5 h-3.5 text-[#9C9488]" />
            <input
              type="text"
              value={topicSearchQuery}
              onChange={(e) => setTopicSearchQuery(e.target.value)}
              placeholder="Search topics in this subject..."
              className="bg-transparent text-xs text-[#1C1917] placeholder-[#9C9488] focus:outline-hidden w-44 sm:w-60"
            />
          </div>

          {/* Topic status filter */}
          <select
            value={topicStatusFilter}
            onChange={(e) => setTopicStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#EFE8DC] bg-white text-[#1C1917] font-medium text-xs focus:outline-hidden"
          >
            <option value="all">All Topics</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="not_started">Pending</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleToggleAllUnits(true)}
            className="text-[11px] text-[#71695F] hover:text-[#1C1917] font-medium px-2 py-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
          >
            Expand All Units
          </button>
          <span className="text-[#EFE8DC]">|</span>
          <button
            type="button"
            onClick={() => handleToggleAllUnits(false)}
            className="text-[11px] text-[#71695F] hover:text-[#1C1917] font-medium px-2 py-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* SYLLABUS UNITS & TOPICS EXPANDABLE ACCORDION */}
      <div className="space-y-4">
        {subjectUnits.length === 0 ? (
          <div className="warm-card p-12 text-center text-[#71695F] space-y-2">
            <Layers className="w-8 h-8 text-[#9C9488] mx-auto" />
            <p className="font-semibold text-sm text-[#1C1917]">No units configured for this subject</p>
            <p className="text-xs">Click "+ Add Unit" above to begin building the syllabus structure.</p>
          </div>
        ) : (
          subjectUnits.map((unit) => {
            const unitTopics = subjectTopics
              .filter((t) => t.unit_id === unit.id)
              .sort((a, b) => a.sequence_order - b.sequence_order);

            const filteredUnitTopics = unitTopics.filter((top) => {
              if (topicStatusFilter !== 'all' && top.status !== topicStatusFilter) return false;
              if (topicSearchQuery.trim()) {
                return top.title.toLowerCase().includes(topicSearchQuery.toLowerCase());
              }
              return true;
            });

            const unitScope = calculateHoursInScope(unitTopics);
            const unitCovered = calculateCoveredHours(unitTopics);
            const unitPct = calculateCoveragePercentage(unitCovered, unitScope);
            const isExpanded = expandedUnitIds[unit.id] ?? true; // Default expanded

            const completedCount = unitTopics.filter((t) => t.status === 'completed').length;
            const inProgressCount = unitTopics.filter((t) => t.status === 'in_progress').length;
            const pendingCount = unitTopics.filter((t) => t.status === 'not_started').length;

            return (
              <div key={unit.id} className="warm-card overflow-hidden">
                {/* Unit Header Card (Clickable Accordion) */}
                <div
                  onClick={() => toggleUnitAccordion(unit.id)}
                  className="px-6 py-4 bg-[#FDFBF7] border-b border-[#EFE8DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-[#FAF7F0]/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button type="button" className="p-1 rounded-lg hover:bg-white text-[#71695F]">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#1C1917]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#71695F]" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#1C1917] text-[#FBE69B]">
                          Unit {unit.unit_number}
                        </span>
                        <h3 className="font-semibold text-sm sm:text-base text-[#1C1917]">
                          {unit.title}
                        </h3>
                      </div>
                      {unit.description && (
                        <p className="text-xs text-[#71695F] mt-0.5 line-clamp-1">{unit.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pl-7 sm:pl-0">
                    {/* Unit Progress Mini-Badge */}
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-[#EFE8DC] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#4ADE80]"
                          style={{ width: `${Math.min(100, unitPct)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[#1C1917] w-10 text-right">
                        {unitPct.toFixed(0)}%
                      </span>
                    </div>

                    <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#71695F]">
                      <span className="px-2 py-0.5 rounded-full bg-[#EEF7EF] text-[#1E4627] border border-[#C8E8CD]">
                        {completedCount} / {unitTopics.length} done
                      </span>
                      {inProgressCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#F0F6FD] text-[#193B6D] border border-[#CCE0F9]">
                          {inProgressCount} active
                        </span>
                      )}
                      {pendingCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FAF7F0] text-[#71695F] border border-[#EFE8DC]">
                          {pendingCount} pending
                        </span>
                      )}
                    </div>

                    {canEditLessonPlan && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUnitIdForTopic(unit.id);
                          setIsNewTopicModalOpen(true);
                        }}
                        className="text-xs font-medium px-3 py-1.5 rounded-xl bg-white border border-[#EFE8DC] hover:bg-[#FAF7F0] text-[#1C1917] transition-colors cursor-pointer"
                      >
                        + Topic
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Topics Content */}
                {isExpanded && (
                  <div className="divide-y divide-[#EFE8DC]/70">
                    {filteredUnitTopics.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#71695F] italic">
                        {topicSearchQuery || topicStatusFilter !== 'all'
                          ? 'No topics match the filter in this unit.'
                          : `No topics added to Unit ${unit.unit_number} yet.`}
                      </div>
                    ) : (
                      filteredUnitTopics.map((top) => {
                        const isCompleted = top.status === 'completed';
                        const isInProgress = top.status === 'in_progress';
                        const isSkipped = top.status === 'skipped';

                        // Check if session log exists for this topic
                        const linkedLog = subjectLogs.find((l) =>
                          l.topics_covered?.some((tc) => tc.topic_id === top.id)
                        );
                        const isLogExpanded = expandedTopicLogId === top.id;

                        return (
                          <div
                            key={top.id}
                            className="p-4 sm:px-6 hover:bg-[#FAF7F0]/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-medium text-[#9C9488] w-5">
                                  {top.sequence_order}.
                                </span>
                                <span
                                  className={`font-semibold text-sm ${
                                    isCompleted ? 'text-[#1C1917]' : 'text-[#2C2825]'
                                  }`}
                                >
                                  {top.title}
                                </span>

                                {/* Status Tag */}
                                {isCompleted && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#EEF7EF] text-[#1E4627] border border-[#C8E8CD] flex items-center gap-1">
                                    <Check className="w-3 h-3 text-[#22C55E]" />
                                    <span>Completed</span>
                                  </span>
                                )}

                                {isInProgress && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#F0F6FD] text-[#193B6D] border border-[#CCE0F9] flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-[#0284C7]" />
                                    <span>In Progress ({top.completion_percentage}%)</span>
                                  </span>
                                )}

                                {!isCompleted && !isInProgress && !isSkipped && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#FAF7F0] text-[#71695F] border border-[#EFE8DC]">
                                    Pending
                                  </span>
                                )}

                                {isSkipped && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#FAF7F0] text-[#9C9488] border border-[#EFE8DC]">
                                    Skipped
                                  </span>
                                )}

                                {top.in_exam_scope && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FEF9E7] text-[#78350F] border border-[#FBE69B]">
                                    In Exam
                                  </span>
                                )}
                              </div>

                              {/* Dates & Hours */}
                              <div className="flex flex-wrap items-center gap-3 text-[#71695F] text-[11px] pl-7">
                                <span>Planned: <strong>{top.planned_hours.toFixed(1)}h</strong></span>
                                <span>• Scheduled Date: <strong>{top.planned_date || 'TBD'}</strong></span>
                                {top.actual_completion_date && (
                                  <span className="text-[#1E4627] font-medium">
                                    • Delivered on: {top.actual_completion_date}
                                  </span>
                                )}

                                {linkedLog && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedTopicLogId(isLogExpanded ? null : top.id)
                                    }
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0369A1] hover:underline"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>Session Log ({linkedLog.date})</span>
                                  </button>
                                )}
                              </div>

                              {/* Expanded Session Log Details if present */}
                              {linkedLog && isLogExpanded && (
                                <div className="mt-2 ml-7 p-3 rounded-xl bg-[#F0F6FD] border border-[#CCE0F9] text-[11px] space-y-1 text-[#193B6D]">
                                  <div className="font-semibold flex items-center justify-between">
                                    <span>Class Session Record • {linkedLog.date}</span>
                                    <span className="capitalize text-[10px] px-2 py-0.2 rounded-full bg-white border border-[#CCE0F9]">
                                      {linkedLog.status}
                                    </span>
                                  </div>
                                  {linkedLog.classwork_status && (
                                    <p><strong>Classwork:</strong> {linkedLog.classwork_status}</p>
                                  )}
                                  {linkedLog.homework_status && (
                                    <p><strong>Homework:</strong> {linkedLog.homework_status}</p>
                                  )}
                                  {linkedLog.faculty_notes && (
                                    <p className="italic text-[#0C4A6E]">Notes: {linkedLog.faculty_notes}</p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Faculty Actions & Progress Slider (Read-only for students) */}
                            {canEditLessonPlan && (
                              <div className="flex items-center gap-3 pl-7 md:pl-0 shrink-0">
                                {/* Completion range slider */}
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="10"
                                    value={top.completion_percentage}
                                    onChange={(e) => handleUpdateTopicPct(top.id, parseInt(e.target.value))}
                                    className="w-16 sm:w-20 accent-[#1C1917] cursor-pointer"
                                    aria-label={`Adjust completion percentage for ${top.title}`}
                                  />
                                  <span className="text-[11px] font-semibold text-[#1C1917] w-8 text-right">
                                    {top.completion_percentage}%
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateTopicStatus(top.id, 'completed')}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                                      isCompleted
                                        ? 'bg-[#EEF7EF] text-[#1E4627] border border-[#C8E8CD]'
                                        : 'bg-white hover:bg-[#FAF7F0] text-[#71695F] border border-[#EFE8DC]'
                                    }`}
                                    title="Mark complete"
                                  >
                                    Done
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleExamScope(top.id, Boolean(top.in_exam_scope))}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                                      top.in_exam_scope
                                        ? 'bg-[#FEF9E7] text-[#78350F] border border-[#FBE69B]'
                                        : 'bg-white hover:bg-[#FAF7F0] text-[#9C9488] border border-[#EFE8DC]'
                                    }`}
                                    title="Toggle exam syllabus inclusion"
                                  >
                                    Exam
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: New Topic Modal */}
      <Modal
        isOpen={isNewTopicModalOpen}
        onClose={() => setIsNewTopicModalOpen(false)}
        title="Add New Topic to Syllabus"
        description={`Subject: ${subject.name}`}
      >
        <form onSubmit={handleCreateTopicSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#1C1917] mb-1">Select Syllabus Unit</label>
            <select
              value={selectedUnitIdForTopic}
              onChange={(e) => setSelectedUnitIdForTopic(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-medium"
            >
              {subjectUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  Unit {u.unit_number}: {u.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-[#1C1917] mb-1">Topic Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Dijkstra's Shortest Path Algorithm"
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#1C1917] mb-1">Planned Delivery Hours</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={newTopicHours}
                onChange={(e) => setNewTopicHours(parseFloat(e.target.value) || 2)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-medium"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTopicInExamScope}
                  onChange={(e) => setNewTopicInExamScope(e.target.checked)}
                  className="rounded border-[#EFE8DC] text-[#1C1917] focus:ring-0"
                />
                <span className="font-medium text-[#1C1917]">Include in Exam Scope</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#EFE8DC]">
            <button
              type="button"
              onClick={() => setIsNewTopicModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#EFE8DC] bg-white hover:bg-[#FAF7F0] text-[#1C1917] font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#1C1917] hover:bg-[#2C2825] text-white font-medium cursor-pointer"
            >
              Add Topic
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: New Unit Modal */}
      <Modal
        isOpen={isNewUnitModalOpen}
        onClose={() => setIsNewUnitModalOpen(false)}
        title="Add New Syllabus Unit"
        description={`Subject: ${subject.name}`}
      >
        <form onSubmit={handleCreateUnitSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-[#1C1917] mb-1">Unit Number</label>
              <input
                type="number"
                min="1"
                required
                value={newUnitNumber}
                onChange={(e) => setNewUnitNumber(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-medium"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-medium text-[#1C1917] mb-1">Unit Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Graph Algorithms & Minimum Spanning Trees"
                value={newUnitTitle}
                onChange={(e) => setNewUnitTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#1C1917] mb-1">Unit Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Covers Dijkstra, Bellman-Ford, Prim's and Kruskal's algorithms."
              value={newUnitDescription}
              onChange={(e) => setNewUnitDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#EFE8DC]">
            <button
              type="button"
              onClick={() => setIsNewUnitModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#EFE8DC] bg-white hover:bg-[#FAF7F0] text-[#1C1917] font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#1C1917] hover:bg-[#2C2825] text-white font-medium cursor-pointer"
            >
              Create Unit
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Session Logging Modal */}
      {isSessionLoggingModalOpen && (
        <SessionLoggingModal
          isOpen={isSessionLoggingModalOpen}
          onClose={() => setIsSessionLoggingModalOpen(false)}
        />
      )}
    </div>
  );
};
