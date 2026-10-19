import React, { useState, useMemo } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getBatchesForUser,
  getSubjectsForUser,
  getExaminationsForUser,
  getTimetable,
  getHolidays,
  getSubjects,
  getBatches,
  getBranches,
  getSemesters,
  getUsers,
  getTopics,
  getApprovedExtraClasses,
} from '../../services/storage';
import {
  TimetableEntry,
  Subject,
  Examination,
  Holiday,
  Batch,
  BranchId,
  AcademicTrackId,
} from '../../types';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  GraduationCap,
  Sparkles,
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Building2,
  X,
  Filter,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export type CalendarViewMode = 'daily' | 'weekly' | 'monthly';

export interface CalendarEvent {
  id: string;
  title: string;
  code?: string;
  category: 'lecture' | 'lab' | 'exam' | 'holiday' | 'extra_class';
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 1 = Mon ... 7 = Sun
  startTime: string; // HH:MM (e.g. "09:00")
  endTime: string; // HH:MM (e.g. "10:30")
  durationHours: number;
  room?: string;
  facultyName?: string;
  subjectId?: string;
  academicTrack?: AcademicTrackId;
  branchId?: BranchId;
  inExamScope?: boolean;
  topicsCoveredSummary?: string;
  notes?: string;
  isExtraClass?: boolean;
}

