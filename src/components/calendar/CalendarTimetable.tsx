import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getBranches,
  getSemesters,
  getHolidays,
  getTimetable,
  getSubjects,
  getUsers,
  addHoliday,
  updateSemesterRules,
  saveTimetableEntry,
  getBatches,
  triggerPlannedDatesRecalculation,
} from '../../services/storage';
import { Semester, Holiday, TimetableEntry, BranchId, AcademicTrackId } from '../../types';
import { Modal } from '../common/Modal';
import {
  CalendarDays,
  Clock,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Settings2,
  Sparkles,
  MapPin,
  User,
  RefreshCw,
  Building2,
  Lock,
} from 'lucide-react';
import { StudentCalendarView } from './StudentCalendarView';

export const CalendarTimetable: React.FC = () => {
  const { currentUser, canManageAdmin, isCampusManager, isAdmin, isStudent } = useAuth();

  // If the logged-in user is a student, render the Student Calendar directly with read-only access
  if (isStudent || currentUser?.role === 'student') {
    return <StudentCalendarView />;
  }

  // Non-student roles (Admins, Campus Managers, Faculty) can toggle between Student Calendar and Management
  const [viewTab, setViewTab] = useState<'student_calendar' | 'timetable_admin'>('student_calendar');
  const branches = getBranches();

  const userAssignedBranch = (currentUser?.branch_id || currentUser?.campus_id) as BranchId | undefined;
  const initialBranch: BranchId = isCampusManager && userAssignedBranch ? userAssignedBranch : (userAssignedBranch || 'Ghaziabad');

  const [selectedBranch, setSelectedBranch] = useState<BranchId>(initialBranch);
  const [selectedTrack, setSelectedTrack] = useState<AcademicTrackId>(
    (currentUser?.assigned_track as AcademicTrackId) || 'Mirai Track'
  );

  useEffect(() => {
    if (isCampusManager && userAssignedBranch) {
      setSelectedBranch(userAssignedBranch);
    }
  }, [currentUser, isCampusManager, userAssignedBranch]);

  const semesters = getSemesters();
  const holidays = getHolidays();
  const timetable = getTimetable();
  const subjects = getSubjects();
  const users = getUsers();
  const batches = getBatches();

  const currentBranchRecord = branches.find((b) => b.id === selectedBranch) || branches[0];

  // Specific semester record for this branch and track
  const currentSemester = useMemo(() => {
    return (
      semesters.find(
        (s) => (s.branch_id === selectedBranch || s.campus_id === selectedBranch) && s.academic_track === selectedTrack
      ) ||
      semesters.find((s) => s.branch_id === selectedBranch || s.campus_id === selectedBranch) ||
      semesters[0]
    );
  }, [semesters, selectedBranch, selectedTrack]);

  const branchHolidays = useMemo(() => {
    return holidays.filter(
      (h) => !h.branch_id || h.branch_id === selectedBranch || h.campus_id === selectedBranch
    );
  }, [holidays, selectedBranch]);

  const branchTimetable = useMemo(() => {
    return timetable.filter(
      (t) => (t.branch_id || t.campus_id) === selectedBranch || (!t.branch_id && t.batch_id === currentSemester?.batch_id)
    );
  }, [timetable, selectedBranch, currentSemester]);

  const branchSubjects = useMemo(() => {
    return subjects.filter(
      (s) => (s.branch_id || s.campus_id) === selectedBranch || (!s.branch_id && s.batch_id === currentSemester?.batch_id)
    );
  }, [subjects, selectedBranch, currentSemester]);

  const facultyUsers = users.filter((u) => u.role === 'faculty' && (!u.branch_id || u.branch_id === selectedBranch));

  // Semester Settings state (synced with currentSemester)
  const [saturdayRule, setSaturdayRule] = useState<'all' | 'none' | 'second_fourth'>(
    currentSemester?.saturday_rule || 'second_fourth'
  );
  const [startDate, setStartDate] = useState(currentSemester?.start_date || '2026-08-01');
  const [endDate, setEndDate] = useState(currentSemester?.end_date || '2026-11-30');

  useEffect(() => {
    if (currentSemester) {
      setSaturdayRule(currentSemester.saturday_rule || 'second_fourth');
      setStartDate(currentSemester.start_date || '2026-08-01');
      setEndDate(currentSemester.end_date || '2026-11-30');
    }
  }, [currentSemester]);

  // Modals state
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('2026-10-02');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayNonTeaching, setNewHolidayNonTeaching] = useState(true);

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotSubjectId, setSlotSubjectId] = useState(branchSubjects[0]?.id || '');
  const [slotDayOfWeek, setSlotDayOfWeek] = useState(1);
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('10:30');
  const [slotDuration, setSlotDuration] = useState(1.5);
  const [slotRoom, setSlotRoom] = useState('LH-201');
  const [slotFacultyId, setSlotFacultyId] = useState(facultyUsers[0]?.id || '');

  const [notice, setNotice] = useState<string | null>(null);

  const canEdit = isAdmin || isCampusManager;

  const handleSaveSemesterRules = () => {
    if (!currentUser || !currentSemester) return;
    updateSemesterRules(
      currentSemester.id,
      {
        start_date: startDate,
        end_date: endDate,
        saturday_rule: saturdayRule,
      },
      currentUser
    );
    showNotice(`Academic Calendar rules saved for ${selectedBranch} (${selectedTrack})!`);
  };

  const handleAddHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentSemester) return;
    addHoliday(
      {
        semester_id: currentSemester.id,
        branch_id: selectedBranch,
        campus_id: selectedBranch,
        date: newHolidayDate,
        name: newHolidayName,
        is_non_teaching: newHolidayNonTeaching,
      },
      currentUser
    );
    setIsHolidayModalOpen(false);
    setNewHolidayName('');
    showNotice(`Added branch holiday "${newHolidayName}" to ${selectedBranch}.`);
  };

  const handleAddSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentSemester) return;
    saveTimetableEntry(
      {
        batch_id: currentSemester.batch_id,
        branch_id: selectedBranch,
        campus_id: selectedBranch,
        subject_id: slotSubjectId,
        day_of_week: Number(slotDayOfWeek),
        start_time: slotStartTime,
        end_time: slotEndTime,
        duration_hours: Number(slotDuration),
        room: slotRoom,
        faculty_id: slotFacultyId,
      },
      currentUser
    );
    setIsSlotModalOpen(false);
    showNotice(`Saved timetable slot for ${selectedBranch}!`);
  };

  const handleTriggerManualRecalculation = () => {
    if (!currentUser) return;
    branchSubjects.forEach((sub) => {
      triggerPlannedDatesRecalculation(sub.id, currentUser);
    });
    showNotice(`Recalculated planned syllabus delivery dates across all ${branchSubjects.length} subjects!`);
  };

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-6">
      {/* Calendar Mode Switcher for Admins / Managers / Faculty */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 px-4 rounded-2xl bg-white border border-[#EFE8DC] shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#1C1917]">Calendar Mode:</span>
          <div className="flex items-center p-1 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs">
            <button
              type="button"
              onClick={() => setViewTab('student_calendar')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                viewTab === 'student_calendar'
                  ? 'bg-[#1C1917] text-white shadow-2xs'
                  : 'text-[#71695F] hover:text-[#1C1917]'
              }`}
            >
              Student Calendar View
            </button>
            <button
              type="button"
              onClick={() => setViewTab('timetable_admin')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                viewTab === 'timetable_admin'
                  ? 'bg-[#1C1917] text-white shadow-2xs'
                  : 'text-[#71695F] hover:text-[#1C1917]'
              }`}
            >
              Timetable & Rules Management
            </button>
          </div>
        </div>
        <span className="text-xs text-[#8C8275]">
          Viewing as {currentUser?.role?.replace('_', ' ')}
        </span>
      </div>

      {viewTab === 'student_calendar' ? (
        <StudentCalendarView />
      ) : (
        <>
          {/* Top Filter and Controls Bar */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8DC] shadow-[0_2px_12px_rgba(28,25,23,0.03)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] px-3 py-0.5 rounded-full bg-[#FEF9E7] text-[#614800] border border-[#FBE69B] font-medium">
                    Academic Timetable
                  </span>
              <span className="text-xs text-[#71695F]">
                • {currentBranchRecord.name} ({currentBranchRecord.university_short_name})
              </span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#1C1917] tracking-tight">
              Academic Calendar & Timetable Rules
            </h1>
            <p className="text-xs text-[#71695F] mt-1 max-w-2xl leading-relaxed">
              Branch-specific teaching calendar for {currentBranchRecord.name} affiliated with {currentBranchRecord.university_affiliation}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Branch Selector */}
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs">
              <Building2 className="w-3.5 h-3.5 text-[#71695F]" />
              <span className="font-medium text-[#71695F]">Branch:</span>
              {isCampusManager ? (
                <div className="flex items-center gap-1.5 font-semibold text-[#1C1917]">
                  <span>{selectedBranch}</span>
                  <Lock className="w-3 h-3 text-[#B08800]" />
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

            {/* Track Selector */}
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs">
              <span className="font-medium text-[#71695F]">Track:</span>
              <select
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value as AcademicTrackId)}
                className="bg-transparent font-semibold text-[#1C1917] focus:outline-hidden cursor-pointer"
              >
                <option value="Mirai Track">Mirai Track</option>
                <option value="University Track">University Track ({currentBranchRecord.university_short_name})</option>
              </select>
            </div>

            <button
              onClick={handleTriggerManualRecalculation}
              className="px-3.5 py-2 rounded-xl border border-[#EFE8DC] bg-white hover:bg-[#FAF7F0] text-[#1C1917] font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#1C1917]" />
              <span>Recalculate Dates</span>
            </button>
            {canEdit && (
              <button
                onClick={() => setIsSlotModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#2C2825] text-white font-medium text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#FBE69B]" />
                <span>Add Slot</span>
              </button>
            )}
          </div>
        </div>

        {notice && (
          <div className="mt-4 p-3.5 rounded-2xl bg-[#EEF7EF] border border-[#C8E8CD] text-[#1E4627] font-medium text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
            <span>{notice}</span>
          </div>
        )}
      </div>

      {/* Grid: Semester Dates & Saturday Rule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Semester Configuration */}
        <div className="warm-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EFE8DC]">
            <Settings2 className="w-4 h-4 text-[#1C1917]" />
            <h3 className="font-semibold text-[#1C1917] text-sm">
              Semester Window & Saturday Policy
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-[#1C1917] mb-1">
                Semester Start Date
              </label>
              <input
                type="date"
                disabled={!canEdit}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
              />
            </div>

            <div>
              <label className="block font-medium text-[#1C1917] mb-1">
                Semester End Date
              </label>
              <input
                type="date"
                disabled={!canEdit}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
              />
            </div>

            <div>
              <label className="block font-medium text-[#1C1917] mb-1">
                Saturday Working Rule
              </label>
              <select
                disabled={!canEdit}
                value={saturdayRule}
                onChange={(e) => setSaturdayRule(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-medium text-[#1C1917]"
              >
                <option value="second_fourth">
                  second_fourth (2nd & 4th Saturdays Off - Standard)
                </option>
                <option value="all">all (All Saturdays are Teaching Days)</option>
                <option value="none">none (All Saturdays are Holidays)</option>
              </select>
              <p className="text-[11px] text-[#71695F] mt-1 leading-normal">
                Under 'second_fourth', 1st, 3rd, and 5th Saturdays are active teaching days.
              </p>
            </div>

            {canEdit && (
              <button
                onClick={handleSaveSemesterRules}
                className="w-full py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#2C2825] text-white font-medium text-xs shadow-xs transition-all cursor-pointer mt-2"
              >
                Save Calendar Rules
              </button>
            )}
          </div>
        </div>

        {/* Declared Holidays List */}
        <div className="lg:col-span-2 warm-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EFE8DC]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1C1917]" />
              <h3 className="font-semibold text-[#1C1917] text-sm">
                Declared Holidays & Non-Teaching Days ({branchHolidays.length})
              </h3>
            </div>
            {canEdit && (
              <button
                onClick={() => setIsHolidayModalOpen(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7F0] border border-[#EFE8DC] text-[#1C1917] transition-colors cursor-pointer"
              >
                + Add Holiday
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
            {branchHolidays.map((hol) => (
              <div
                key={hol.id}
                className="p-3.5 rounded-2xl border border-[#EFE8DC] bg-[#FDFBF7] flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-medium text-[#1C1917]">{hol.name}</p>
                  <p className="text-[11px] text-[#71695F] flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 text-[#9C9488]" />
                    <span>{hol.date}</span>
                    {hol.branch_id && (
                      <span className="ml-1 text-[10px] font-medium text-[#701C2F] bg-[#FDF2F4] px-1.5 py-0.2 rounded border border-[#F8CAD4]">
                        {hol.branch_id}
                      </span>
                    )}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FDF2F4] text-[#701C2F] border border-[#F8CAD4]">
                  Non-Teaching
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timetable Grid View */}
      <div className="warm-card overflow-hidden">
        <div className="px-6 py-4.5 border-b border-[#EFE8DC] bg-[#FAF7F0] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#1C1917] text-base tracking-tight">
              Weekly Timetable Allocation ({selectedBranch})
            </h3>
            <p className="text-xs text-[#71695F]">
              Recurring timetable slots used to compute available future hours for {currentBranchRecord.name}.
            </p>
          </div>
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-white border border-[#EFE8DC] text-[#1C1917]">
            {branchTimetable.length} Active Slots
          </span>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((dayNum) => {
              const daySlots = branchTimetable.filter((t) => t.day_of_week === dayNum);
              return (
                <div
                  key={dayNum}
                  className="p-4 rounded-2xl border border-[#EFE8DC] bg-[#FDFBF7] space-y-2.5"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#EFE8DC]">
                    <span className="font-semibold text-xs text-[#1C1917]">
                      {dayNames[dayNum]}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FAF7F0] text-[#71695F] border border-[#EFE8DC]">
                      {daySlots.length} Classes
                    </span>
                  </div>

                  <div className="space-y-2">
                    {daySlots.length === 0 ? (
                      <p className="text-[11px] text-[#71695F] italic py-2">No slots configured.</p>
                    ) : (
                      daySlots.map((slot) => {
                        const sub = subjects.find((s) => s.id === slot.subject_id);
                        return (
                          <div
                            key={slot.id}
                            className="p-2.5 rounded-xl bg-white border border-[#EFE8DC] shadow-2xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-xs text-[#1C1917]">
                                {sub?.code} - {sub?.name}
                              </span>
                              <span className="text-[10px] text-[#71695F]">
                                {slot.duration_hours}h
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[#71695F]">
                              <span>{slot.start_time} - {slot.end_time}</span>
                              <span>Room: {slot.room}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Holiday Modal */}
      <Modal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="Add Declared Academic Holiday"
        maxWidth="md"
      >
        <form onSubmit={handleAddHolidaySubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Holiday Date
            </label>
            <input
              type="date"
              required
              value={newHolidayDate}
              onChange={(e) => setNewHolidayDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
            />
          </div>

          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Holiday Name / Reason
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Innovation Day / Regional Festival"
              value={newHolidayName}
              onChange={(e) => setNewHolidayName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={newHolidayNonTeaching}
              onChange={(e) => setNewHolidayNonTeaching(e.target.checked)}
              className="rounded border-[#EFE8DC] text-[#1C1917]"
            />
            <span className="font-medium text-[#1C1917]">
              Class delivery suspended on this date (Non-teaching day)
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE8DC]">
            <button
              type="button"
              onClick={() => setIsHolidayModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#EFE8DC] bg-white text-[#1C1917] font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#2C2825] text-white font-medium cursor-pointer"
            >
              Save Holiday & Recalculate
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Slot Modal */}
      <Modal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        title="Add Timetable Slot"
        maxWidth="lg"
      >
        <form onSubmit={handleAddSlotSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#1C1917] mb-1">
                Subject
              </label>
              <select
                value={slotSubjectId}
                onChange={(e) => setSlotSubjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-medium text-[#1C1917]"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code}: {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#1C1917] mb-1">
                Day of Week
              </label>
              <select
                value={slotDayOfWeek}
                onChange={(e) => setSlotDayOfWeek(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-medium text-[#1C1917]"
              >
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-[#1C1917] mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={slotStartTime}
                onChange={(e) => setSlotStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
              />
            </div>

            <div>
              <label className="block font-medium text-[#1C1917] mb-1">
                End Time
              </label>
              <input
                type="time"
                value={slotEndTime}
                onChange={(e) => setSlotEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
              />
            </div>

            <div>
              <label className="block font-medium text-[#1C1917] mb-1">
                Duration (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={slotDuration}
                onChange={(e) => setSlotDuration(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#1C1917] mb-1">
                Room Number
              </label>
              <input
                type="text"
                value={slotRoom}
                onChange={(e) => setSlotRoom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
              />
            </div>

            <div>
              <label className="block font-medium text-[#1C1917] mb-1">
                Assigned Faculty
              </label>
              <select
                value={slotFacultyId}
                onChange={(e) => setSlotFacultyId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-medium text-[#1C1917]"
              >
                {facultyUsers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE8DC]">
            <button
              type="button"
              onClick={() => setIsSlotModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#EFE8DC] bg-white text-[#1C1917] font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#2C2825] text-white font-medium cursor-pointer"
            >
              Save Slot & Reallocate
            </button>
          </div>
        </form>
      </Modal>
        </>
      )}
    </div>
  );
};
