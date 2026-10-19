import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../services/authContext';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  CalendarDays,
  FileCheck2,
  Building2,
  Settings,
  UserCheck,
  TrendingUp,
  X,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { getMissedSessions } from '../../services/storage';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const { currentUser, isAdmin, isCampusManager, isFaculty, isStudent, logout } = useAuth();
  const missedSessions = getMissedSessions();

  // Filter escalated sessions according to role
  const campusMissed = isCampusManager && currentUser?.branch_id
    ? missedSessions.filter((m) => (m.branch_id || m.campus_id) === currentUser.branch_id)
    : missedSessions;

  const escalatedCount = campusMissed.filter(
    (m) => m.status === 'escalated' || m.status === 'unlogged'
  ).length;

  // Role-segmented navigation lists
  const studentItems = [
    { to: '/student', label: 'My Academics', icon: UserCheck, visible: true },
    { to: '/opportunities', label: 'Opportunities', icon: Sparkles, visible: true },
    { to: '/calendar', label: 'My Calendar', icon: CalendarDays, visible: true },
    { to: '/lesson-plan', label: 'Learning Library', icon: BookOpen, visible: true },
    { to: '/exams', label: 'Exam Schedule', icon: GraduationCap, visible: true },
  ];

  const facultyItems = [
    { to: '/faculty', label: 'Faculty Dashboard', icon: BookOpen, visible: true },
    { to: '/lesson-plan', label: 'Learning Library', icon: FileCheck2, visible: true },
    { to: '/calendar', label: 'Weekly Schedule', icon: CalendarDays, visible: true },
    { to: '/exams', label: 'Exam Readiness', icon: GraduationCap, visible: true },
  ];

  const campusManagerItems = [
    { to: '/campus-manager', label: 'Campus Dashboard', icon: Building2, badgeCount: escalatedCount > 0 ? escalatedCount : undefined, visible: true },
    { to: '/progress', label: 'Course Progress', icon: TrendingUp, visible: true },
    { to: '/faculty', label: 'Class Logs', icon: BookOpen, visible: true },
    { to: '/lesson-plan', label: 'Learning Library', icon: FileCheck2, visible: true },
    { to: '/calendar', label: 'Timetable', icon: CalendarDays, visible: true },
    { to: '/exams', label: 'Exam Readiness', icon: GraduationCap, visible: true },
  ];

  const adminGeneralItems = [
    { to: '/', label: 'Global Overview', icon: LayoutDashboard, visible: true },
    { to: '/progress', label: 'Progression', icon: TrendingUp, visible: true },
    { to: '/calendar', label: 'Schedule', icon: CalendarDays, visible: true },
    { to: '/faculty', label: 'Class Logs', icon: BookOpen, visible: true },
    { to: '/lesson-plan', label: 'Learning Library', icon: FileCheck2, visible: true },
    { to: '/exams', label: 'Exam Readiness', icon: GraduationCap, visible: true },
  ];

  const adminToolsItems = [
    { to: '/student', label: 'Student Portal', icon: UserCheck, visible: true },
    { to: '/opportunities', label: 'Opportunities Hub', icon: Sparkles, visible: true },
    { to: '/campus-manager', label: 'Escalations', icon: Building2, badgeCount: escalatedCount > 0 ? escalatedCount : undefined, visible: true },
    { to: '/admin', label: 'Admin Console', icon: Settings, visible: true },
  ];

  const renderNavLinks = (items: Array<{ to: string; label: string; icon: any; badgeCount?: number }>) => (
    <div className="space-y-1 px-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onCloseMobile}
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[13px] transition-all duration-150 ${
              isActive
                ? 'bg-white/12 text-white font-semibold shadow-xs ring-1 ring-white/10'
                : 'text-[#9C968C] hover:text-white hover:bg-white/5 font-normal'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <item.icon className="w-4 h-4 shrink-0 stroke-[1.8] opacity-85" />
            <span className="truncate">{item.label}</span>
          </div>
          {item.badgeCount ? (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#F8CAD4] text-[#701C2F]">
              {item.badgeCount}
            </span>
          ) : null}
        </NavLink>
      ))}
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#181716] text-[#EAE5DC] p-3 justify-between select-none">
      <div>
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-3 border-b border-white/8 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-white text-lg tracking-tight">CourseTracker</span>
            <span className="w-2 h-2 rounded-full bg-[#FBE69B]" />
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Brand Header for Desktop */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 pt-3 pb-5">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white text-sm shadow-xs border border-white/10">
            CT
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-sm tracking-tight">CourseTracker</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBE69B]" />
            </div>
            <p className="text-[11px] text-[#8C867B] capitalize">
              {currentUser?.role?.replace('_', ' ') || 'Guest'}
            </p>
          </div>
        </div>

        {/* Navigation Sections */}
        {isStudent && (
          <div className="mb-4">
            <div className="px-3 pb-2 text-[11px] font-medium text-[#8C867B]">
              Student Area
            </div>
            {renderNavLinks(studentItems)}
          </div>
        )}

        {isFaculty && (
          <div className="mb-4">
            <div className="px-3 pb-2 text-[11px] font-medium text-[#8C867B]">
              Faculty Workspace
            </div>
            {renderNavLinks(facultyItems)}
          </div>
        )}

        {isCampusManager && (
          <div className="mb-4">
            <div className="px-3 pb-2 text-[11px] font-medium text-[#8C867B]">
              Campus Operations
            </div>
            {renderNavLinks(campusManagerItems)}
          </div>
        )}

        {isAdmin && (
          <>
            <div className="mb-4">
              <div className="px-3 pb-2 text-[11px] font-medium text-[#8C867B]">
                Academic Overview
              </div>
              {renderNavLinks(adminGeneralItems)}
            </div>

            <div>
              <div className="px-3 pb-2 text-[11px] font-medium text-[#8C867B]">
                Management
              </div>
              {renderNavLinks(adminToolsItems)}
            </div>
          </>
        )}
      </div>

      {/* Bottom User info & Logout */}
      <div className="p-2 border-t border-white/8 mt-auto">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 text-xs text-[#9C968C] hover:text-white hover:bg-white/5 rounded-2xl w-full transition-all cursor-pointer font-medium"
        >
          <LogOut className="w-4 h-4 shrink-0 opacity-80" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Floating Dark Sidebar */}
      <aside className="hidden lg:block w-52 shrink-0 h-[calc(100vh-2rem)] sticky top-4 rounded-[28px] bg-[#181716] text-[#EAE5DC] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#262422] z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200 bg-[#181716]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
