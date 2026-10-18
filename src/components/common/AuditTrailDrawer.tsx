import React from 'react';
import { X, History, Clock, User } from 'lucide-react';
import { getAuditLogs } from '../../services/storage';

interface AuditTrailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditTrailDrawer: React.FC<AuditTrailDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const logs = getAuditLogs();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#EFE8DC]">
        <div className="p-4.5 border-b border-[#EFE8DC] flex items-center justify-between bg-[#FDFBF7]">
          <div className="flex items-center gap-2 text-[#1C1917]">
            <History className="w-4 h-4 text-[#1C1917]" />
            <h2 className="font-semibold text-sm tracking-tight">System Audit Trail</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#71695F] hover:text-[#1C1917] hover:bg-[#FAF7F0] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-[#71695F] text-xs">
              No audit records recorded yet.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl border border-[#EFE8DC] bg-[#FDFBF7] hover:bg-white hover:shadow-xs transition-all text-xs"
              >
                <div className="flex items-center justify-between text-[#71695F] mb-1">
                  <span className="font-medium text-[10px] px-2 py-0.5 rounded-full bg-[#FAF7F0] text-[#1C1917] border border-[#EFE8DC]">
                    {log.entity_type} • {log.action}
                  </span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3 h-3 text-[#9E9486]" />
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[#1C1917] font-medium mt-1.5 leading-snug">{log.details}</p>
                <div className="mt-2 pt-2 border-t border-[#EFE8DC] flex items-center gap-1.5 text-[#71695F] text-[11px]">
                  <User className="w-3 h-3 text-[#9E9486]" />
                  <span>{log.performed_by_name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
