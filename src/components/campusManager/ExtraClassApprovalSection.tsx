import React, { useState, useMemo } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getExtraClassRequests,
  getSubjects,
  getBatches,
  getTimetable,
  getExaminations,
  getHolidays,
  getUsers,
  reviewExtraClassRequest,
} from '../../services/storage';
import { detectExtraClassClashes, ClashDetectionResult, ClashConflict } from '../../utils/clashDetection';
import {
  ExtraClassRequest,
  ExtraClassRequestStatus,
  BranchId,
} from '../../types';
import { Modal } from '../common/Modal';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Building2,
  BookOpen,
  Filter,
  Search,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Send,
  Sparkles,
  MapPin,
  Lock,
  ChevronRight,
  User,
  History,
  FileText,
} from 'lucide-react';

interface ExtraClassApprovalSectionProps {
  activeBranch: BranchId;
  isAdminCrossBranch?: boolean;
}

export const ExtraClassApprovalSection: React.FC<ExtraClassApprovalSectionProps> = ({
  activeBranch,
  isAdminCrossBranch = false,
}) => {
  const { currentUser, isAdmin, isCampusManager } = useAuth();

  const allRequests = getExtraClassRequests();
  const allSubjects = getSubjects();
  const allBatches = getBatches();
  const allTimetable = getTimetable();
  const allExams = getExaminations();
  const allHolidays = getHolidays();
  const allUsers = getUsers();

  // Branch isolation: Campus Manager can view and approve ONLY requests matching activeBranch
  const branchRequests = useMemo(() => {
    if (isAdmin && isAdminCrossBranch) {
      return allRequests;
    }
    return allRequests.filter((r) => r.branch_id === activeBranch);
  }, [allRequests, activeBranch, isAdmin, isAdminCrossBranch]);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [reviewingRequest, setReviewingRequest] = useState<ExtraClassRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<ExtraClassRequest | null>(null);
  const [requestingChangesReq, setRequestingChangesReq] = useState<ExtraClassRequest | null>(null);
  const [historyRequest, setHistoryRequest] = useState<ExtraClassRequest | null>(null);

  // Form states for modals
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [changeNotes, setChangeNotes] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [approvedRoom, setApprovedRoom] = useState<string>('');

  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Filter options
  const availableBatches = useMemo(() => {
    return allBatches.filter((b) => (b.branch_id || b.campus_id) === activeBranch);
  }, [allBatches, activeBranch]);

  const availableSubjects = useMemo(() => {
    return allSubjects.filter((s) => (s.branch_id || s.campus_id) === activeBranch);
  }, [allSubjects, activeBranch]);

  // Apply filters
  const filteredRequests = useMemo(() => {
    return branchRequests.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (subjectFilter !== 'all' && req.subject_id !== subjectFilter) return false;
      if (batchFilter !== 'all' && req.batch_id !== batchFilter) return false;
      if (dateFilter && req.date !== dateFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchFaculty = req.faculty_name.toLowerCase().includes(q);
        const matchSubj = (req.subject_name || '').toLowerCase().includes(q) || (req.subject_code || '').toLowerCase().includes(q);
        const matchReason = req.reason.toLowerCase().includes(q);
        const matchBatch = (req.batch_name || '').toLowerCase().includes(q);
        if (!matchFaculty && !matchSubj && !matchReason && !matchBatch) return false;
      }

      return true;
    });
  }, [branchRequests, statusFilter, subjectFilter, batchFilter, dateFilter, searchQuery]);

  // Compute clash detection for the actively reviewed request
  const activeClashes = useMemo<ClashDetectionResult | null>(() => {
    if (!reviewingRequest) return null;
    return detectExtraClassClashes(reviewingRequest, {
      existingRequests: allRequests,
      timetable: allTimetable,
      examinations: allExams,
      holidays: allHolidays,
      subjects: allSubjects,
      batches: allBatches,
    });
  }, [reviewingRequest, allRequests, allTimetable, allExams, allHolidays, allSubjects, allBatches]);

  // Handlers
  const handleOpenReview = (req: ExtraClassRequest) => {
    setReviewingRequest(req);
    setApprovedRoom(req.room || 'Lecture Hall A');
    setOverrideReason('');
    setActionError(null);
  };

  const handleApproveSubmit = () => {
    if (!currentUser || !reviewingRequest) return;
    setIsProcessing(true);
    setActionError(null);

    const res = reviewExtraClassRequest(
      reviewingRequest.id,
      {
        decision: 'approve',
        override_reason: overrideReason.trim(),
        room: approvedRoom.trim(),
      },
      currentUser
    );

    setIsProcessing(false);

    if (!res.success) {
      setActionError(res.error || 'Failed to approve request.');
      return;
    }

    setReviewingRequest(null);
    showNotice(
      `Approved extra class for ${reviewingRequest.subject_name}! Official calendar updated.`
    );
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !rejectingRequest) return;

    if (!rejectionReason.trim()) {
      setActionError('A mandatory rejection reason is required.');
      return;
    }

    setIsProcessing(true);
    const res = reviewExtraClassRequest(
      rejectingRequest.id,
      {
        decision: 'reject',
        reason: rejectionReason.trim(),
      },
      currentUser
    );
    setIsProcessing(false);

    if (!res.success) {
      setActionError(res.error || 'Failed to reject request.');
      return;
    }

    setRejectingRequest(null);
    setRejectionReason('');
    showNotice(`Request rejected. Rejection reason recorded for faculty.`);
  };

  const handleRequestChangesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !requestingChangesReq) return;

    if (!changeNotes.trim()) {
      setActionError('Please specify the required changes for faculty revision.');
      return;
    }

    setIsProcessing(true);
    const res = reviewExtraClassRequest(
      requestingChangesReq.id,
      {
        decision: 'request_changes',
        change_request_notes: changeNotes.trim(),
      },
      currentUser
    );
    setIsProcessing(false);

    if (!res.success) {
      setActionError(res.error || 'Failed to request changes.');
      return;
    }

    setRequestingChangesReq(null);
    setChangeNotes('');
    showNotice(`Requested changes sent to faculty member.`);
  };

  const pendingCount = branchRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="bg-white rounded-3xl border border-[#EFE8DC] shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#EFE8DC] bg-[#FAF7F0]/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white text-[#78716C] border border-[#EFE8DC] font-semibold flex items-center gap-1">
                <Building2 className="w-3 h-3 text-[#78716C]" />
                {activeBranch} Branch Operational Queue
              </span>
              {pendingCount > 0 && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FEF9E7] text-[#614800] border border-[#FBE69B] font-bold animate-pulse">
                  {pendingCount} Pending Approvals
                </span>
              )}
            </div>
            <h3 className="font-extrabold text-[#1C1917] text-lg tracking-tight">
              Extra Class Requests & Calendar Approvals
            </h3>
            <p className="text-xs text-[#78716C] mt-0.5 max-w-xl">
              Inspect faculty supplementary teaching requests, detect schedule & holiday conflicts, and publish confirmed events to the official academic calendar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-[#EFE8DC] text-[#1C1917]">
              {branchRequests.length} Total Requests
            </span>
          </div>
        </div>

        {/* Global Notification Banner */}
        {actionNotice && (
          <div className="mt-4 p-3 rounded-2xl bg-[#EEF7EF] border border-[#C8E8CD] text-[#1E4627] text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2D733B] shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Filter Controls */}
        <div className="mt-4 pt-4 border-t border-[#EFE8DC]/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Status */}
          <div>
            <label className="block text-[10px] font-bold text-[#78716C] uppercase mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 rounded-xl bg-white border border-[#EFE8DC] font-semibold text-[#1C1917] focus:outline-hidden"
            >
              <option value="all">All Statuses ({branchRequests.length})</option>
              <option value="pending">Pending ({branchRequests.filter((r) => r.status === 'pending').length})</option>
              <option value="approved">Approved ({branchRequests.filter((r) => r.status === 'approved').length})</option>
              <option value="changes_requested">Changes Requested ({branchRequests.filter((r) => r.status === 'changes_requested').length})</option>
              <option value="rejected">Rejected ({branchRequests.filter((r) => r.status === 'rejected').length})</option>
              <option value="withdrawn">Withdrawn ({branchRequests.filter((r) => r.status === 'withdrawn').length})</option>
            </select>
          </div>

          {/* Batch */}
          <div>
            <label className="block text-[10px] font-bold text-[#78716C] uppercase mb-1">Batch</label>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="w-full p-2 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden"
            >
              <option value="all">All Batches</option>
              {availableBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[10px] font-bold text-[#78716C] uppercase mb-1">Subject</label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full p-2 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[10px] font-bold text-[#78716C] uppercase mb-1">Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full p-2 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden"
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-[10px] font-bold text-[#78716C] uppercase mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Faculty or Topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF7F0] text-[#78716C] font-semibold border-b border-[#EFE8DC]">
            <tr>
              <th className="py-3 px-4">Faculty</th>
              <th className="py-3 px-4">Subject & Track</th>
              <th className="py-3 px-4">Batch</th>
              <th className="py-3 px-4">Requested Slot</th>
              <th className="py-3 px-4">Topic & Objective</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFE8DC]/60">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-[#78716C]">
                  No extra class requests matching the current filters.
                </td>
              </tr>
            ) : (
              filteredRequests.map((req) => {
                const isPending = req.status === 'pending';
                const isApproved = req.status === 'approved';
                const isChangesRequested = req.status === 'changes_requested';
                const isRejected = req.status === 'rejected';

                return (
                  <tr key={req.id} className="hover:bg-[#FAF7F0]/50 transition-colors">
                    {/* Faculty */}
                    <td className="py-3.5 px-4 font-semibold text-[#1C1917] whitespace-nowrap">
                      <div>{req.faculty_name}</div>
                      <div className="text-[11px] text-[#78716C] font-normal">
                        Submitted: {new Date(req.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Subject & Track */}
                    <td className="py-3.5 px-4 font-semibold text-[#1C1917]">
                      <div>{req.subject_name || req.subject_id}</div>
                      <div className="text-[11px] text-[#78716C] flex items-center gap-1 font-normal">
                        <span>{req.subject_code}</span>
                        <span>•</span>
                        <span className="text-[#1C1917] font-medium">{req.academic_track}</span>
                      </div>
                    </td>

                    {/* Batch */}
                    <td className="py-3.5 px-4 text-[#1C1917] font-medium whitespace-nowrap">
                      <div>{req.batch_name || req.batch_id}</div>
                      <div className="text-[11px] text-[#78716C] flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{req.room || 'Room TBD'}</span>
                      </div>
                    </td>

                    {/* Slot */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-[#1C1917]">{req.date}</div>
                      <div className="text-[11px] text-[#78716C] font-medium">
                        {req.start_time} - {req.end_time} ({req.duration_hours}h)
                      </div>
                    </td>

                    {/* Topic & Reason */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-[#1C1917] line-clamp-1">
                        {req.topic_titles?.[0] || req.reason}
                      </div>
                      <div className="text-[11px] text-[#78716C] line-clamp-1">
                        {req.reason}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isPending && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEF9E7] text-[#614800] border border-[#FBE69B] flex items-center gap-1.5 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B08800] animate-pulse" />
                          Pending Review
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EEF7EF] text-[#1E4627] border border-[#C8E8CD] flex items-center gap-1.5 w-fit">
                          <CheckCircle2 className="w-3 h-3 text-[#2D733B]" />
                          Approved
                        </span>
                      )}
                      {isChangesRequested && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F0F6FD] text-[#193B6D] border border-[#CCE0F9] flex items-center gap-1.5 w-fit">
                          <AlertCircle className="w-3 h-3 text-[#1E3A8A]" />
                          Changes Requested
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FDF2F4] text-[#701C2F] border border-[#F8CAD4] flex items-center gap-1.5 w-fit">
                          <XCircle className="w-3 h-3 text-[#9E2A4B]" />
                          Rejected
                        </span>
                      )}
                      {req.status === 'withdrawn' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FAF7F0] text-[#78716C] border border-[#EFE8DC] flex items-center gap-1.5 w-fit">
                          Withdrawn
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setHistoryRequest(req)}
                          title="View Audit Trail"
                          className="p-1.5 rounded-lg border border-[#EFE8DC] text-[#78716C] hover:bg-[#FAF7F0] transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        {(isPending || isChangesRequested) && (
                          <>
                            <button
                              onClick={() => handleOpenReview(req)}
                              className="px-3 py-1.5 rounded-xl bg-[#1C1917] text-white font-bold text-xs hover:bg-[#292524] transition-colors shadow-2xs flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-[#FBE69B]" />
                              <span>Review & Decide</span>
                            </button>

                            <button
                              onClick={() => {
                                setRequestingChangesReq(req);
                                setChangeNotes('');
                                setActionError(null);
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-[#CCE0F9] text-[#193B6D] bg-[#F0F6FD] hover:bg-[#CCE0F9]/40 font-semibold text-xs transition-colors"
                            >
                              Changes
                            </button>

                            <button
                              onClick={() => {
                                setRejectingRequest(req);
                                setRejectionReason('');
                                setActionError(null);
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-[#F8CAD4] text-[#701C2F] bg-[#FDF2F4] hover:bg-[#F8CAD4]/40 font-semibold text-xs transition-colors"
                            >
                              Reject
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

      {/* REVIEW & APPROVAL MODAL WITH FULL CLASH DETECTION */}
      {reviewingRequest && activeClashes && (
        <Modal
          isOpen={!!reviewingRequest}
          onClose={() => setReviewingRequest(null)}
          title={`Review Extra Class: ${reviewingRequest.subject_name}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-[#1C1917]">
            {/* Request Summary Card */}
            <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#78716C]" />
                  <span className="font-bold text-[#1C1917]">{reviewingRequest.faculty_name}</span>
                  <span className="text-[11px] text-[#78716C]">({reviewingRequest.faculty_email})</span>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white border border-[#EFE8DC] font-semibold text-[#1C1917]">
                  {reviewingRequest.branch_id} Campus • {reviewingRequest.academic_track}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#EFE8DC]/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#78716C]">Batch</span>
                  <div className="font-semibold">{reviewingRequest.batch_name}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#78716C]">Subject</span>
                  <div className="font-semibold">{reviewingRequest.subject_code}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#78716C]">Date & Time</span>
                  <div className="font-semibold">
                    {reviewingRequest.date} ({reviewingRequest.start_time} - {reviewingRequest.end_time})
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#78716C]">Duration</span>
                  <div className="font-semibold">{reviewingRequest.duration_hours} Teaching Hours</div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#EFE8DC]/80">
                <span className="text-[10px] uppercase font-bold text-[#78716C]">Objective / Reason</span>
                <p className="font-medium mt-0.5">{reviewingRequest.reason}</p>
              </div>

              {reviewingRequest.notes && (
                <div className="text-[11px] text-[#78716C]">
                  <strong>Faculty Notes:</strong> {reviewingRequest.notes}
                </div>
              )}
            </div>

            {/* CLASH DETECTION ENGINE REPORT */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-[#1C1917] text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#78716C]" />
                  <span>Timetable & Calendar Clash Detection</span>
                </h4>
                {activeClashes.hasClashes ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FDF2F4] border border-[#F8CAD4] text-[#701C2F] font-bold text-[11px]">
                    {activeClashes.conflicts.length} Conflicts Detected
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EEF7EF] border border-[#C8E8CD] text-[#1E4627] font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2D733B]" />
                    Conflict Free
                  </span>
                )}
              </div>

              {/* Clash warning cards */}
              {activeClashes.hasClashes ? (
                <div className="space-y-2.5">
                  {activeClashes.conflicts.map((conflict, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border ${
                        conflict.severity === 'error'
                          ? 'bg-[#FDF2F4] border-[#F8CAD4] text-[#701C2F]'
                          : 'bg-[#FEF9E7] border-[#FBE69B] text-[#614800]'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs mb-1">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{conflict.title}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">{conflict.details}</p>
                    </div>
                  ))}

                  {/* Duplicate error: Can NEVER override */}
                  {!activeClashes.canOverride && (
                    <div className="p-3 rounded-xl bg-[#FDF2F4] border border-[#F8CAD4] text-[#701C2F] font-bold text-xs">
                      Duplicate bookings cannot be approved. Please reject this duplicate request.
                    </div>
                  )}

                  {/* Permitted Override: Manager must input authorized reason */}
                  {activeClashes.canOverride && (
                    <div className="p-3.5 rounded-2xl bg-[#FEF9E7] border border-[#FBE69B] space-y-2">
                      <div className="font-bold text-[#614800] text-xs flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-[#8C6D00]" />
                        <span>Authorized Manager Override Required</span>
                      </div>
                      <p className="text-[11px] text-[#4D3A00]">
                        The system detected schedule conflicts above. To proceed with approval, you must record an authorized override reason (e.g., special compensatory session, lab swap authorized).
                      </p>
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Mandatory override authorization reason..."
                        className="w-full p-2.5 rounded-xl bg-white border border-[#FBE69B] text-[#1C1917] font-medium focus:outline-hidden"
                        required
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#EEF7EF] border border-[#C8E8CD] text-[#1E4627] text-xs">
                  <div className="font-bold flex items-center gap-1.5 mb-0.5">
                    <CheckCircle2 className="w-4 h-4 text-[#2D733B]" />
                    <span>Slot Verified & Free of Schedule Clashes</span>
                  </div>
                  <p className="text-[11px] text-[#2D451B]">
                    No timetable lectures, holidays, exams, or overlapping extra classes are scheduled for {reviewingRequest.batch_name} on {reviewingRequest.date} ({reviewingRequest.start_time} - {reviewingRequest.end_time}).
                  </p>
                </div>
              )}
            </div>

            {/* Room Confirmation */}
            <div>
              <label className="block text-[11px] font-bold text-[#78716C] uppercase mb-1">
                Official Assigned Room / Hall
              </label>
              <input
                type="text"
                value={approvedRoom}
                onChange={(e) => setApprovedRoom(e.target.value)}
                placeholder="Confirm room allocation..."
                className="w-full p-2.5 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden"
              />
            </div>

            {/* Error in modal */}
            {actionError && (
              <div className="p-3 rounded-xl bg-[#FDF2F4] border border-[#F8CAD4] text-[#701C2F] font-semibold text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#EFE8DC] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRequestingChangesReq(reviewingRequest);
                    setReviewingRequest(null);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-[#CCE0F9] bg-[#F0F6FD] text-[#193B6D] font-bold text-xs hover:bg-[#CCE0F9]/50 transition-colors"
                >
                  Request Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRejectingRequest(reviewingRequest);
                    setReviewingRequest(null);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-[#F8CAD4] bg-[#FDF2F4] text-[#701C2F] font-bold text-xs hover:bg-[#F8CAD4]/50 transition-colors"
                >
                  Reject Request
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingRequest(null)}
                  className="px-4 py-2 rounded-xl border border-[#EFE8DC] text-[#78716C] font-semibold text-xs hover:bg-[#FAF7F0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    isProcessing ||
                    !activeClashes.canOverride && activeClashes.hasClashes ||
                    activeClashes.hasClashes && !overrideReason.trim()
                  }
                  onClick={handleApproveSubmit}
                  className="px-5 py-2 rounded-xl bg-[#1C1917] text-white font-bold text-xs hover:bg-[#292524] transition-colors shadow-2xs flex items-center gap-2 disabled:opacity-40"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8E8CD]" />
                  <span>{isProcessing ? 'Scheduling...' : 'Approve & Schedule to Calendar'}</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingRequest && (
        <Modal
          isOpen={!!rejectingRequest}
          onClose={() => setRejectingRequest(null)}
          title={`Reject Extra Class: ${rejectingRequest.subject_name}`}
        >
          <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs text-[#1C1917]">
            <div className="p-3 rounded-2xl bg-[#FDF2F4] border border-[#F8CAD4] text-[#701C2F]">
              <div className="font-bold mb-0.5">Mandatory Rejection Reason</div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                Provide a clear academic or operational rationale so the faculty member understands why this slot cannot be scheduled.
              </p>
            </div>

            {actionError && (
              <div className="p-2.5 rounded-xl bg-[#FDF2F4] border border-[#F8CAD4] text-[#701C2F] font-semibold">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#78716C] uppercase mb-1">
                Reason for Rejection <span className="text-[#9E2A4B]">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="e.g. Batch has end-of-semester lab internal examinations on this date; cannot schedule extra sessions."
                className="w-full p-2.5 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden"
                required
              />
            </div>

            <div className="pt-3 border-t border-[#EFE8DC] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="px-4 py-2 rounded-xl border border-[#EFE8DC] text-[#78716C] font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-[#9E2A4B] text-white font-bold text-xs hover:bg-[#801F3B] transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* REQUEST CHANGES MODAL */}
      {requestingChangesReq && (
        <Modal
          isOpen={!!requestingChangesReq}
          onClose={() => setRequestingChangesReq(null)}
          title={`Request Changes: ${requestingChangesReq.subject_name}`}
        >
          <form onSubmit={handleRequestChangesSubmit} className="space-y-4 text-xs text-[#1C1917]">
            <div className="p-3 rounded-2xl bg-[#F0F6FD] border border-[#CADCF8] text-[#1E3A8A]">
              <div className="font-bold mb-0.5">Revision Instructions for Faculty</div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                Describe the required adjustment (e.g. shift to another date/time, adjust duration, change topic scope) so the faculty member can revise and resubmit.
              </p>
            </div>

            {actionError && (
              <div className="p-2.5 rounded-xl bg-[#FDF2F4] border border-[#F8CAD4] text-[#701C2F] font-semibold">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#78716C] uppercase mb-1">
                Requested Modifications <span className="text-[#1E3A8A]">*</span>
              </label>
              <textarea
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Please shift to Friday afternoon after 3 PM because students have campus placement tests on Thursday."
                className="w-full p-2.5 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden"
                required
              />
            </div>

            <div className="pt-3 border-t border-[#EFE8DC] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRequestingChangesReq(null)}
                className="px-4 py-2 rounded-xl border border-[#EFE8DC] text-[#78716C] font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-[#1E3A8A] text-white font-bold text-xs hover:bg-[#152E6B] transition-colors"
              >
                Send Change Request
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* AUDIT HISTORY MODAL */}
      {historyRequest && (
        <Modal
          isOpen={!!historyRequest}
          onClose={() => setHistoryRequest(null)}
          title={`Audit History: ${historyRequest.subject_name}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] space-y-1">
              <div className="font-bold text-[#1C1917]">
                Request ID: <span className="font-mono text-[#78716C]">{historyRequest.id}</span>
              </div>
              <div className="text-[11px] text-[#78716C]">
                Batch: {historyRequest.batch_name} • Faculty: {historyRequest.faculty_name} ({historyRequest.faculty_email})
              </div>
            </div>

            <div className="space-y-2 border-l-2 border-[#EFE8DC] pl-3 ml-2">
              {historyRequest.history.map((entry, idx) => (
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

            <div className="pt-3 border-t border-[#EFE8DC] flex justify-end">
              <button
                onClick={() => setHistoryRequest(null)}
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
