import React, { useState, useMemo } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getSubjects,
  getTimetable,
  getSessionLogs,
  getBatches,
  getTopics,
  getUsers,
  getMissedSessions,
} from '../../services/storage';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { SessionLoggingModal } from './SessionLoggingModal';
import { TimetableEntry, SessionLog } from '../../types';
import { calculateHoursInScope, calculateCoveredHours, calculateCoveragePercentage } from '../../utils/calculations';
import {
  BookOpen,
  Calendar,
  Clock,
  PlusCircle,
  CheckCircle,
  FileText,
  MapPin,
  Users,
  AlertCircle,
  CalendarDays,
  Filter,
  Search,
  Eye,
  X,
  Database,
  AlertTriangle,
  ChevronRight,
  Info,
} from 'lucide-react';
import { AccessDenied } from '../common/AccessDenied';
import { Modal } from '../common/Modal';

export const FacultyDashboard: React.FC = () => {
  const { currentUser, isFaculty, isCampusManager, isAdmin } = useAuth();

  if (!isFaculty && !isCampusManager && !isAdmin) {
    return <AccessDenied requiredRole="Faculty or Academic Administrator" />;
  }

  const subjects = getSubjects();
  const timetable = getTimetable();
  const sessionLogs = getSessionLogs();
  const batches = getBatches();
  const allTopics = getTopics();
  const users = getUsers();
  const missedSessions = getMissedSessions();

  const isAdministrativeRole = isAdmin || isCampusManager;

  // Modals & Inspection state
  const [isLoggingModalOpen, setIsLoggingModalOpen] = useState(false);
  const [selectedSlotForLog, setSelectedSlotForLog] = useState<TimetableEntry | null>(null);
  const [inspectingLog, setInspectingLog] = useState<SessionLog | null>(null);

  // Filters state
  const [activeTab, setActiveTab] = useState<'logs' | 'schedule'>(isAdministrativeRole ? 'logs' : 'schedule');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [facultyFilter, setFacultyFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');

  // Simulation date (reference academic calendar date)
  const currentDayOfWeek = 5; // Friday
  const currentDateStr = '2026-09-18';

  // Branch isolation: If Campus Manager, restrict scope to their branch
  const userBranchId = currentUser?.branch_id || currentUser?.campus_id;
  const branchBatches = useMemo(() => {
    if (isCampusManager && userBranchId) {
      return batches.filter((b) => (b.branch_id || b.campus_id) === userBranchId);
    }
    return batches;
  }, [batches, isCampusManager, userBranchId]);

  const branchBatchIds = useMemo(() => branchBatches.map((b) => b.id), [branchBatches]);

  const accessibleSubjects = useMemo(() => {
    if (isFaculty) {
      return subjects.filter((s) => s.faculty_id === currentUser?.id);
    }
    if (isCampusManager && userBranchId) {
      return subjects.filter((s) => branchBatchIds.includes(s.batch_id) || s.branch_id === userBranchId);
    }
    return subjects;
  }, [subjects, isFaculty, isCampusManager, userBranchId, currentUser?.id, branchBatchIds]);

  const accessibleSubjectIds = useMemo(() => accessibleSubjects.map((s) => s.id), [accessibleSubjects]);

  // Timetable slots
  const accessibleTimetable = useMemo(() => {
    if (isFaculty) {
      return timetable.filter((t) => t.faculty_id === currentUser?.id);
    }
    if (isCampusManager && userBranchId) {
      return timetable.filter((t) => branchBatchIds.includes(t.batch_id) || (t.branch_id || t.campus_id) === userBranchId);
    }
    return timetable;
  }, [timetable, isFaculty, isCampusManager, userBranchId, currentUser?.id, branchBatchIds]);

  const todaysSlots = accessibleTimetable.filter((t) => t.day_of_week === currentDayOfWeek);

  // Accessible Session Logs
  const accessibleLogs = useMemo(() => {
    if (isFaculty) {
      return sessionLogs.filter((l) => l.faculty_id === currentUser?.id);
    }
    if (isCampusManager && userBranchId) {
      return sessionLogs.filter((l) => accessibleSubjectIds.includes(l.subject_id));
    }
    return sessionLogs;
  }, [sessionLogs, isFaculty, isCampusManager, userBranchId, currentUser?.id, accessibleSubjectIds]);

  // Missing / unlogged sessions for this scope
  const relevantMissedSessions = useMemo(() => {
    return missedSessions.filter((m) => {
      if (isFaculty) return m.faculty_id === currentUser?.id;
      if (isCampusManager && userBranchId) return (m.branch_id || m.campus_id) === userBranchId;
      return true;
    });
  }, [missedSessions, isFaculty, isCampusManager, userBranchId, currentUser?.id]);

  // Faculty user list for filters
  const facultyMembers = useMemo(() => {
    return users.filter((u) => u.role === 'faculty');
  }, [users]);

  // Filtered Class Logs
  const filteredLogs = useMemo(() => {
    return accessibleLogs.filter((log) => {
      const sub = subjects.find((s) => s.id === log.subject_id);
      const fac = users.find((u) => u.id === log.faculty_id);
      const batch = batches.find((b) => b.id === sub?.batch_id);

      if (statusFilter !== 'all' && log.status !== statusFilter) return false;
      if (subjectFilter !== 'all' && log.subject_id !== subjectFilter) return false;
      if (facultyFilter !== 'all' && log.faculty_id !== facultyFilter) return false;
      if (batchFilter !== 'all' && sub?.batch_id !== batchFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubject = sub?.name.toLowerCase().includes(q) || sub?.code.toLowerCase().includes(q);
        const matchFaculty = fac?.name.toLowerCase().includes(q);
        const matchBatch = batch?.name.toLowerCase().includes(q);
        const matchTopics = log.topics_covered?.some((tc) => {
          const tObj = allTopics.find((t) => t.id === tc.topic_id);
          return tObj?.title.toLowerCase().includes(q);
        });
        const matchNotes =
          log.classwork_status?.toLowerCase().includes(q) ||
          log.homework_status?.toLowerCase().includes(q) ||
          log.carry_forward?.toLowerCase().includes(q);

        if (!matchSubject && !matchFaculty && !matchBatch && !matchTopics && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [accessibleLogs, statusFilter, subjectFilter, facultyFilter, batchFilter, searchQuery, subjects, users, batches, allTopics]);

  const handleOpenLogModal = (slot?: TimetableEntry) => {
    setSelectedSlotForLog(slot || null);
    setIsLoggingModalOpen(true);
  };

  const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EEF7EF] text-[#1E4627] border border-[#C8E8CD]">
            Conducted
          </span>
        );
      case 'partially_completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F0F6FD] text-[#193B6D] border border-[#CCE0F9]">
            Partial
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FDF2F4] text-[#701C2F] border border-[#F8CAD4]">
            Cancelled
          </span>
        );
      case 'rescheduled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF9E7] text-[#614800] border border-[#FBE69B]">
            Rescheduled
          </span>
        );
      case 'skipped':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF7F0] text-[#71695F] border border-[#EFE8DC]">
            Skipped
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-800">
            {st}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with soft cream and pastel styling */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8DC] shadow-[0_2px_12px_rgba(28,25,23,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] px-3 py-0.5 rounded-full bg-[#FEF9E7] text-[#614800] border border-[#FBE69B] font-medium">
              {isAdministrativeRole ? 'Administrative Class Log Registry' : 'Faculty Class Log'}
            </span>
            <span className="text-xs text-[#71695F]">• Term Calendar 2026</span>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#1C1917]">
            {isAdministrativeRole ? 'Faculty Class Delivery Records' : `Welcome, ${currentUser?.name || 'Faculty Member'}`}
          </h1>
          <p className="text-xs text-[#71695F] mt-1.5 max-w-2xl leading-relaxed">
            {isAdministrativeRole
              ? 'Institutional record of all curriculum lectures, duration delivered, syllabus topics covered, and missing-session audits.'
              : 'Record session delivery, update syllabus topic coverage, and view your weekly teaching timetable.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => handleOpenLogModal()}
            className="px-4 py-2.5 rounded-2xl bg-[#1C1917] hover:bg-[#2C2825] text-white font-medium text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#FBE69B]" />
            <span>Fast Session Log</span>
          </button>
        </div>
      </div>

      {/* Database Connection & Sample Data Transparency Banner */}
      <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isSupabaseConfigured
          ? 'bg-[#EEF7EF] border-[#C8E8CD] text-[#1E4627]'
          : 'bg-[#FEF9E7] border-[#FBE69B] text-[#614800]'
      }`}>
        <div className="flex items-start sm:items-center gap-2.5">
          <Database className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span className="font-semibold">
              {isSupabaseConfigured ? 'Live Database Connected' : 'Sample Data Notice (Local Academic Store)'}
            </span>
            <p className="text-[11px] opacity-90 mt-0.5">
              {isSupabaseConfigured
                ? 'Records are actively synchronized with PostgreSQL database tables.'
                : 'Displaying seeded academic demonstration records stored in browser memory. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment for live institutional storage.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/80 border border-current font-medium">
            {accessibleLogs.length} Records In Scope
          </span>
        </div>
      </div>

      {/* Unlogged / Missing Class Indicator Notice if any */}
      {relevantMissedSessions.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#FDF2F4] border border-[#F8CAD4] text-[#701C2F] text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#E8637E]" />
            <div>
              <span className="font-semibold">
                {relevantMissedSessions.length} Unlogged / Missed Session{relevantMissedSessions.length > 1 ? 's' : ''} Require Attention
              </span>
              <p className="text-[11px] opacity-85 mt-0.5">
                Past scheduled slots have missing log submissions or unverified cancellations.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-white text-[#701C2F] border border-[#F8CAD4] font-medium text-[11px]">
            Action Needed
          </span>
        </div>
      )}

      {/* Tabs: Class Logs vs Teaching Schedule */}
      <div className="flex items-center gap-2 border-b border-[#EFE8DC] pb-2">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-[#1C1917] text-white shadow-xs'
              : 'text-[#71695F] hover:text-[#1C1917] hover:bg-white'
          }`}
        >
          Class Delivery Records ({filteredLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-[#1C1917] text-white shadow-xs'
              : 'text-[#71695F] hover:text-[#1C1917] hover:bg-white'
          }`}
        >
          Teaching Schedule & Timetable ({accessibleTimetable.length})
        </button>
      </div>

      {activeTab === 'logs' && (
        <div className="warm-card overflow-hidden">
          {/* Search and Filters Bar */}
          <div className="p-4 sm:p-5 border-b border-[#EFE8DC] bg-[#FDFBF7] space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="flex-1 max-w-md flex items-center gap-2 bg-white border border-[#EFE8DC] rounded-xl px-3.5 py-2 shadow-2xs">
                <Search className="w-4 h-4 text-[#9C9488] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subject, faculty, topic, or notes..."
                  className="w-full bg-transparent text-xs text-[#1C1917] placeholder-[#9C9488] focus:outline-hidden"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-[#9C9488] hover:text-[#1C1917]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[#71695F] font-medium text-[11px]">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#EFE8DC] bg-white text-[#1C1917] font-medium text-xs focus:outline-hidden"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Conducted</option>
                  <option value="partially_completed">Partial</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rescheduled">Rescheduled</option>
                  <option value="skipped">Skipped</option>
                </select>

                {/* Subject Filter */}
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#EFE8DC] bg-white text-[#1C1917] font-medium text-xs focus:outline-hidden max-w-[160px] truncate"
                >
                  <option value="all">All Subjects</option>
                  {accessibleSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>

                {/* Faculty Filter (for Admin/Managers) */}
                {isAdministrativeRole && (
                  <select
                    value={facultyFilter}
                    onChange={(e) => setFacultyFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[#EFE8DC] bg-white text-[#1C1917] font-medium text-xs focus:outline-hidden max-w-[150px] truncate"
                  >
                    <option value="all">All Faculty</option>
                    {facultyMembers.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Batch Filter */}
                <select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#EFE8DC] bg-white text-[#1C1917] font-medium text-xs focus:outline-hidden max-w-[140px] truncate"
                >
                  <option value="all">All Batches</option>
                  {branchBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F0] text-[#71695F] font-semibold border-b border-[#EFE8DC]">
                <tr>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Subject & Batch</th>
                  <th className="py-3.5 px-4">Faculty Member</th>
                  <th className="py-3.5 px-4">Topics Covered</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8DC]/70">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#71695F]">
                      <div className="max-w-xs mx-auto space-y-1">
                        <p className="font-semibold text-sm text-[#1C1917]">No records found</p>
                        <p className="text-xs">Try clearing filters or search query to view available logs.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const sub = subjects.find((s) => s.id === log.subject_id);
                    const fac = users.find((u) => u.id === log.faculty_id);
                    const batch = batches.find((b) => b.id === sub?.batch_id);

                    return (
                      <tr key={log.id} className="hover:bg-[#FAF7F0]/60 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-[#1C1917]">{log.date}</div>
                          <div className="text-[11px] text-[#71695F]">
                            {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled slot'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#1C1917]">{sub?.name || 'Subject'}</div>
                          <div className="text-[11px] text-[#71695F] flex items-center gap-1.5 mt-0.5">
                            <span className="font-medium px-1.5 py-0.2 rounded bg-[#FAF7F0] border border-[#EFE8DC] text-[10px]">
                              {sub?.code}
                            </span>
                            <span>• {batch?.name || 'Batch'}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-medium text-[#1C1917]">{fac?.name || 'Assigned Instructor'}</div>
                          <div className="text-[11px] text-[#71695F]">{fac?.email}</div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          {log.topics_covered && log.topics_covered.length > 0 ? (
                            <div className="space-y-1">
                              {log.topics_covered.map((tc, idx) => {
                                const tObj = allTopics.find((t) => t.id === tc.topic_id);
                                return (
                                  <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] shrink-0" />
                                    <span className="text-[#1C1917] font-medium truncate max-w-[180px]">
                                      {tObj?.title || 'Topic Covered'}
                                    </span>
                                    <span className="text-[10px] text-[#71695F]">
                                      ({tc.completion_percentage}%)
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-[#9C9488] italic text-[11px]">No specific syllabus topics recorded</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#1C1917]">
                          {log.duration_hours}h
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(log.status)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setInspectingLog(log)}
                            className="p-1.5 rounded-xl border border-[#EFE8DC] bg-white hover:bg-[#FAF7F0] text-[#1C1917] transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-medium"
                            title="Inspect Record Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#71695F]" />
                            <span className="hidden sm:inline">Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Today's Timetable Widget */}
          <div className="warm-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#EFE8DC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F0F6FD] text-[#193B6D] flex items-center justify-center font-bold">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1C1917] text-base tracking-tight">
                    Today's Schedule (Friday, Sep 18, 2026)
                  </h3>
                  <p className="text-xs text-[#71695F]">
                    Timetable slots configured for today. Click "Log Session" to record completion.
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#FAF7F0] text-[#1C1917] border border-[#EFE8DC]">
                {todaysSlots.length} Scheduled Slot{todaysSlots.length !== 1 ? 's' : ''} Today
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {todaysSlots.length === 0 ? (
                <div className="col-span-2 p-6 text-center text-[#71695F] text-xs bg-[#FAF7F0]/60 rounded-2xl border border-dashed border-[#EFE8DC]">
                  No scheduled classes today. You can still log an extra or ad-hoc session using "Fast Session Log".
                </div>
              ) : (
                todaysSlots.map((slot) => {
                  const sub = subjects.find((s) => s.id === slot.subject_id);
                  const batch = batches.find((b) => b.id === slot.batch_id);
                  const alreadyLogged = accessibleLogs.some(
                    (l) => l.scheduled_class_id === slot.id && l.date === currentDateStr
                  );

                  return (
                    <div
                      key={slot.id}
                      className="p-4 rounded-2xl border border-[#EFE8DC] bg-[#FDFBF7] flex items-center justify-between gap-3 transition-all hover:shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#1C1917] text-[#FBE69B]">
                            {sub?.code}
                          </span>
                          <span className="font-semibold text-[#1C1917] text-xs sm:text-sm">
                            {sub?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#71695F]">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-[#9C9488]" />
                            {slot.start_time} - {slot.end_time} ({slot.duration_hours}h)
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#9C9488]" />
                            {slot.room}
                          </span>
                          <span className="text-[11px]">• {batch?.name}</span>
                        </div>
                      </div>

                      <div>
                        {alreadyLogged ? (
                          <span className="px-3 py-1.5 rounded-xl bg-[#EEF7EF] text-[#1E4627] text-xs font-semibold border border-[#C8E8CD] flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-[#4ADE80]" />
                            <span>Logged</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenLogModal(slot)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#1C1917] hover:bg-[#2C2825] text-white font-medium text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5 text-[#FBE69B]" />
                            <span>Log Session</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Full Weekly Schedule */}
          <div className="warm-card overflow-hidden">
            <div className="px-6 py-4.5 border-b border-[#EFE8DC] bg-[#FAF7F0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#1C1917] text-base tracking-tight">
                  Weekly Teaching Slots
                </h3>
                <p className="text-xs text-[#71695F]">
                  Recurring weekly timetable allocation across all academic batches.
                </p>
              </div>
            </div>

            <div className="divide-y divide-[#EFE8DC]/70">
              {accessibleTimetable.length === 0 ? (
                <div className="p-8 text-center text-[#71695F] text-xs">
                  No timetable slots assigned for this profile.
                </div>
              ) : (
                accessibleTimetable.map((slot) => {
                  const sub = subjects.find((s) => s.id === slot.subject_id);
                  const batch = batches.find((b) => b.id === slot.batch_id);

                  return (
                    <div
                      key={slot.id}
                      className="p-4 sm:px-6 hover:bg-[#FAF7F0]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-start sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#FAF7F0] text-[#1C1917] flex flex-col items-center justify-center font-bold shrink-0 border border-[#EFE8DC]">
                          <span className="text-[10px] uppercase font-semibold text-[#71695F]">Day</span>
                          <span className="text-sm font-bold text-[#1C1917]">{dayNames[slot.day_of_week]?.slice(0, 3)}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 font-semibold text-[#1C1917] text-sm">
                            <span>{sub?.name || 'Class Session'}</span>
                            <span className="text-xs text-[#71695F] font-normal">({sub?.code})</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[#71695F] mt-1 font-normal">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#9C9488]" />
                              <span>{slot.start_time} - {slot.end_time} ({slot.duration_hours}h)</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#9C9488]" />
                              <span>{slot.room}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-[#9C9488]" />
                              <span>{batch?.name}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenLogModal(slot)}
                        className="px-4 py-2 rounded-xl bg-white border border-[#EFE8DC] hover:bg-[#FAF7F0] text-[#1C1917] font-medium transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-[#1C1917]" />
                        <span>Log Session</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Inspection Modal */}
      {inspectingLog && (
        <Modal
          isOpen={Boolean(inspectingLog)}
          onClose={() => setInspectingLog(null)}
          title="Class Session Record Inspection"
          description={`Log ID: ${inspectingLog.id}`}
        >
          {(() => {
            const sub = subjects.find((s) => s.id === inspectingLog.subject_id);
            const fac = users.find((u) => u.id === inspectingLog.faculty_id);
            const batch = batches.find((b) => b.id === sub?.batch_id);

            return (
              <div className="space-y-4 text-xs">
                {/* Header overview card */}
                <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#1C1917]">{sub?.name}</span>
                    {getStatusBadge(inspectingLog.status)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[#71695F] pt-1">
                    <div>
                      <span className="text-[10px] text-[#9C9488] block">Date</span>
                      <strong className="text-[#1C1917]">{inspectingLog.date}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#9C9488] block">Delivered Duration</span>
                      <strong className="text-[#1C1917]">{inspectingLog.duration_hours} Hours</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#9C9488] block">Faculty</span>
                      <strong className="text-[#1C1917]">{fac?.name || 'Instructor'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#9C9488] block">Batch</span>
                      <strong className="text-[#1C1917]">{batch?.name || 'Class Section'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#9C9488] block">Course Code</span>
                      <strong className="text-[#1C1917]">{sub?.code}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#9C9488] block">Academic Track</span>
                      <strong className="text-[#1C1917]">{batch?.academic_track || 'Track'}</strong>
                    </div>
                  </div>
                </div>

                {/* Topics Covered */}
                <div className="warm-card p-4">
                  <h4 className="font-semibold text-[#1C1917] text-xs mb-2">Syllabus Topics Covered in this Lecture</h4>
                  {inspectingLog.topics_covered && inspectingLog.topics_covered.length > 0 ? (
                    <div className="space-y-2">
                      {inspectingLog.topics_covered.map((tc, idx) => {
                        const tObj = allTopics.find((t) => t.id === tc.topic_id);
                        return (
                          <div key={idx} className="p-2.5 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-[#1C1917]">{tObj?.title || 'Topic'}</span>
                              <p className="text-[11px] text-[#71695F]">Planned Hours: {tObj?.planned_hours}h</p>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-[#EFE8DC]">
                              {tc.completion_percentage}% Done
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[#71695F] italic">No topics assigned to this session log.</p>
                  )}
                </div>

                {/* Classwork & Homework Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-[#EFE8DC]">
                    <span className="text-[10px] font-semibold uppercase text-[#71695F] block mb-1">
                      Classwork Covered
                    </span>
                    <p className="text-[#1C1917] text-xs leading-relaxed">
                      {inspectingLog.classwork_status || 'None specified.'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-[#EFE8DC]">
                    <span className="text-[10px] font-semibold uppercase text-[#71695F] block mb-1">
                      Homework / Tasks Assigned
                    </span>
                    <p className="text-[#1C1917] text-xs leading-relaxed">
                      {inspectingLog.homework_status || 'No homework assigned.'}
                    </p>
                  </div>
                </div>

                {/* Carry-forward Agenda */}
                {inspectingLog.carry_forward && (
                  <div className="p-3.5 rounded-2xl bg-[#FEF9E7] border border-[#FBE69B]">
                    <span className="text-[10px] font-semibold text-[#614800] block mb-0.5">
                      Carry-Forward Agenda / Next Steps
                    </span>
                    <p className="text-[#614800] text-xs font-medium">
                      {inspectingLog.carry_forward}
                    </p>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setInspectingLog(null)}
                    className="px-4 py-2 rounded-xl bg-[#1C1917] text-white font-medium text-xs cursor-pointer hover:bg-[#2C2825]"
                  >
                    Close Inspector
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Session Logging Modal */}
      <SessionLoggingModal
        isOpen={isLoggingModalOpen}
        onClose={() => setIsLoggingModalOpen(false)}
        preselectedSlot={selectedSlotForLog}
      />
    </div>
  );
};
