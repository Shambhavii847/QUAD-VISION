import React from 'react';
import { useAuth } from '../../services/authContext';
import { Building2, LogOut, HelpCircle, AlertCircle } from 'lucide-react';

interface CampusGuardProps {
  children: React.ReactNode;
}

/**
 * CampusGuard wraps campus-specific views and blocks access when the
 * authenticated user (student / faculty / campus_manager) has no valid
 * campus assignment. Admins bypass this guard.
 * When campus is missing, it renders an error message.
 */
export const CampusGuard: React.FC<CampusGuardProps> = ({ children }) => {
  const { currentUser, campusAssignmentValid, campusAssignmentError, logout } = useAuth();

  // Admins bypass campus guard
  if (currentUser?.role === 'admin') {
    return <>{children}</>;
  }

  if (campusAssignmentValid) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-3xl p-8 border border-[#EFE8DC] shadow-[0_8px_30px_-4px_rgba(28,25,23,0.04)] text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center">
          <Building2 className="w-8 h-8 text-[#92400E]" />
        </div>
        <span className="inline-block px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] mb-3">
          Campus Assignment Required
        </span>
        <h1 className="text-xl font-extrabold text-[#1C1917] tracking-tight mb-2">
          No Campus Assigned
        </h1>
        <p className="text-xs text-[#78716C] leading-relaxed mb-4">
          {campusAssignmentError ||
            'Your account does not have a campus assignment. You cannot access campus-specific academic data until an administrator assigns you to a campus.'}
        </p>
        <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] text-left text-xs mb-6">
          <div className="flex items-center gap-1.5 mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-[#78716C]" />
            <span className="text-[10px] font-semibold text-[#78716C] uppercase tracking-wider">
              What to do
            </span>
          </div>
          <ul className="space-y-1.5 text-[#57534E]">
            <li className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-[#92400E] shrink-0" />
              <span>Contact your campus administrator or IT support to assign your account to the correct campus.</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-[#92400E] shrink-0" />
              <span>Provide your registered email (<strong>{currentUser?.email || 'N/A'}</strong>) and role (<strong className="capitalize">{currentUser?.role || 'N/A'}</strong>) to expedite the process.</span>
            </li>
          </ul>
        </div>
        <button
          onClick={logout}
          className="py-2.5 px-6 rounded-full text-xs font-semibold text-[#78716C] hover:text-[#701A4A] hover:bg-[#FDF2F4] border border-[#EFE8DC] transition-all flex items-center justify-center gap-1.5 cursor-pointer mx-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
