import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import { UserRole } from '../../types';
import {
  Search,
  History,
  LogOut,
  Shield,
  Menu,
} from 'lucide-react';
import { AuditTrailDrawer } from './AuditTrailDrawer';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const {
    currentUser,
    isAdmin,
    isCampusManager,
    logout,
  } = useAuth();

  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const roleLabels: Record<UserRole, { label: string; badge: string; color: string }> = {
    admin: { label: 'Admin', badge: 'Administrator', color: 'bg-[#FDF2F4] text-[#701C2F] border-[#F8CAD4]' },
    campus_manager: { label: 'Campus Manager', badge: 'Campus Authority', color: 'bg-[#F0F6FD] text-[#193B6D] border-[#CCE0F9]' },
    faculty: { label: 'Faculty', badge: 'Instructor', color: 'bg-[#EEF7EF] text-[#1E4627] border-[#C8E8CD]' },
    student: { label: 'Student', badge: 'Student', color: 'bg-[#FEF9E7] text-[#614800] border-[#FBE69B]' },
  };

  const userRoleConfig = currentUser ? roleLabels[currentUser.role] : roleLabels.student;

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FDFBF7]/95 backdrop-blur-md px-4 sm:px-6 lg:px-7 py-3 border-b border-[#EFE8DC] transition-all">
        <div className="flex items-center justify-between gap-3">
          {/* Mobile hamburger button */}
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-2xl text-[#1C1917] bg-white border border-[#EFE8DC] hover:bg-[#FAF7F0] transition-colors shrink-0"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Capsule Search Bar */}
          <div className="flex-1 max-w-xl flex items-center gap-2.5 bg-white border border-[#EFE8DC] rounded-full px-4 py-2 shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-all focus-within:ring-2 focus-within:ring-[#1C1917]/10 focus-within:border-[#1C1917]/25">
            <Search className="w-4 h-4 text-[#9C9488] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, syllabus topics, class logs..."
              className="w-full bg-transparent text-[13px] text-[#1C1917] placeholder-[#9C9488] focus:outline-hidden"
            />
            <span className="hidden md:inline-flex items-center text-[11px] font-medium text-[#7A7266] bg-[#FAF7F0] px-2.5 py-0.5 rounded-full border border-[#EFE8DC] shrink-0">
              {currentUser?.branch_id || 'Academic Scope'}
            </span>
          </div>

          {/* Right section: Authenticated User Profile Capsule & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Authenticated User Capsule */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-[#EFE8DC] bg-white text-[#1C1917] text-xs shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className="w-5 h-5 rounded-full object-cover border border-[#EFE8DC]"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#FAF7F0] border border-[#EFE8DC] flex items-center justify-center">
                  <Shield className="w-3 h-3 text-[#71695F]" />
                </div>
              )}

              <span className="hidden sm:inline font-semibold text-[#1C1917] max-w-[130px] truncate text-xs">
                {currentUser?.name || 'User'}
              </span>

              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${userRoleConfig.color}`}>
                {userRoleConfig.label}
              </span>
            </div>

            {/* Audit Trail Drawer Button */}
            {(isAdmin || isCampusManager) && (
              <button
                onClick={() => setShowAuditDrawer(true)}
                className="p-2 rounded-full text-[#71695F] hover:text-[#1C1917] hover:bg-white border border-[#EFE8DC] bg-white/80 transition-colors cursor-pointer"
                title="View Audit Trail"
              >
                <History className="w-4 h-4" />
              </button>
            )}

            {/* Logout button */}
            <button
              onClick={logout}
              className="p-2 rounded-full text-[#71695F] hover:text-[#701C2F] hover:bg-[#FDF2F4] border border-[#EFE8DC] bg-white/80 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {(isAdmin || isCampusManager) && (
        <AuditTrailDrawer
          isOpen={showAuditDrawer}
          onClose={() => setShowAuditDrawer(false)}
        />
      )}
    </>
  );
};
