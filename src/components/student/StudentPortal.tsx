import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../services/authContext';
import {
  getBatchesForUser,
  getSubjectsForUser,
  getExaminationsForUser,
  getTopics,
  getOpportunitiesForUser,
} from '../../services/storage';
import {
  calculateHoursInScope,
  calculateCoveredHours,
  calculateCoveragePercentage,
} from '../../utils/calculations';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  FileText,
  ChevronRight,
  Code,
  Check,
} from 'lucide-react';
import { DailyRecapCard } from './DailyRecapCard';

export const StudentPortal: React.FC = () => {
  const { currentUser } = useAuth();
  const batches = getBatchesForUser(currentUser);
  const enrolledBatch = batches[0];
  const batchSubjects = getSubjectsForUser(currentUser);
  const topics = getTopics();
  const examinations = getExaminationsForUser(currentUser);

  const [activeSubjectId, setActiveSubjectId] = useState<string>(
    batchSubjects[0]?.id || ''
  );

  const activeSubject = batchSubjects.find((s) => s.id === activeSubjectId) || batchSubjects[0];
  const subjectTopics = topics
    .filter((t) => t.subject_id === activeSubject?.id)
    .sort((a, b) => a.sequence_order - b.sequence_order);

  // Group topics by status
  const coveredTopics = subjectTopics.filter((t) => t.status === 'completed');
  const inProgressTopics = subjectTopics.filter((t) => t.status === 'in_progress');
  const upcomingTopics = subjectTopics.filter(
    (t) => t.status === 'not_started'
  );

  const inScopeHours = calculateHoursInScope(subjectTopics);
  const coveredHours = calculateCoveredHours(subjectTopics);
  const coveragePercentage = calculateCoveragePercentage(coveredHours, inScopeHours);

  // Upcoming examinations for this batch
  const batchExams = examinations.filter((e) => e.batch_id === enrolledBatch?.id);

  // Optional preview of curated opportunities
  const previewOpportunities = getOpportunitiesForUser(currentUser).slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Student Banner - Light, clean, welcoming */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8DC] shadow-[0_2px_12px_rgba(28,25,23,0.03)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] px-3 py-0.5 rounded-full bg-[#EEF7EF] text-[#1E4627] border border-[#C8E8CD] font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4ADE80]" />
                <span>Student Portal (Read-Only)</span>
              </span>
              <span className="text-xs text-[#71695F]">
                • {enrolledBatch?.branch_id || enrolledBatch?.campus_id || 'Academic'} Branch
              </span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#1C1917]">
              Academic Progress & Syllabus Roadmap
            </h1>
            <p className="text-xs text-[#71695F] mt-1.5 leading-relaxed">
              Enrolled in <strong>{enrolledBatch?.name}</strong> • Curriculum Track: <strong>{enrolledBatch?.academic_track}</strong>
            </p>
          </div>

          <div className="px-5 py-3 rounded-2xl bg-[#FEF9E7] border border-[#FBE69B] text-xs text-center shrink-0">
            <span className="text-[#614800] block text-[11px] font-medium">
              Academic Term
            </span>
            <span className="text-lg font-bold text-[#614800]">
              Semester {enrolledBatch?.current_semester || 3}
            </span>
          </div>
        </div>
      </div>

      {/* Daily 5-Minute Recap Section */}
      <DailyRecapCard />

      {/* Enrolled Subjects Overview Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-[#1C1917]">My Enrolled Courses</span>
          <Link
            to="/lesson-plan"
            className="text-[11px] font-semibold text-[#854D0E] hover:text-[#1C1917] hover:underline flex items-center gap-1 transition-colors"
          >
            <span>Open Learning Library Bookshelf</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {batchSubjects.map((sub) => {
            const subTopics = topics.filter((t) => t.subject_id === sub.id);
            const scope = calculateHoursInScope(subTopics);
            const covered = calculateCoveredHours(subTopics);
            const pct = calculateCoveragePercentage(covered, scope);
            const isSelected = sub.id === activeSubject?.id;

            return (
              <button
                key={sub.id}
                onClick={() => setActiveSubjectId(sub.id)}
                className={`text-left p-4.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-[#1C1917] shadow-md ring-2 ring-[#1C1917]/10'
                    : 'bg-white/80 border-[#EFE8DC] hover:bg-white hover:border-[#D8CFC0]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#1C1917] text-[#FBE69B]">
                    {sub.code}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    pct >= 100
                      ? 'bg-[#EEF7EF] text-[#1E4627]'
                      : pct > 0
                      ? 'bg-[#FEF9E7] text-[#614800]'
                      : 'bg-[#FAF7F0] text-[#71695F]'
                  }`}>
                    {pct.toFixed(0)}% Completed
                  </span>
                </div>
                <h3 className="font-semibold text-[#1C1917] text-sm mt-2 truncate">{sub.name}</h3>
                <p className="text-xs text-[#71695F] mt-0.5">Faculty: {sub.faculty_name || 'Assigned Instructor'}</p>

                <div className="mt-3 w-full bg-[#FAF7F0] border border-[#EFE8DC] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#4ADE80]"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Subject Topics & Syllabus Progress Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Covered vs In Progress vs Upcoming Topics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Covered Topics */}
          <div className="warm-card p-6 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE8DC]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#4ADE80]" />
                <h3 className="font-semibold text-[#1C1917] text-sm">
                  Covered Topics ({coveredTopics.length})
                </h3>
              </div>
              <span className="text-xs font-semibold text-[#1E4627]">
                {coveredHours.toFixed(1)} Hours Delivered
              </span>
            </div>

            <div className="space-y-2">
              {coveredTopics.length === 0 ? (
                <p className="text-xs text-[#71695F] italic">No completed topics yet.</p>
              ) : (
                coveredTopics.map((top) => (
                  <div
                    key={top.id}
                    className="p-3 rounded-xl bg-[#FDFBF7] border border-[#EFE8DC] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#4ADE80] shrink-0" />
                      <div>
                        <p className="font-medium text-[#1C1917]">{top.sequence_order}. {top.title}</p>
                        <p className="text-[11px] text-[#71695F]">
                          Completed on: {top.actual_completion_date || 'In Class'} • {top.planned_hours.toFixed(1)}h
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EEF7EF] text-[#1E4627] border border-[#C8E8CD]">
                      100%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* In Progress Topics */}
          {inProgressTopics.length > 0 && (
            <div className="warm-card p-6 space-y-3 border-l-4 border-l-[#FACC15]">
              <div className="flex items-center justify-between pb-3 border-b border-[#EFE8DC]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FACC15]" />
                  <h3 className="font-semibold text-[#1C1917] text-sm">
                    Currently In Progress ({inProgressTopics.length})
                  </h3>
                </div>
              </div>

              <div className="space-y-2">
                {inProgressTopics.map((top) => (
                  <div
                    key={top.id}
                    className="p-3 rounded-xl bg-[#FDFBF7] border border-[#EFE8DC] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-[#1C1917]">{top.sequence_order}. {top.title}</p>
                      <p className="text-[11px] text-[#71695F]">
                        Weight: {top.planned_hours.toFixed(1)}h • Currently active lecture
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FEF9E7] text-[#614800] border border-[#FBE69B]">
                      {top.completion_percentage}% Done
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Topics */}
          <div className="warm-card p-6 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE8DC]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#CCE0F9]" />
                <h3 className="font-semibold text-[#1C1917] text-sm">
                  Upcoming Lessons ({upcomingTopics.length})
                </h3>
              </div>
              <span className="text-xs font-normal text-[#71695F]">
                {(inScopeHours - coveredHours).toFixed(1)}h remaining
              </span>
            </div>

            <div className="space-y-2">
              {upcomingTopics.slice(0, 6).map((top) => (
                <div
                  key={top.id}
                  className="p-3 rounded-xl bg-[#FDFBF7] border border-[#EFE8DC] flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-medium text-[#1C1917]">{top.sequence_order}. {top.title}</p>
                    <p className="text-[11px] text-[#71695F]">
                      Expected Delivery: {top.planned_date || 'Late Term'} • {top.planned_hours.toFixed(1)}h
                    </p>
                  </div>
                  <span className="text-[10px] font-medium text-[#71695F] px-2 py-0.5 rounded-full bg-[#FAF7F0] border border-[#EFE8DC]">
                    Upcoming
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Examination Dates & Scope */}
        <div className="warm-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EFE8DC]">
            <Calendar className="w-4 h-4 text-[#1C1917]" />
            <h3 className="font-semibold text-[#1C1917] text-sm">
              Examination Schedule
            </h3>
          </div>

          <p className="text-xs text-[#71695F] leading-relaxed">
            Target dates and official syllabus topics included in scheduled examination windows for {enrolledBatch?.name}.
          </p>

          <div className="space-y-3">
            {batchExams.length === 0 ? (
              <p className="text-xs text-[#71695F] italic">No examinations scheduled currently.</p>
            ) : (
              batchExams.map((ex) => {
                const sub = batchSubjects.find((s) => s.id === ex.subject_id);
                return (
                  <div
                    key={ex.id}
                    className="p-4 rounded-2xl border border-[#EFE8DC] bg-[#FDFBF7] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#1C1917]">{ex.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F0F6FD] text-[#193B6D] border border-[#CCE0F9]">
                        {ex.exam_date}
                      </span>
                    </div>
                    <p className="text-xs text-[#71695F]">{sub?.name} ({sub?.code})</p>
                    <div className="text-[11px] text-[#1C1917] font-medium pt-1.5 border-t border-[#EFE8DC]">
                      Scope: {ex.syllabus_scope_topic_ids.length} Topics Tested
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Optional Preview of Upcoming Opportunities */}
      {previewOpportunities.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE8DC] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C4841D]" />
              <h3 className="font-semibold text-sm text-[#1C1917]">
                Curated Opportunities Spotlight
              </h3>
            </div>
            <Link
              to="/opportunities"
              className="text-xs font-semibold text-[#8C5E00] hover:text-[#1C1917] flex items-center gap-1 transition-colors"
            >
              <span>Explore Opportunities Hub</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {previewOpportunities.map((opp) => (
              <Link
                key={opp.id}
                to="/opportunities"
                className="p-3.5 rounded-2xl bg-[#FAF7F0] hover:bg-[#F7EFE1] border border-[#EFE8DC] flex items-center justify-between text-xs transition-colors group"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-white text-[#71695F] border border-[#EFE8DC]">
                      {opp.category.replace(/_/g, ' ')}
                    </span>
                    {opp.application_deadline && (
                      <span className="text-[10px] text-[#71695F] flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 text-[#C4841D]" />
                        {opp.application_deadline.split('T')[0]}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-[#1C1917] text-xs truncate group-hover:text-[#8C5E00] transition-colors">
                    {opp.title}
                  </h4>
                  <p className="text-[11px] text-[#71695F] truncate">{opp.organizer || opp.organization}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#9C9387] group-hover:text-[#1C1917] group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
