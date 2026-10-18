import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/authContext';
import { ShieldAlert, ArrowLeft, Home, LogOut } from 'lucide-react';

interface AccessDeniedProps {
  requiredRole?: string;
  message?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ requiredRole, message }) => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const getDashboardPath = () => {
    if (!currentUser) return '/';
    switch (currentUser.role) {
      case 'student':
        return '/student';
      case 'faculty':
        return '/faculty';
      case 'campus_manager':
        return '/campus-manager';
      case 'admin':
        return '/admin';
      default:
        return '/';
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#EFE8DC] shadow-[0_8px_30px_-4px_rgba(28,25,23,0.04)] text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#FDF2F4] border border-[#F8CAD4] flex items-center justify-center text-[#701A4A]">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#FDF2F4] text-[#701A4A] border border-[#F8CAD4] mb-3">
          403 Forbidden • Access Restricted
        </span>

        <h1 className="text-2xl font-extrabold text-[#1C1917] tracking-tight mb-2">
          Access Denied
        </h1>

        <p className="text-xs text-[#78716C] leading-relaxed mb-6">
          {message ||
            `Your authenticated role (${currentUser?.role || 'Guest'}) does not have permission to view or manage this administrative resource.${
              requiredRole ? ` Required authorization: ${requiredRole}.` : ''
            }`}
        </p>

        <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] text-left text-xs mb-6">
          <div className="text-[10px] font-semibold text-[#78716C] uppercase tracking-wider mb-1">
            Current Identity
          </div>
          <div className="font-bold text-[#1C1917]">{currentUser?.name || 'Unauthenticated'}</div>
          <div className="text-[11px] text-[#78716C]">
            Role: <span className="font-semibold capitalize text-[#1C1917]">{currentUser?.role || 'None'}</span>
            {currentUser?.branch_id && ` • Campus: ${currentUser.branch_id}`}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={() => navigate(getDashboardPath())}
            className="flex-1 py-2.5 px-4 rounded-full text-xs font-semibold bg-[#1C1917] text-white hover:bg-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>

          <button
            onClick={logout}
            className="py-2.5 px-4 rounded-full text-xs font-medium text-[#78716C] hover:text-[#701A4A] hover:bg-[#FDF2F4] border border-[#EFE8DC] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
