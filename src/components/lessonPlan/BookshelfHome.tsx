import React, { useState, useMemo } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getSubjectsForUser,
  getSubjects,
  getUnits,
  getTopics,
  getBranches,
  getBatches,
  getSemesters,
  getHolidays,
  getTimetable,
} from '../../services/storage';
import {
  calculateSubjectProgress,
  calculateHoursInScope,
  calculateCoveredHours,
  calculateCoveragePercentage,
} from '../../utils/calculations';
import { Subject, BranchId, AcademicTrackId, ProgressionStatus } from '../../types';
import { BookCover } from './BookCover';
import {
  Search,
  BookOpen,
  Filter,
  Sparkles,
  Building2,
  X,
  Compass,
  GraduationCap,
  Library,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface BookshelfHomeProps {
  onSelectSubject: (subjectId: string) => void;
}

export const BookshelfHome: React.FC<BookshelfHomeProps> = ({ onSelectSubject }) => {
  const { currentUser, isAdmin, isCampusManager, isFaculty } = useAuth();

  // Load database entities
  const branches = getBranches();
  const batches = getBatches();
  const semesters = getSemesters();
  const holidays = getHolidays();
  const timetable = getTimetable();
  const units = getUnits();
  const topics = getTopics();

  // Branch context
  const userAssignedBranch = (currentUser?.branch_id || currentUser?.campus_id) as BranchId | undefined;
  const [selectedBranch, setSelectedBranch] = useState<BranchId | 'ALL'>(
    !isAdmin && userAssignedBranch ? userAssignedBranch : 'ALL'
  );

  // Sync when user changes
  React.useEffect(() => {
    if (!isAdmin && userAssignedBranch) {
      setSelectedBranch(userAssignedBranch);
    }
  }, [isAdmin, userAssignedBranch]);

  // Track filter chip: 'ALL' | 'Mirai Track' | 'University Track'
  const [selectedTrack, setSelectedTrack] = useState<'ALL' | AcademicTrackId>('ALL');

  // Search query: by subject name or code
  const [searchQuery, setSearchQuery] = useState('');

  // All subjects accessible to this user
  const accessibleSubjects = useMemo(() => {
    // If admin or guest/demo mode without login, show all subjects
    if (!currentUser || isAdmin) {
      return getSubjects();
    }
    // Otherwise, respect user's scope (faculty / campus manager / student)
    return getSubjectsForUser(currentUser);
  }, [currentUser, isAdmin]);

  // Filter subjects based on branch, track, and search query
  const filteredSubjects = useMemo(() => {
    return accessibleSubjects.filter((subject) => {
      // Branch filter (if admin or applicable)
      if (selectedBranch !== 'ALL') {
        const matchesBranch = !subject.branch_id || subject.branch_id === selectedBranch;
        if (!matchesBranch) return false;
      }

      // Track filter
      if (selectedTrack !== 'ALL') {
        if (subject.academic_track !== selectedTrack) return false;
      }

      // Search query filter (matches code or name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const codeMatch = subject.code.toLowerCase().includes(query);
        const nameMatch = subject.name.toLowerCase().includes(query);
        const facultyMatch = subject.faculty_name?.toLowerCase().includes(query);
        if (!codeMatch && !nameMatch && !facultyMatch) return false;
      }

      return true;
    });
  }, [accessibleSubjects, selectedBranch, selectedTrack, searchQuery]);

  // Compute progress & metrics for each subject using the calculation engine
  const currentDateStr = '2026-09-18';

  const subjectDataMap = useMemo(() => {
    const map: Record<
      string,
      {
        unitsCount: number;
        topicsCount: number;
        scopeHours: number;
        coveredHours: number;
        coveragePct: number;
        status: ProgressionStatus;
      }
    > = {};

    accessibleSubjects.forEach((subject) => {
      const subUnits = units.filter((u) => u.subject_id === subject.id);
      const subTopics = topics.filter((t) => t.subject_id === subject.id);

      const subSemester =
        semesters.find((s) => s.batch_id === subject.batch_id) ||
        semesters.find((s) => s.branch_id === subject.branch_id) ||
        semesters[0];

      const targetDateStr = subSemester?.end_date || '2026-11-30';
      const branchHolidays = holidays.filter(
        (h) => !h.branch_id || h.branch_id === subject.branch_id
      );

      const progressCalc = calculateSubjectProgress(
        subject,
        topics,
        currentDateStr,
        targetDateStr,
        subSemester,
        branchHolidays,
        timetable
      );

      const scope = calculateHoursInScope(subTopics);
      const covered = calculateCoveredHours(subTopics);
      const pct = calculateCoveragePercentage(covered, scope);

      map[subject.id] = {
        unitsCount: subUnits.length,
        topicsCount: subTopics.length,
        scopeHours: scope,
        coveredHours: covered,
        coveragePct: pct,
        status: progressCalc.status,
      };
    });

    return map;
  }, [accessibleSubjects, units, topics, semesters, holidays, timetable]);

  // Overall library summary stats
  const libraryStats = useMemo(() => {
    const totalSubjects = accessibleSubjects.length;
    let totalScope = 0;
    let totalCovered = 0;
    let completedCount = 0;

    accessibleSubjects.forEach((s) => {
      const data = subjectDataMap[s.id];
      if (data) {
        totalScope += data.scopeHours;
        totalCovered += data.coveredHours;
        if (data.coveragePct >= 100) completedCount++;
      }
    });

    const avgCoverage = calculateCoveragePercentage(totalCovered, totalScope);

    return {
      totalSubjects,
      totalScope,
      totalCovered,
      avgCoverage,
      completedCount,
    };
  }, [accessibleSubjects, subjectDataMap]);

  // Filter chip counts
  const miraiCount = useMemo(
    () => accessibleSubjects.filter((s) => s.academic_track === 'Mirai Track').length,
    [accessibleSubjects]
  );
  const universityCount = useMemo(
    () => accessibleSubjects.filter((s) => s.academic_track === 'University Track').length,
    [accessibleSubjects]
  );

  return (
    <div className="space-y-7 pb-10">
      {/* Welcoming Digital Library Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-[#FCFAF6] to-[#F7F2E7] rounded-3xl p-6 sm:p-8 lg:p-9 border border-[#EFE8DC] shadow-[0_4px_24px_rgba(28,25,23,0.03)]">
        {/* Decorative library background element */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#FBE69B]/20 via-[#F3B5D8]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C1917]/5 border border-[#1C1917]/10 text-[#1C1917] text-xs font-semibold mb-3">
              <Library className="w-3.5 h-3.5 text-[#A16207]" />
              <span>Academic Curriculum Library</span>
              <span className="w-1 h-1 rounded-full bg-[#8C8275]" />
              <span className="text-[#71695F] font-normal">Term 2026-2027</span>
              {userAssignedBranch && !isAdmin && (
                <>
                  <span className="w-1 h-1 rounded-full bg-[#8C8275]" />
                  <span className="text-[#1C1917] font-semibold">{userAssignedBranch} Campus</span>
                </>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-serif font-bold tracking-tight text-[#1C1917] leading-tight">
              Your Learning Library
            </h1>

            <p className="text-sm sm:text-base text-[#71695F] mt-2.5 leading-relaxed font-sans">
              Explore your course syllabi organized as an interactive bookshelf. Every subject features planned teaching hours, unit structures, exam scopes, and completion analytics.
            </p>

            {/* Quick stats pills */}
            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-medium text-[#71695F]">
              <span className="px-3 py-1 rounded-xl bg-white border border-[#EFE8DC] shadow-2xs text-[#1C1917]">
                <strong>{libraryStats.totalSubjects}</strong> Active Courses
              </span>
              <span className="px-3 py-1 rounded-xl bg-white border border-[#EFE8DC] shadow-2xs text-[#1C1917]">
                <strong>{libraryStats.totalScope.toFixed(0)}h</strong> Total Curriculum Hours
              </span>
              <span className="px-3 py-1 rounded-xl bg-[#EEF7EF] border border-[#C8E8CD] text-[#1E4627]">
                <strong>{libraryStats.avgCoverage.toFixed(0)}%</strong> Overall Delivery Pace
              </span>
            </div>
          </div>

          {/* Right Hero Badge for Admin only */}
          {isAdmin && (
            <div className="shrink-0 p-4 rounded-2xl bg-white/90 border border-[#EFE8DC] shadow-sm max-w-xs backdrop-blur-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1917]">
                <GraduationCap className="w-4 h-4 text-[#2A5C37]" />
                <span>Global Curriculum Scope</span>
              </div>
              <p className="text-[11px] text-[#71695F] mt-1">
                Institutional view across all supported campus syllabi.
              </p>
              <div className="mt-3 pt-2.5 border-t border-[#EFE8DC] flex items-center justify-between text-[11px]">
                <span className="text-[#8C8275]">User Scope</span>
                <span className="font-semibold text-[#1C1917] capitalize">
                  Administrator
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar: Search & Filter Strip */}
      <div className="space-y-4">
        {/* Branch Context Selector (Ghaziabad / Bangalore / Jaipur / All) - ONLY FOR ADMIN */}
        {isAdmin && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#1C1917] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#71695F]" />
                <span>Campus Context:</span>
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedBranch('ALL')}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    selectedBranch === 'ALL'
                      ? 'bg-[#1C1917] text-white shadow-xs font-semibold'
                      : 'bg-white text-[#71695F] border border-[#EFE8DC] hover:text-[#1C1917] hover:bg-[#FAF7F0]'
                  }`}
                >
                  All Campuses
                </button>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBranch(b.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      selectedBranch === b.id
                        ? 'bg-[#1C1917] text-white shadow-xs font-semibold'
                        : 'bg-white text-[#71695F] border border-[#EFE8DC] hover:text-[#1C1917] hover:bg-[#FAF7F0]'
                    }`}
                  >
                    {b.name} ({b.university_short_name})
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-[#8C8275]">
              Showing <strong className="text-[#1C1917]">{filteredSubjects.length}</strong> of{' '}
              {accessibleSubjects.length} subjects
            </div>
          </div>
        )}

        {/* Search Bar + Track Filter Chips */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 p-3 sm:p-4 bg-white rounded-2xl border border-[#EFE8DC] shadow-[0_2px_10px_rgba(28,25,23,0.02)]">
          {/* Search bar */}
          <div className="flex-1 max-w-md relative flex items-center">
            <Search className="w-4 h-4 text-[#9C9488] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject name, code (e.g. CS301, KCS301)..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-[#FAF7F0]/60 border border-[#EFE8DC] text-xs text-[#1C1917] placeholder-[#9C9488] focus:outline-hidden focus:bg-white focus:border-[#1C1917]/30 focus:ring-2 focus:ring-[#1C1917]/5 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-[#9C9488] hover:text-[#1C1917] p-0.5 rounded-full"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Track Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-[#71695F] hidden sm:inline mr-1">Track Filter:</span>

            <button
              type="button"
              onClick={() => setSelectedTrack('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedTrack === 'ALL'
                  ? 'bg-[#1C1917] text-white shadow-xs font-semibold'
                  : 'bg-[#FAF7F0] text-[#71695F] border border-[#EFE8DC] hover:text-[#1C1917] hover:bg-white'
              }`}
            >
              <span>All Subjects</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedTrack === 'ALL' ? 'bg-white/20 text-white' : 'bg-[#EFE8DC] text-[#71695F]'
                }`}
              >
                {accessibleSubjects.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTrack('Mirai Track')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedTrack === 'Mirai Track'
                  ? 'bg-[#163820] text-[#D5ECDA] shadow-xs font-semibold border border-[#163820]'
                  : 'bg-[#FAF7F0] text-[#71695F] border border-[#EFE8DC] hover:text-[#1C1917] hover:bg-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
              <span>Mirai Track</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedTrack === 'Mirai Track'
                    ? 'bg-white/20 text-[#D5ECDA]'
                    : 'bg-[#EFE8DC] text-[#71695F]'
                }`}
              >
                {miraiCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTrack('University Track')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedTrack === 'University Track'
                  ? 'bg-[#37136E] text-[#E8DCFC] shadow-xs font-semibold border border-[#37136E]'
                  : 'bg-[#FAF7F0] text-[#71695F] border border-[#EFE8DC] hover:text-[#1C1917] hover:bg-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#C084FC]" />
              <span>University Track</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedTrack === 'University Track'
                    ? 'bg-white/20 text-[#E8DCFC]'
                    : 'bg-[#EFE8DC] text-[#71695F]'
                }`}
              >
                {universityCount}
              </span>
            </button>

            {!isAdmin && (
              <span className="text-xs text-[#8C8275] ml-1.5 hidden md:inline">
                Showing <strong className="text-[#1C1917]">{filteredSubjects.length}</strong> of{' '}
                {accessibleSubjects.length} courses
              </span>
            )}
          </div>
        </div>
      </div>

      {/* THE DIGITAL BOOKSHELF DISPLAY */}
      {filteredSubjects.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 sm:p-16 border border-[#EFE8DC] text-center max-w-lg mx-auto shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#FAF7F0] border border-[#EFE8DC] flex items-center justify-center mx-auto text-[#8C8275]">
            <BookOpen className="w-8 h-8 opacity-60" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif font-bold text-lg text-[#1C1917]">No subjects match your criteria</h3>
            <p className="text-xs text-[#71695F] leading-relaxed">
              We couldn't find any courses matching "{searchQuery || selectedTrack}". Try clearing the search or switching track filters.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedTrack('ALL');
              setSelectedBranch('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#2C2825] text-white font-medium text-xs shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        /* Bookshelf Container */
        <div className="space-y-12">
          {/* Bookshelf Section Header */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#A16207]" />
              <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wider">
                {selectedTrack === 'ALL'
                  ? 'All Academic Books'
                  : selectedTrack === 'Mirai Track'
                  ? 'Mirai Industry Track Books'
                  : 'University Affiliated Board Books'}
              </h2>
            </div>
            <span className="text-xs text-[#71695F]">Click any book to inspect its full syllabus</span>
          </div>

          {/* Grid of Books on a Realistic Bookshelf Background */}
          <div className="relative p-6 sm:p-8 lg:p-10 rounded-3xl bg-[#FAF6EE] border border-[#E8DEC8] shadow-[inset_0_2px_8px_rgba(28,25,23,0.04)]">
            {/* Subtle woodgrain / library shelf backdrop */}
            <div className="absolute inset-0 bg-[radial-gradient(#E8DFC9_1px,transparent_1px)] [background-size:16px_16px] opacity-40 rounded-3xl pointer-events-none" />

            {/* Responsive Grid of Books */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12 items-end">
              {filteredSubjects.map((subject) => {
                const data = subjectDataMap[subject.id] || {
                  unitsCount: 0,
                  topicsCount: 0,
                  scopeHours: 0,
                  coveredHours: 0,
                  coveragePct: 0,
                  status: 'ON TRACK',
                };

                return (
                  <div key={subject.id} className="relative flex flex-col items-center">
                    {/* The 3D Book Cover */}
                    <BookCover
                      subject={subject}
                      unitsCount={data.unitsCount}
                      topicsCount={data.topicsCount}
                      coveragePercentage={data.coveragePct}
                      coveredHours={data.coveredHours}
                      totalHours={data.scopeHours}
                      status={data.status}
                      onClick={() => onSelectSubject(subject.id)}
                    />

                    {/* Realistic Hardwood Shelf Ledge Underneath Each Book */}
                    <div className="w-full mt-4 h-3.5 rounded-sm bg-gradient-to-b from-[#E4D7C0] via-[#D8C7A9] to-[#C9B592] border-t border-[#F2E7D3] border-b border-[#B8A37E] shadow-[0_5px_8px_rgba(28,25,23,0.12)] relative">
                      <div className="absolute -bottom-1 left-2 right-2 h-1 bg-black/10 blur-xs rounded-full pointer-events-none" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