export const StudentCalendarView: React.FC = () => {
  const { currentUser, isStudent, isAdmin, isCampusManager, isFaculty } = useAuth();

  // Load database entities
  const allBranches = getBranches();
  const allBatches = getBatches();
  const allSubjects = getSubjects();
  const allTimetable = getTimetable();
  const allHolidays = getHolidays();
  const allUsers = getUsers();
  const allTopics = getTopics();

  // Active student context
  const userBatches = getBatchesForUser(currentUser);
  const userCampus = currentUser?.branch_id || currentUser?.campus_id;

  const selectableBatches = useMemo(() => {
    if (isAdmin) return allBatches;
    if (isFaculty) {
      const ub = getBatchesForUser(currentUser);
      return ub.length > 0 ? ub : allBatches.filter((b) => (b.branch_id || b.campus_id) === userCampus);
    }
    if (isCampusManager) {
      return allBatches.filter((b) => (b.branch_id || b.campus_id) === userCampus);
    }
    return userBatches;
  }, [isAdmin, isFaculty, isCampusManager, allBatches, currentUser, userCampus, userBatches]);

  const defaultBatch = selectableBatches[0] || userBatches[0] || allBatches[0];

  // For Admin / Faculty / Campus Manager: allow switching branch / batch context
  const [selectedBatchId, setSelectedBatchId] = useState<string>(defaultBatch?.id || '');
  const activeBatch = selectableBatches.find((b) => b.id === selectedBatchId) || defaultBatch;

  const activeBranchId = (activeBatch?.branch_id || currentUser?.branch_id || 'Ghaziabad') as BranchId;
  const activeTrack = (activeBatch?.academic_track || currentUser?.assigned_track || 'Mirai Track') as AcademicTrackId;

  // Selected Date state (Default to application reference term date: 2026-09-18, Friday)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 8, 18)); // Sept 18, 2026

  // View mode: 'daily' | 'weekly' | 'monthly'
  const [viewMode, setViewMode] = useState<CalendarViewMode>('weekly');

  // Mini calendar month navigation state
  const [miniCalendarMonth, setMiniCalendarMonth] = useState<Date>(new Date(2026, 8, 1)); // September 2026

  // Event category filters ("My Calendar" checklist)
  const [enabledCategories, setEnabledCategories] = useState<Record<string, boolean>>({
    lecture: true,
    lab: true,
    exam: true,
    holiday: true,
    extra_class: true,
  });

  // Selected event for Detail Panel
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Filter timetable entries for active student's batch, branch, and track
  const studentTimetable = useMemo(() => {
    return allTimetable.filter((t) => {
      if (t.batch_id === activeBatch?.id) return true;
      const matchBranch = (t.branch_id || t.campus_id) === activeBranchId;
      const matchTrack = t.academic_track === activeTrack;
      return matchBranch && matchTrack;
    });
  }, [allTimetable, activeBatch, activeBranchId, activeTrack]);

  // Filter subjects
  const studentSubjects = useMemo(() => {
    return allSubjects.filter((s) => {
      if (s.batch_id === activeBatch?.id) return true;
      const matchBranch = (s.branch_id || s.campus_id) === activeBranchId;
      const matchTrack = s.academic_track === activeTrack;
      return matchBranch && matchTrack;
    });
  }, [allSubjects, activeBatch, activeBranchId, activeTrack]);

  // Filter exams for active batch
  const studentExams = useMemo(() => {
    const exams = getExaminationsForUser(currentUser);
    const filtered = exams.filter(
      (e) =>
        e.batch_id === activeBatch?.id ||
        (e.branch_id === activeBranchId && e.academic_track === activeTrack)
    );
    return filtered.length > 0
      ? filtered
      : exams.filter((e) => e.branch_id === activeBranchId);
  }, [currentUser, activeBatch, activeBranchId, activeTrack]);

  // Filter holidays for active branch
  const studentHolidays = useMemo(() => {
    return allHolidays.filter(
      (h) => !h.branch_id || h.branch_id === activeBranchId || h.campus_id === activeBranchId
    );
  }, [allHolidays, activeBranchId]);

  // Filter confirmed approved extra classes for active student's batch or campus
  const studentApprovedExtraClasses = useMemo(() => {
    const list = getApprovedExtraClasses();
    return list.filter((c) => {
      if (activeBatch && c.batch_id === activeBatch.id) return true;
      const matchBranch = c.branch_id === activeBranchId;
      const matchTrack = c.academic_track === activeTrack;
      return matchBranch && matchTrack;
    });
  }, [activeBatch, activeBranchId, activeTrack]);

  // Date helper utilities
  const formatYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getDayOfWeek = (d: Date): number => {
    const day = d.getDay();
    return day === 0 ? 7 : day; // Mon=1 ... Sun=7
  };

  // Compute current week's dates (Monday to Saturday/Sunday)
  const currentWeekDays = useMemo(() => {
    const curr = new Date(selectedDate);
    const day = curr.getDay();
    const diffToMonday = curr.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(curr.setDate(diffToMonday));

    const week: Date[] = [];
    for (let i = 0; i < 6; i++) {
      // Mon to Sat (academic working days)
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  }, [selectedDate]);

  // Build events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = formatYMD(date);
    const dayOfWeek = getDayOfWeek(date);
    const events: CalendarEvent[] = [];

    // 1. Regular Timetable classes
    if (enabledCategories.lecture || enabledCategories.lab) {
      const daySlots = studentTimetable.filter((t) => t.day_of_week === dayOfWeek);
      daySlots.forEach((slot) => {
        const sub = studentSubjects.find((s) => s.id === slot.subject_id);
        const faculty = allUsers.find((u) => u.id === slot.faculty_id);
        const isLab = (sub?.name || '').toLowerCase().includes('lab') || slot.duration_hours > 2;
        const category = isLab ? 'lab' : 'lecture';

        if (enabledCategories[category]) {
          const subTopics = allTopics.filter((t) => t.subject_id === sub?.id);
          const inScopeTopics = subTopics.filter((t) => t.in_exam_scope);

          events.push({
            id: `class-${slot.id}-${dateStr}`,
            title: sub?.name || 'Class Session',
            code: sub?.code || 'CS',
            category,
            date: dateStr,
            dayOfWeek,
            startTime: slot.start_time,
            endTime: slot.end_time,
            durationHours: slot.duration_hours,
            room: slot.room,
            facultyName: faculty?.name || sub?.faculty_name,
            subjectId: sub?.id,
            academicTrack: slot.academic_track || activeTrack,
            branchId: slot.branch_id || activeBranchId,
            inExamScope: inScopeTopics.length > 0,
            topicsCoveredSummary: `${inScopeTopics.length} topics in exam syllabus scope`,
          });
        }
      });
    }

    // 2. Scheduled Examinations
    if (enabledCategories.exam) {
      const dayExams = studentExams.filter((e) => e.exam_date === dateStr);
      dayExams.forEach((exam) => {
        const sub = studentSubjects.find((s) => s.id === exam.subject_id);
        events.push({
          id: `exam-${exam.id}-${dateStr}`,
          title: exam.name,
          code: sub?.code || 'EXAM',
          category: 'exam',
          date: dateStr,
          dayOfWeek,
          startTime: '10:00',
          endTime: '13:00',
          durationHours: 3.0,
          room: 'Main Examination Hall',
          facultyName: 'Controller of Examinations',
          subjectId: exam.subject_id,
          academicTrack: exam.academic_track || activeTrack,
          branchId: exam.branch_id || activeBranchId,
          inExamScope: true,
          topicsCoveredSummary: `${exam.syllabus_scope_topic_ids?.length || 3} formal syllabus topics in scope`,
        });
      });
    }

    // 3. Academic Holidays & Breaks
    if (enabledCategories.holiday) {
      const dayHolidays = studentHolidays.filter((h) => h.date === dateStr);
      dayHolidays.forEach((hol) => {
        events.push({
          id: `hol-${hol.id}-${dateStr}`,
          title: hol.name,
          category: 'holiday',
          date: dateStr,
          dayOfWeek,
          startTime: '08:00',
          endTime: '17:00',
          durationHours: 9.0,
          room: 'Campus Closed',
          branchId: hol.branch_id || activeBranchId,
          academicTrack: activeTrack,
          topicsCoveredSummary: hol.is_non_teaching ? 'Non-Teaching Academic Holiday' : 'Campus Event',
        });
      });
    }

    // 4. Approved Extra Classes (Confirmed official events; pending requests NEVER appear)
    if (enabledCategories.extra_class) {
      const dayExtraClasses = studentApprovedExtraClasses.filter((c) => c.date === dateStr);
      dayExtraClasses.forEach((ec) => {
        events.push({
          id: `extraclass-${ec.id}-${dateStr}`,
          title: ec.subject_name || 'Extra Class Session',
          code: ec.subject_code || 'EXTRA',
          category: 'extra_class',
          date: dateStr,
          dayOfWeek,
          startTime: ec.start_time,
          endTime: ec.end_time,
          durationHours: ec.duration_hours,
          room: ec.room || 'Seminar Hall',
          facultyName: ec.faculty_name,
          subjectId: ec.subject_id,
          academicTrack: ec.academic_track || activeTrack,
          branchId: ec.branch_id || activeBranchId,
          inExamScope: true,
          topicsCoveredSummary:
            ec.topic_titles && ec.topic_titles.length > 0
              ? ec.topic_titles.join(', ')
              : ec.reason,
          notes: ec.reason,
          isExtraClass: true,
        });
      });
    }

    return events;
  };

  // Upcoming events for the left sidebar widget
  const upcomingEvents = useMemo(() => {
    const list: CalendarEvent[] = [];
    const base = new Date(selectedDate);

    for (let offset = 0; offset < 14; offset++) {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      const dayEvents = getEventsForDate(d);
      dayEvents.forEach((ev) => {
        if (list.length < 5) list.push(ev);
      });
      if (list.length >= 5) break;
    }
    return list;
  }, [selectedDate, studentTimetable, studentExams, studentHolidays, studentApprovedExtraClasses, enabledCategories]);

  // Mini Calendar grid generation
  const miniCalendarDays = useMemo(() => {
    const year = miniCalendarMonth.getFullYear();
    const month = miniCalendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Adjust for Monday start: Sun(0) -> 6, Mon(1) -> 0 ...
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const days: Array<{ date: Date; isCurrentMonth: boolean; hasEvents: boolean }> = [];

    // Previous month filler
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = offset - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
        hasEvents: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      const events = getEventsForDate(dayDate);
      days.push({
        date: dayDate,
        isCurrentMonth: true,
        hasEvents: events.length > 0,
      });
    }

    // Next month filler
    const remaining = 35 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        date: new Date(year, month + 1, d),
        isCurrentMonth: false,
        hasEvents: false,
      });
    }

    return days;
  }, [miniCalendarMonth, studentTimetable, studentExams, studentHolidays, studentApprovedExtraClasses, enabledCategories]);

  // Navigation handlers
  const handlePrevDate = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'daily') d.setDate(d.getDate() - 1);
    else if (viewMode === 'weekly') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setSelectedDate(d);
    setMiniCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const handleNextDate = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'daily') d.setDate(d.getDate() + 1);
    else if (viewMode === 'weekly') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setSelectedDate(d);
    setMiniCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const handleGoToday = () => {
    const today = new Date(2026, 8, 18); // System academic date (Friday Sept 18, 2026)
    setSelectedDate(today);
    setMiniCalendarMonth(new Date(2026, 8, 1));
  };

  const handleSelectDay = (day: Date) => {
    setSelectedDate(day);
  };

  // Time grid configuration: 08:00 AM to 05:00 PM (17:00)
  const timeSlots = [
    { hour: 8, label: '08:00 AM' },
    { hour: 9, label: '09:00 AM' },
    { hour: 10, label: '10:00 AM' },
    { hour: 11, label: '11:00 AM' },
    { hour: 12, label: '12:00 PM' },
    { hour: 13, label: '01:00 PM' },
    { hour: 14, label: '02:00 PM' },
    { hour: 15, label: '03:00 PM' },
    { hour: 16, label: '04:00 PM' },
    { hour: 17, label: '05:00 PM' },
  ];

  const hourHeight = 68; // px per hour slot

  // Calculate pixel top and height for an event block
  const calculateEventPosition = (ev: CalendarEvent) => {
    const [startH, startM] = ev.startTime.split(':').map(Number);
    const startOffsetHours = startH - 8 + startM / 60;
    const top = Math.max(0, startOffsetHours * hourHeight);
    const height = Math.max(48, ev.durationHours * hourHeight - 6);
    return { top, height };
  };

  // Event category color styling (preserves application's warm cream/ivory & pastel system)
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'lecture':
        return {
          bg: 'bg-[#F0F6FD]',
          border: 'border-[#CCE0F9]',
          text: 'text-[#193B6D]',
          badge: 'bg-[#193B6D]/10 text-[#193B6D]',
          dot: 'bg-[#38BDF8]',
        };
      case 'lab':
        return {
          bg: 'bg-[#EEF7EF]',
          border: 'border-[#C8E8CD]',
          text: 'text-[#1E4627]',
          badge: 'bg-[#1E4627]/10 text-[#1E4627]',
          dot: 'bg-[#4ADE80]',
        };
      case 'exam':
        return {
          bg: 'bg-[#FDF2F4]',
          border: 'border-[#F8CAD4]',
          text: 'text-[#701C2F]',
          badge: 'bg-[#701C2F]/10 text-[#701C2F]',
          dot: 'bg-[#F472B6]',
        };
      case 'holiday':
        return {
          bg: 'bg-[#FEF9E7]',
          border: 'border-[#FBE69B]',
          text: 'text-[#614800]',
          badge: 'bg-[#614800]/10 text-[#614800]',
          dot: 'bg-[#FACC15]',
        };
      case 'extra_class':
        return {
          bg: 'bg-[#FFFBEB]',
          border: 'border-[#FDE68A]',
          text: 'text-[#92400E]',
          badge: 'bg-[#FDE68A]/60 text-[#92400E]',
          dot: 'bg-[#F59E0B]',
        };
      default:
        return {
          bg: 'bg-[#FAF7F0]',
          border: 'border-[#EFE8DC]',
          text: 'text-[#1C1917]',
          badge: 'bg-[#1C1917]/10 text-[#1C1917]',
          dot: 'bg-[#9C9488]',
        };
    }
  };

  // Format header title based on view mode
  const headerDateTitle = useMemo(() => {
    if (viewMode === 'daily') {
      return selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (viewMode === 'weekly') {
      const start = currentWeekDays[0];
      const end = currentWeekDays[currentWeekDays.length - 1];
      const sameMonth = start.getMonth() === end.getMonth();
      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = sameMonth
        ? end.getDate()
        : end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${startStr} – ${endStr}, ${end.getFullYear()}`;
    }
    return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [viewMode, selectedDate, currentWeekDays]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8DC] shadow-[0_2px_12px_rgba(28,25,23,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] px-3 py-0.5 rounded-full bg-[#EEF7EF] text-[#1E4627] border border-[#C8E8CD] font-medium flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Student Timetable & Calendar</span>
            </span>
            <span className="text-xs text-[#71695F]">
              • {activeBranchId} Campus ({activeTrack})
            </span>
          </div>

          <h1 className="text-2xl sm:text-[28px] font-serif font-bold tracking-tight text-[#1C1917]">
            My Academic Calendar
          </h1>
          <p className="text-xs text-[#71695F] mt-1 leading-relaxed">
            Personalized class schedule, laboratory sessions, upcoming examinations and official non-teaching breaks.
          </p>
        </div>

        {/* Batch & Campus Context Tag / Selector */}
        <div className="flex items-center gap-3 shrink-0">
          {!isStudent && selectableBatches.length > 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#71695F]">Select Batch:</span>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white text-xs font-medium text-[#1C1917] focus:outline-hidden cursor-pointer"
              >
                {selectableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.academic_track})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="px-4 py-2.5 rounded-2xl bg-[#FEF9E7] border border-[#FBE69B] text-xs shrink-0">
              <span className="text-[#614800] block text-[10px] font-medium uppercase tracking-wider">
                {isFaculty ? 'Assigned Batch' : 'Current Enrollment'}
              </span>
              <span className="font-bold text-[#614800] block text-xs mt-0.5 truncate max-w-[200px]">
                {activeBatch?.name || 'Academic Batch'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* THREE-PART LAYOUT: LEFT COLUMN (Compact Calendar & Checklists) + RIGHT MAIN AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN (lg:col-span-4 xl:col-span-3 space-y-5)      */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-5">
          {/* 1. Compact Monthly Calendar Card */}
          <div className="warm-card p-5 bg-white">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#EFE8DC]">
              <span className="font-semibold text-xs text-[#1C1917]">
                {miniCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const prev = new Date(miniCalendarMonth);
                    prev.setMonth(prev.getMonth() - 1);
                    setMiniCalendarMonth(prev);
                  }}
                  className="p-1 rounded-lg hover:bg-[#FAF7F0] text-[#71695F] hover:text-[#1C1917] transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(miniCalendarMonth);
                    next.setMonth(next.getMonth() + 1);
                    setMiniCalendarMonth(next);
                  }}
                  className="p-1 rounded-lg hover:bg-[#FAF7F0] text-[#71695F] hover:text-[#1C1917] transition-colors cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-[#8C8275] mb-2">
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
              <span>Su</span>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {miniCalendarDays.map((item, index) => {
                const isSelected = formatYMD(item.date) === formatYMD(selectedDate);
                const isToday = formatYMD(item.date) === '2026-09-18';

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectDay(item.date)}
                    className={`h-7.5 w-7.5 mx-auto rounded-full flex flex-col items-center justify-center text-[11px] font-medium transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-[#1C1917] text-[#FAF7F0] font-bold shadow-xs'
                        : isToday
                        ? 'bg-[#FEF9E7] text-[#614800] border border-[#FBE69B] font-bold'
                        : item.isCurrentMonth
                        ? 'text-[#1C1917] hover:bg-[#FAF7F0]'
                        : 'text-[#C5BDB0] hover:text-[#71695F]'
                    }`}
                  >
                    <span>{item.date.getDate()}</span>
                    {item.hasEvents && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-[#22C55E] absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. "My Calendar" Event Category Checklist Card */}
          <div className="warm-card p-5 bg-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#EFE8DC]">
              <span className="font-semibold text-xs text-[#1C1917]">My Calendar Filters</span>
              <span className="text-[10px] text-[#8C8275]">Checklist</span>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Lecture category */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" />
                  <span className="text-[#1C1917] group-hover:text-black">Lectures & Theory</span>
                </div>
                <input
                  type="checkbox"
                  checked={enabledCategories.lecture}
                  onChange={(e) =>
                    setEnabledCategories((prev) => ({ ...prev, lecture: e.target.checked }))
                  }
                  className="rounded border-[#EFE8DC] text-[#193B6D] focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Lab category */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80]" />
                  <span className="text-[#1C1917] group-hover:text-black">Labs & Practicals</span>
                </div>
                <input
                  type="checkbox"
                  checked={enabledCategories.lab}
                  onChange={(e) =>
                    setEnabledCategories((prev) => ({ ...prev, lab: e.target.checked }))
                  }
                  className="rounded border-[#EFE8DC] text-[#1E4627] focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Exam category */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F472B6]" />
                  <span className="text-[#1C1917] group-hover:text-black">Exams & Assessments</span>
                </div>
                <input
                  type="checkbox"
                  checked={enabledCategories.exam}
                  onChange={(e) =>
                    setEnabledCategories((prev) => ({ ...prev, exam: e.target.checked }))
                  }
                  className="rounded border-[#EFE8DC] text-[#701C2F] focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Holiday category */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FACC15]" />
                  <span className="text-[#1C1917] group-hover:text-black">Academic Holidays</span>
                </div>
                <input
                  type="checkbox"
                  checked={enabledCategories.holiday}
                  onChange={(e) =>
                    setEnabledCategories((prev) => ({ ...prev, holiday: e.target.checked }))
                  }
                  className="rounded border-[#EFE8DC] text-[#614800] focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Extra Class category */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="text-[#1C1917] group-hover:text-black">Extra Classes</span>
                </div>
                <input
                  type="checkbox"
                  checked={enabledCategories.extra_class}
                  onChange={(e) =>
                    setEnabledCategories((prev) => ({ ...prev, extra_class: e.target.checked }))
                  }
                  className="rounded border-[#EFE8DC] text-[#92400E] focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* 3. "Upcoming Events" Card */}
          <div className="warm-card p-5 bg-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#EFE8DC]">
              <span className="font-semibold text-xs text-[#1C1917]">Upcoming Schedule</span>
              <span className="text-[10px] text-[#8C8275]">Next 2 Weeks</span>
            </div>

            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-[#8C8275] italic">No upcoming events matching filters.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingEvents.map((ev) => {
                  const style = getCategoryStyles(ev.category);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer hover:shadow-2xs ${style.bg} ${style.border}`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${style.badge}`}>
                          {ev.category.toUpperCase()}
                        </span>
                        <span className="font-medium text-[#71695F]">
                          {ev.date.slice(5)} • {ev.startTime}
                        </span>
                      </div>
                      <h4 className={`text-xs font-semibold mt-1 truncate ${style.text}`}>
                        {ev.title}
                      </h4>
                      {ev.room && (
                        <p className="text-[10px] text-[#71695F] mt-0.5 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span>{ev.room}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: MAIN CALENDAR AREA (lg:col-span-8 xl:col-span-9) */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* Main Calendar Navigation Header Bar */}
          <div className="p-4 bg-white rounded-2xl border border-[#EFE8DC] shadow-[0_2px_10px_rgba(28,25,23,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Selected Range Title + Prev/Next/Today */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleGoToday}
                className="px-3 py-1.5 rounded-xl bg-[#FAF7F0] hover:bg-[#EFE8DC] border border-[#EFE8DC] text-xs font-semibold text-[#1C1917] transition-colors cursor-pointer"
              >
                Today
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevDate}
                  className="p-1.5 rounded-xl border border-[#EFE8DC] hover:bg-[#FAF7F0] text-[#71695F] hover:text-[#1C1917] transition-colors cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextDate}
                  className="p-1.5 rounded-xl border border-[#EFE8DC] hover:bg-[#FAF7F0] text-[#71695F] hover:text-[#1C1917] transition-colors cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <h2 className="font-serif font-bold text-sm sm:text-base text-[#1C1917] ml-1">
                {headerDateTitle}
              </h2>
            </div>

            {/* Right: View Mode Toggle (Daily / Weekly / Monthly) */}
            <div className="flex items-center p-1 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs font-medium self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'daily'
                    ? 'bg-[#1C1917] text-white font-semibold shadow-2xs'
                    : 'text-[#71695F] hover:text-[#1C1917]'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'weekly'
                    ? 'bg-[#1C1917] text-white font-semibold shadow-2xs'
                    : 'text-[#71695F] hover:text-[#1C1917]'
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'monthly'
                    ? 'bg-[#1C1917] text-white font-semibold shadow-2xs'
                    : 'text-[#71695F] hover:text-[#1C1917]'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {/* MAIN CALENDAR CONTENT CONTAINER */}
          <div className="bg-white rounded-3xl border border-[#EFE8DC] shadow-[0_2px_12px_rgba(28,25,23,0.03)] overflow-hidden">
            {/* ------------------------------------------------------------- */}
            {/* VIEW 1: WEEKLY TIMETABLE GRID (Primary Layout from Reference) */}
            {/* ------------------------------------------------------------- */}
            {viewMode === 'weekly' && (
              <div className="overflow-x-auto">
                <div style={{ minWidth: '720px' }}>
                  {/* Day Column Headers */}
                  <div className="grid grid-cols-7 border-b border-[#EFE8DC] bg-[#FDFBF7]">
                    {/* Top-left Timezone Header */}
                    <div className="p-3.5 border-r border-[#EFE8DC] text-center text-[11px] font-semibold text-[#8C8275] flex items-center justify-center">
                      <span>GMT+5:30</span>
                    </div>

                    {/* Day Headers (Mon - Sat) */}
                    {currentWeekDays.map((day, idx) => {
                      const isSelected = formatYMD(day) === formatYMD(selectedDate);
                      const isToday = formatYMD(day) === '2026-09-18';
                      const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                      const dayNum = day.getDate();

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedDate(day)}
                          className={`p-3 text-center border-r last:border-r-0 border-[#EFE8DC] cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#FAF7F0]' : 'hover:bg-[#FAF7F0]/60'
                          }`}
                        >
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isSelected
                                ? 'bg-[#1C1917] text-white shadow-xs'
                                : isToday
                                ? 'bg-[#FEF9E7] text-[#614800] border border-[#FBE69B]'
                                : 'text-[#1C1917]'
                            }`}
                          >
                            {dayNum}
                          </span>
                          <span className="block text-[11px] font-medium text-[#71695F] mt-0.5">
                            {dayName}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Timetable Body (Rows: 08:00 - 17:00, Columns: Days) */}
                  <div className="relative">
                    {/* Horizontal Current Time Indicator Line (at ~10:00 AM) */}
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                      style={{ top: `${(10 - 8) * hourHeight}px` }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[#E11D48] -ml-1 border-2 border-white shadow-xs" />
                      <div className="flex-1 border-t-2 border-[#E11D48]/70 border-dashed" />
                    </div>

                    {/* Grid Rows for each Hour */}
                    <div className="divide-y divide-[#EFE8DC]/80">
                      {timeSlots.map((slot) => (
                        <div
                          key={slot.hour}
                          className="grid grid-cols-7"
                          style={{ height: `${hourHeight}px` }}
                        >
                          {/* Left Hour Label */}
                          <div className="p-2 border-r border-[#EFE8DC] text-right text-[11px] font-semibold text-[#8C8275] bg-[#FDFBF7]/60">
                            {slot.label}
                          </div>

                          {/* 6 Column cells for each day */}
                          {currentWeekDays.map((day, dIdx) => (
                            <div
                              key={dIdx}
                              className="border-r last:border-r-0 border-[#EFE8DC]/60 relative"
                            />
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Rendered Event Blocks Layer */}
                    <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                      {/* Empty first column for time labels */}
                      <div className="border-r border-transparent" />

                      {/* Day Columns containing absolute-positioned events */}
                      {currentWeekDays.map((day, dIdx) => {
                        const dayEvents = getEventsForDate(day);

                        return (
                          <div
                            key={dIdx}
                            className="relative border-r last:border-r-0 border-transparent p-1 pointer-events-auto"
                          >
                            {dayEvents.map((ev) => {
                              const pos = calculateEventPosition(ev);
                              const style = getCategoryStyles(ev.category);

                              return (
                                <div
                                  key={ev.id}
                                  onClick={() => setSelectedEvent(ev)}
                                  style={{
                                    top: `${pos.top}px`,
                                    height: `${pos.height}px`,
                                  }}
                                  className={`absolute left-1 right-1 rounded-2xl p-2.5 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.02] hover:z-30 flex flex-col justify-between overflow-hidden select-none ${style.bg} ${style.border}`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span
                                        className={`px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider text-[9px] ${style.badge}`}
                                      >
                                        {ev.code || ev.category}
                                      </span>
                                      <span className="text-[10px] font-medium text-[#71695F]">
                                        {ev.startTime}
                                      </span>
                                    </div>
                                    <h4
                                      className={`text-xs font-semibold mt-1 leading-snug line-clamp-2 ${style.text}`}
                                    >
                                      {ev.title}
                                    </h4>
                                  </div>

                                  <div className="flex items-center justify-between text-[10px] text-[#71695F] pt-1">
                                    <span className="truncate">{ev.room || 'Campus'}</span>
                                    {ev.facultyName && (
                                      <span className="truncate max-w-[80px]">
                                        {ev.facultyName.split(' ').pop()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* VIEW 2: DAILY VIEW                                           */}
            {/* ------------------------------------------------------------- */}
            {viewMode === 'daily' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFE8DC]">
                  <div>
                    <h3 className="text-base font-bold text-[#1C1917]">
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    <p className="text-xs text-[#71695F]">
                      {getEventsForDate(selectedDate).length} scheduled academic sessions
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FAF7F0] border border-[#EFE8DC] text-[#1C1917]">
                    {activeBatch?.name}
                  </span>
                </div>

                {getEventsForDate(selectedDate).length === 0 ? (
                  <div className="p-12 text-center text-[#71695F] space-y-2">
                    <CalendarDays className="w-8 h-8 text-[#9C9488] mx-auto" />
                    <p className="font-semibold text-sm text-[#1C1917]">
                      No events scheduled for this day
                    </p>
                    <p className="text-xs">Use the date navigation above to view other days.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getEventsForDate(selectedDate).map((ev) => {
                      const style = getCategoryStyles(ev.category);
                      return (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${style.bg} ${style.border}`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${style.badge}`}
                              >
                                {ev.category}
                              </span>
                              <span className="font-mono text-xs font-semibold text-[#71695F]">
                                {ev.code}
                              </span>
                              <h4 className={`text-sm font-bold ${style.text}`}>{ev.title}</h4>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-[#71695F] pl-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                  {ev.startTime} – {ev.endTime} ({ev.durationHours} hrs)
                                </span>
                              </span>
                              {ev.room && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span>{ev.room}</span>
                                </span>
                              )}
                              {ev.facultyName && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  <span>{ev.facultyName}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="text-xs font-semibold text-[#1C1917] hover:underline shrink-0">
                            View Details →
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* VIEW 3: MONTHLY VIEW                                         */}
            {/* ------------------------------------------------------------- */}
            {viewMode === 'monthly' && (
              <div className="p-5">
                <div className="grid grid-cols-7 border-b border-[#EFE8DC] pb-2 text-center text-xs font-bold text-[#8C8275]">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>

                <div className="grid grid-cols-7 divide-x divide-y divide-[#EFE8DC]/80 border-b border-[#EFE8DC]/80">
                  {miniCalendarDays.map((item, idx) => {
                    const dayEvents = getEventsForDate(item.date);
                    const isSelected = formatYMD(item.date) === formatYMD(selectedDate);
                    const isToday = formatYMD(item.date) === '2026-09-18';

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedDate(item.date);
                          setViewMode('daily');
                        }}
                        className={`min-h-[90px] p-2 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#FAF7F0]'
                            : item.isCurrentMonth
                            ? 'hover:bg-[#FAF7F0]/50'
                            : 'bg-black/[0.02] opacity-50'
                        }`}
                      >
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded-full text-xs font-semibold ${
                            isSelected
                              ? 'bg-[#1C1917] text-white'
                              : isToday
                              ? 'bg-[#FEF9E7] text-[#614800] border border-[#FBE69B]'
                              : 'text-[#1C1917]'
                          }`}
                        >
                          {item.date.getDate()}
                        </span>

                        <div className="mt-1 space-y-1">
                          {dayEvents.slice(0, 2).map((ev) => {
                            const style = getCategoryStyles(ev.category);
                            return (
                              <div
                                key={ev.id}
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate ${style.bg} ${style.text}`}
                              >
                                {ev.title}
                              </div>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <span className="text-[9px] text-[#8C8275] block pl-1">
                              +{dayEvents.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SLIDE-OVER / MODAL: EVENT DETAIL PANEL                     */}
      {/* ========================================================= */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EFE8DC] shadow-2xl max-w-lg w-full overflow-hidden select-none">
            {/* Modal Header */}
            <div
              className={`p-6 border-b border-[#EFE8DC] flex items-start justify-between gap-4 ${
                getCategoryStyles(selectedEvent.category).bg
              }`}
            >
              <div className="space-y-1">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    getCategoryStyles(selectedEvent.category).badge
                  }`}
                >
                  {selectedEvent.category} Session
                </span>
                <h3 className="text-xl font-serif font-bold text-[#1C1917]">
                  {selectedEvent.title}
                </h3>
                {selectedEvent.code && (
                  <span className="font-mono text-xs font-bold text-[#71695F]">
                    Course Code: {selectedEvent.code}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-full bg-white/80 hover:bg-white text-[#71695F] hover:text-[#1C1917] border border-[#EFE8DC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs text-[#1C1917]">
              {/* Timing & Room Information */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC]">
                  <span className="text-[10px] text-[#8C8275] block uppercase font-medium">
                    Date & Timing
                  </span>
                  <span className="font-bold text-sm text-[#1C1917] mt-0.5 block">
                    {selectedEvent.date}
                  </span>
                  <span className="text-xs text-[#71695F]">
                    {selectedEvent.startTime} – {selectedEvent.endTime} ({selectedEvent.durationHours}h)
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC]">
                  <span className="text-[10px] text-[#8C8275] block uppercase font-medium">
                    Location & Hall
                  </span>
                  <span className="font-bold text-sm text-[#1C1917] mt-0.5 block">
                    {selectedEvent.room || 'Academic Classroom'}
                  </span>
                  <span className="text-xs text-[#71695F]">{activeBranchId} Campus</span>
                </div>
              </div>

              {/* Faculty & Academic Track */}
              <div className="p-3.5 rounded-2xl border border-[#EFE8DC] bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#71695F]">Academic Track:</span>
                  <span className="font-semibold text-[#1C1917]">{selectedEvent.academicTrack}</span>
                </div>
                {selectedEvent.facultyName && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#71695F]">Assigned Instructor:</span>
                    <span className="font-semibold text-[#1C1917]">
                      {selectedEvent.facultyName}
                    </span>
                  </div>
                )}
                {selectedEvent.inExamScope && (
                  <div className="flex items-center justify-between pt-1 border-t border-[#EFE8DC]">
                    <span className="text-[#71695F]">Exam Syllabus Inclusion:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF9E7] text-[#614800] border border-[#FBE69B]">
                      In Exam Scope
                    </span>
                  </div>
                )}
              </div>

              {selectedEvent.topicsCoveredSummary && (
                <div className="p-3 rounded-2xl bg-[#EEF7EF] border border-[#C8E8CD] text-[11px] text-[#1E4627] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#22C55E] shrink-0" />
                  <span>{selectedEvent.topicsCoveredSummary}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-[#EFE8DC] bg-[#FAF7F0]/60 flex items-center justify-between">
              {selectedEvent.subjectId ? (
                <Link
                  to={`/lesson-plan?subject=${selectedEvent.subjectId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A16207] hover:underline"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>View in Learning Library →</span>
                </Link>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#2C2825] text-white font-medium text-xs shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
