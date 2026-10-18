import React, { useState, useMemo } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getExtraClassRequests,
  withdrawExtraClassRequest,
} from '../../services/storage';
import { ExtraClassRequest, ExtraClassRequestStatus } from '../../types';
import { RequestExtraClassModal } from './RequestExtraClassModal';
import { Modal } from '../common/Modal';
import {
  Calendar,
  Clock,
  Plus,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  BookOpen,
  MapPin,
  CalendarDays,
  History,
  Edit3,
  ShieldCheck,
  Building2,
  Sparkles,
} from 'lucide-react';

interface MyExtraClassRequestsProps {
  onNewRequestClick?: () => void;
}

export const MyExtraClassRequests: React.FC<MyExtraClassRequestsProps> = () => {
  const { currentUser } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ExtraClassRequest | null>(null);
  const [inspectingRequest, setInspectingRequest] = useState<ExtraClassRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [notice, setNotice] = useState<string | null>(null);

  const allRequests = getExtraClassRequests();

  // Filter requests strictly for current faculty user
  const myRequests = useMemo(() => {
    if (!currentUser) return [];
    const list = allRequests.filter((r) => r.faculty_id === currentUser.id);
    if (statusFilter === 'all') return list;
    return list.filter((r) => r.status === statusFilter);
  }, [allRequests, currentUser, statusFilter]);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleWithdraw = (req: ExtraClassRequest) => {
    if (!currentUser) return;
    if (
      !window.confirm(
        `Are you sure you want to withdraw the extra class request for ${req.subject_name} on ${req.date}?`
      )
    ) {
      return;
    }

    const res = withdrawExtraClassRequest(req.id, currentUser);
    if (res.success) {
      showNotification('Request withdrawn successfully.');
    } else {
      showNotification(res.error || 'Failed to withdraw request.');
    }
  };

  const handleOpenEdit = (req: ExtraClassRequest) => {
    setEditingRequest(req);
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingRequest(null);
    setIsModalOpen(true);
  };

  const renderStatusBadge = (status: ExtraClassRequestStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEF9E7] text-[#614800] border border-[#FBE69B] flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B08800] animate-pulse" />
            Pending Approval
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EEF7EF] text-[#1E4627] border border-[#C8E8CD] flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3 h-3 text-[#2D733B]" />
            Approved & Scheduled
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FDF2F4] text-[#701C2F] border border-[#F8CAD4] flex items-center gap-1.5 w-fit">
            <XCircle className="w-3 h-3 text-[#9E2A4B]" />
            Rejected
          </span>
        );
      case 'changes_requested':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F0F6FD] text-[#193B6D] border border-[#CCE0F9] flex items-center gap-1.5 w-fit">
            <AlertCircle className="w-3 h-3 text-[#1E3A8A]" />
            Changes Requested
          </span>
        );
      case 'withdrawn':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FAF7F0] text-[#78716C] border border-[#EFE8DC] flex items-center gap-1.5 w-fit">
            Withdrawn
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl p-6 border border-[#EFE8DC] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] px-3 py-0.5 rounded-full bg-[#FAF7F0] text-[#78716C] border border-[#EFE8DC] font-semibold">
                Academic Delivery
              </span>
              <span className="text-xs text-[#78716C]">
                • {currentUser?.branch_id || 'Campus'} • {currentUser?.assigned_track || 'Track'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C1917] tracking-tight">
              My Extra Class Requests
            </h2>
            <p className="text-xs text-[#78716C] mt-1 max-w-xl">
              Submit supplementary class sessions for syllabus acceleration or revision. Every request undergoes clash detection and Campus Manager approval before official calendar publication.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenNew}
              className="px-4 py-2.5 rounded-2xl bg-[#1C1917] text-white font-bold text-xs hover:bg-[#292524] transition-colors shadow-2xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-[#FBE69B]" />
              <span>Request Extra Class</span>
            </button>
          </div>
        </div>

        {notice && (
          <div className="mt-4 p-3 rounded-2xl bg-[#EEF7EF] border border-[#C8E8CD] text-[#1E4627] text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2D733B] shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Filter Pills */}
        <div className="mt-5 pt-4 border-t border-[#EFE8DC] flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-[#78716C] mr-1">Filter Status:</span>
          {['all', 'pending', 'approved', 'changes_requested', 'rejected', 'withdrawn'].map((st) => {
            const count =
              st === 'all'
                ? allRequests.filter((r) => r.faculty_id === currentUser?.id).length
                : allRequests.filter((r) => r.faculty_id === currentUser?.id && r.status === st).length;
            const active = statusFilter === st;

            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#1C1917] text-white shadow-2xs'
                    : 'bg-[#FAF7F0] text-[#78716C] hover:bg-[#EFE8DC] border border-[#EFE8DC]'
                }`}
              >
                <span className="capitalize">{st.replace('_', ' ')}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-white text-[#78716C]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Requests List */}
      {myRequests.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-[#EFE8DC] text-center space-y-3">
          <CalendarDays className="w-10 h-10 text-[#78716C]/40 mx-auto" />
          <h3 className="font-bold text-[#1C1917] text-sm">No Extra Class Requests Found</h3>
          <p className="text-xs text-[#78716C] max-w-md mx-auto">
            {statusFilter === 'all'
              ? 'You have not submitted any extra class requests yet. Click "Request Extra Class" to schedule a supplementary lecture or lab session.'
              : `No requests with status "${statusFilter}".`}
          </p>
          <button
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs font-bold text-[#1C1917] hover:bg-[#EFE8DC] transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5 text-[#1C1917]" />
            <span>Create New Request</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myRequests.map((req) => {
            const isPending = req.status === 'pending';
            const isChangesRequested = req.status === 'changes_requested';
            const isApproved = req.status === 'approved';
            const isRejected = req.status === 'rejected';

            return (
              <div
                key={req.id}
                className="bg-white rounded-3xl p-5 border border-[#EFE8DC] shadow-2xs flex flex-col justify-between space-y-4 hover:border-[#1C1917]/20 transition-all"
              >
                <div>
                  {/* Top Bar: Subject, Date, Status */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-[#78716C] bg-[#FAF7F0] px-2 py-0.5 rounded-md border border-[#EFE8DC]">
                          {req.subject_code || 'COURSE'}
                        </span>
                        <span className="text-[11px] font-medium text-[#78716C]">
                          {req.academic_track}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-[#1C1917] text-base leading-tight">
                        {req.subject_name || req.subject_id}
                      </h4>
                    </div>
                    {renderStatusBadge(req.status)}
                  </div>

                  {/* Batch & Timing Pill */}
                  <div className="p-3 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[#1C1917] font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#78716C]" />
                        <span>{req.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#78716C]" />
                        <span>
                          {req.start_time} - {req.end_time} ({req.duration_hours}h)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#78716C] pt-1 border-t border-[#EFE8DC]/60">
                      <span>{req.batch_name || req.batch_id}</span>
                      <span className="flex items-center gap-1 font-medium text-[#1C1917]">
                        <MapPin className="w-3 h-3 text-[#78716C]" />
                        {req.room || 'Seminar Hall'}
                      </span>
                    </div>
                  </div>

                  {/* Reason & Topics */}
                  <div className="mt-3 space-y-2 text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-[#78716C] tracking-wider">
                        Objective / Reason:
                      </div>
                      <p className="text-[#1C1917] font-medium text-xs mt-0.5 leading-snug">
                        {req.reason}
                      </p>
                    </div>

                    {req.topic_titles && req.topic_titles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {req.topic_titles.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-[#EFE8DC] text-[#78716C] font-medium"
                          >
                            • {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Manager Feedback if Changes Requested */}
                    {isChangesRequested && req.change_request_notes && (
                      <div className="p-3 rounded-xl bg-[#F0F6FD] border border-[#CADCF8] text-[#1E3A8A] text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Manager Requested Revision:</span>
                        </div>
                        <p className="text-[11px] text-[#193B6D] leading-relaxed">
                          {req.change_request_notes}
                        </p>
                      </div>
                    )}

                    {/* Rejection notice */}
                    {isRejected && req.rejection_reason && (
                      <div className="p-3 rounded-xl bg-[#FDF2F4] border border-[#F8CAD4] text-[#701C2F] text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[11px]">
                          <XCircle className="w-3.5 h-3.5 text-[#9E2A4B]" />
                          <span>Rejection Reason:</span>
                        </div>
                        <p className="text-[11px] text-[#701C2F] leading-relaxed">
                          {req.rejection_reason}
                        </p>
                      </div>
                    )}

                    {/* Approved confirmation banner */}
                    {isApproved && (
                      <div className="p-2.5 rounded-xl bg-[#EEF7EF] border border-[#C8E8CD] text-[#1E4627] text-[11px] font-medium flex items-center justify-between">
                        <span>
                          Approved by <strong>{req.reviewed_by_name || 'Campus Manager'}</strong>
                        </span>
                        <span className="text-[10px] text-[#2D733B]">Official Calendar Updated</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-[#EFE8DC] flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => setInspectingRequest(req)}
                    className="text-[#78716C] hover:text-[#1C1917] font-semibold flex items-center gap-1 text-[11px] transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Audit Trail ({req.history.length})</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Revise Button */}
                    {isChangesRequested && (
                      <button
                        onClick={() => handleOpenEdit(req)}
                        className="px-3 py-1.5 rounded-xl bg-[#1E3A8A] text-white font-bold text-xs hover:bg-[#1E3A8A]/90 transition-colors shadow-2xs flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Revise & Resubmit</span>
                      </button>
                    )}

                    {/* Withdraw Button */}
                    {(isPending || isChangesRequested) && (
                      <button
                        onClick={() => handleWithdraw(req)}
                        className="px-3 py-1.5 rounded-xl border border-[#EFE8DC] text-[#78716C] hover:text-[#9E2A4B] hover:border-[#F8CAD4] font-semibold text-xs transition-colors"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request Modal */}
      <RequestExtraClassModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRequest(null);
        }}
        editingRequest={editingRequest}
        onRequestSubmitted={() => {
          // Handled via storage reactive listeners
        }}
      />

      {/* History Inspection Modal */}
      {inspectingRequest && (
        <Modal
          isOpen={!!inspectingRequest}
          onClose={() => setInspectingRequest(null)}
          title={`Audit History: ${inspectingRequest.subject_name}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] space-y-1">
              <div className="font-bold text-[#1C1917]">
                Request ID: <span className="font-mono text-[#78716C]">{inspectingRequest.id}</span>
              </div>
              <div className="text-[11px] text-[#78716C]">
                Batch: {inspectingRequest.batch_name} • Date: {inspectingRequest.date} ({inspectingRequest.start_time}-{inspectingRequest.end_time})
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-bold text-[#1C1917] uppercase tracking-wider text-[11px]">
                Workflow Timeline
              </div>
              <div className="space-y-2 border-l-2 border-[#EFE8DC] pl-3 ml-2">
                {inspectingRequest.history.map((entry, idx) => (
                  <div key={idx} className="relative pb-2">
                    <div className="font-semibold text-[#1C1917] flex items-center gap-2">
                      <span>{entry.action}</span>
                      <span className="text-[10px] text-[#78716C] font-normal">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#78716C]">
                      By: <strong className="text-[#1C1917]">{entry.performed_by_name}</strong>
                    </div>
                    {entry.notes && (
                      <p className="mt-1 p-2 rounded-lg bg-[#FAF7F0] border border-[#EFE8DC] text-[11px] text-[#1C1917]">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE8DC] flex justify-end">
              <button
                onClick={() => setInspectingRequest(null)}
                className="px-4 py-2 rounded-xl bg-[#1C1917] text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
