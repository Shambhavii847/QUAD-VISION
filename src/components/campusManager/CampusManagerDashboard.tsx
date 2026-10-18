import React, { useState, useMemo } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getBranches,
  getSubjects,
  getBatches,
  getSemesters,
  getHolidays,
  getTopics,
  getTimetable,
  getMissedSessions,
  getUsers,
  sendFacultyReminder,
  escalateMissedSession,
  resolveMissedSession,
} from '../../services/storage';
import {
  calculateSubjectProgress,
} from '../../utils/calculations';
import { StatusBadge } from '../common/StatusBadge';
import { MetricCard } from '../common/MetricCard';
import { BranchId } from '../../types';
import {
  Building2,
  AlertTriangle,
  Clock,
  Send,
  CheckCircle2,
  Bell,
  ShieldAlert,
  Users,
  AlertOctagon,
  ChevronRight,
  ArrowUpRight,
  Lock,
} from 'lucide-react';

import { AccessDenied } from '../common/AccessDenied';

export const CampusManagerDashboard: React.FC = () => {
  const { currentUser, canEscalate, isAdmin, isCampusManager } = useAuth();

  if (!isCampusManager && !isAdmin) {
    return <AccessDenied requiredRole="Campus Manager" />;
  }

  const branches = getBranches();

  // Strict branch isolation: Campus Managers strictly access only their assigned branch
  const userAssignedBranch = (currentUser?.branch_id || currentUser?.campus_id || 'Ghaziabad') as BranchId;
  const [selectedBranch, setSelectedBranch] = useState<BranchId>(userAssignedBranch);

  const activeBranch: BranchId = isCampusManager ? userAssignedBranch : selectedBranch;
  const currentBranchRecord = branches.find((b) => b.id === activeBranch) || branches[0];

  const batches = getBatches().filter((b) => (b.branch_id || b.campus_id) === activeBranch);
  const semesters = getSemesters();
  const branchHolidays = getHolidays().filter(
    (h) => !h.branch_id || (h.branch_id || h.campus_id) === activeBranch
  );
  const subjects = getSubjects();
  const topics = getTopics();
  const branchTimetable = getTimetable().filter(
    (t) => (t.branch_id || t.campus_id) === activeBranch
  );
  const missedSessions = getMissedSessions().filter(
    (m) => (m.branch_id || m.campus_id) === activeBranch
  );
  const users = getUsers();

  const [notification, setNotification] = useState<string | null>(null);

  const currentDateStr = '2026-09-18';
  const targetDateStr = '2026-11-30';

  // Calculate progression strictly for active branch's subjects
  const campusSubjects = subjects.filter((s) =>
    batches.some((b) => b.id === s.batch_id)
  );

  const subjectProgressList = useMemo(() => {
    return campusSubjects.map((s) => {
      const sem = semesters.find((sm) => sm.batch_id === s.batch_id) || semesters[0];
      return calculateSubjectProgress(
        s,
        topics,
        currentDateStr,
        targetDateStr,
        sem,
        branchHolidays,
        branchTimetable
      );
    });
  }, [campusSubjects, topics, currentDateStr, targetDateStr, semesters, branchHolidays, branchTimetable]);

  // Tight or Danger subjects
  const criticalSubjects = subjectProgressList.filter(
    (s) => s.status === 'DANGER' || s.status === 'TIGHT'
  );

  // Overdue topics
  const overdueTopics = topics.filter(
    (t) =>
      campusSubjects.some((s) => s.id === t.subject_id) &&
      t.planned_date &&
      t.planned_date < currentDateStr &&
      t.status !== 'completed' &&
      t.status !== 'skipped'
  );

  // Missed sessions workflow handlers
  const handleSendReminder = (id: string, facultyName: string) => {
    if (!currentUser) return;
    sendFacultyReminder(id, currentUser);
    showNotice(
      `Pending class reminder recorded in-app for ${facultyName}. (Simulated email notification dispatched).`
    );
  };

  const handleEscalateSession = (id: string) => {
    if (!currentUser) return;
    escalateMissedSession(id, currentUser);
    showNotice('Overdue unlogged session escalated to Campus Manager executive review.');
  };

  const handleResolveSession = (id: string) => {
    if (!currentUser) return;
    resolveMissedSession(id, currentUser);
    showNotice('Session log marked resolved.');
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const escalatedCount = missedSessions.filter(
    (m) => m.status === 'escalated' || m.hours_overdue >= 48
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8DC] shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] px-3 py-0.5 rounded-full bg-[#FAF7F0] text-[#78716C] border border-[#EFE8DC] font-semibold">
                Branch Operational Review
              </span>
              <span className="text-xs text-[#78716C]">
                • {currentBranchRecord.name} ({currentBranchRecord.university_short_name})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] tracking-tight">
              Faculty Log Reminders & Overdue Escalations
            </h1>
            <p className="text-xs text-[#78716C] mt-1 max-w-2xl leading-relaxed">
              Monitors teaching delivery for {currentBranchRecord.name}, triggers faculty reminders, and automatically escalates unlogged sessions after 48 hours.
            </p>
            <div className="mt-2.5 text-xs font-medium text-[#78716C] bg-[#FAF7F0] px-3 py-1 rounded-full inline-block border border-[#EFE8DC]">
              Affiliated University: <strong className="text-[#1C1917]">{currentBranchRecord.university_affiliation}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF7F0] border border-[#EFE8DC] text-xs">
                <Building2 className="w-3.5 h-3.5 text-[#78716C]" />
                <span className="font-semibold text-[#78716C] text-[11px]">Branch:</span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value as BranchId)}
                  className="bg-transparent font-semibold text-[#1C1917] focus:outline-hidden cursor-pointer"
                >
                  <option value="Ghaziabad">Ghaziabad (AKTU)</option>
                  <option value="Bangalore">Bangalore (VTU)</option>
                  <option value="Jaipur">Jaipur (Jagannath Univ)</option>
                </select>
              </div>
            )}
            {isCampusManager && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF7F0] border border-[#EFE8DC] text-xs font-semibold text-[#1C1917]">
                <Building2 className="w-3.5 h-3.5 text-[#78716C]" />
                <span>{activeBranch} Branch</span>
                <Lock className="w-3 h-3 text-[#B08800]" />
              </div>
            )}
            <div className="px-3.5 py-1.5 rounded-full bg-[#FDF2F4] border border-[#F8CAD4] text-[#701A4A] text-xs font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#701A4A]" />
              <span>{escalatedCount} Escalated &gt;48h Overdue</span>
            </div>
          </div>
        </div>

        {notification && (
          <div className="mt-4 p-3.5 rounded-2xl bg-[#EEF7EF] border border-[#C8E8CD] text-[#2D451B] font-medium text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#557B2F] shrink-0" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Campus Subjects"
          value={campusSubjects.length}
          subtitle="Monitored courses"
          icon={<Building2 className="w-5 h-5 text-[#1C1917]" />}
          highlightColor="charcoal"
        />

        <MetricCard
          title="At-Risk Courses"
          value={criticalSubjects.length}
          subtitle="Buffer ratio < 1.15"
          icon={<AlertTriangle className="w-5 h-5 text-[#701A4A]" />}
          highlightColor={criticalSubjects.length > 0 ? 'pink' : 'green'}
        />

        <MetricCard
          title="Unlogged Classes"
          value={missedSessions.filter((m) => m.status !== 'resolved').length}
          subtitle="Awaiting faculty logging"
          icon={<Clock className="w-5 h-5 text-[#644B00]" />}
          highlightColor="yellow"
        />

        <MetricCard
          title="Overdue Topics"
          value={overdueTopics.length}
          subtitle="Behind scheduled plan"
          icon={<AlertOctagon className="w-5 h-5 text-[#701A4A]" />}
          highlightColor={overdueTopics.length > 0 ? 'pink' : 'green'}
        />
      </div>

      {/* Missed Class Logs Table (With 48h Escalation) */}
      <div className="bg-white rounded-3xl border border-[#EFE8DC] shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EFE8DC] bg-[#FAF7F0]/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#1C1917] text-base tracking-tight">
              Unlogged Classes & 48-Hour Escalation Tracker
            </h3>
            <p className="text-xs text-[#78716C]">
              Sessions overdue by more than 48 hours trigger Campus Manager escalation flags.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-[#EFE8DC] text-[#1C1917]">
            {missedSessions.length} Tracked Classes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F0] text-[#78716C] font-semibold border-b border-[#EFE8DC]">
              <tr>
                <th className="py-3 px-4">Scheduled Date</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Assigned Faculty</th>
                <th className="py-3 px-4">Hours Overdue</th>
                <th className="py-3 px-4">Escalation Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DC]/60">
              {missedSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#78716C]">
                    All scheduled sessions have been logged on time. No pending escalations.
                  </td>
                </tr>
              ) : (
                missedSessions.map((session) => {
                  const sub = subjects.find((s) => s.id === session.subject_id);
                  const faculty = users.find((u) => u.id === session.faculty_id);
                  const isSevere = session.hours_overdue >= 48;

                  return (
                    <tr key={session.id} className="hover:bg-[#FAF7F0]/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#1C1917] whitespace-nowrap">
                        <div>{session.scheduled_date}</div>
                        <div className="text-[11px] text-[#78716C] font-normal">{session.scheduled_time} ({session.duration_hours}h)</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#1C1917]">
                        <div>{sub?.name || 'Subject'}</div>
                        <div className="text-[11px] text-[#78716C] font-medium">{sub?.code}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#1C1917]">
                        <div>{faculty?.name || 'Faculty Member'}</div>
                        <div className="text-[11px] text-[#78716C]">{faculty?.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isSevere
                              ? 'bg-[#FDF2F4] text-[#701A4A] border-[#F8CAD4]'
                              : 'bg-[#FEF9E7] text-[#644B00] border-[#FBE69B]'
                          }`}
                        >
                          {session.hours_overdue} Hours Overdue
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {session.status === 'resolved' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EEF7EF] text-[#2D451B] border border-[#C8E8CD]">
                            Resolved
                          </span>
                        ) : session.status === 'escalated' || isSevere ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDF2F4] text-[#701A4A] border border-[#F8CAD4] flex items-center gap-1 w-fit">
                            <ShieldAlert className="w-3.5 h-3.5 text-[#701A4A]" />
                            <span>Escalated (&gt;48h)</span>
                          </span>
                        ) : session.status === 'reminded' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F0F6FD] text-[#1E3A8A] border border-[#CADCF8]">
                            Reminder Sent
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF7F0] text-[#78716C] border border-[#EFE8DC]">
                            Unlogged
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {session.status !== 'resolved' && (
                            <>
                              <button
                                onClick={() =>
                                  handleSendReminder(session.id, faculty?.name || 'Faculty')
                                }
                                className="px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF7F0] text-[#1C1917] border border-[#EFE8DC] font-medium text-xs flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                              >
                                <Send className="w-3 h-3 text-[#1C1917]" />
                                <span>Send Reminder</span>
                              </button>
                              {isSevere && session.status !== 'escalated' && canEscalate && (
                                <button
                                  onClick={() => handleEscalateSession(session.id)}
                                  className="px-3 py-1.5 rounded-full bg-[#1C1917] hover:bg-black text-[#F8CAD4] font-medium text-xs flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                >
                                  <ShieldAlert className="w-3 h-3 text-[#F8CAD4]" />
                                  <span>Escalate</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleResolveSession(session.id)}
                                className="px-3 py-1.5 rounded-full bg-[#EEF7EF] hover:bg-[#C8E8CD]/40 text-[#2D451B] border border-[#C8E8CD] font-medium text-xs cursor-pointer transition-all"
                              >
                                Resolve
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
