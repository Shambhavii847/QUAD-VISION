import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getBranches,
  getBatches,
  getSubjects,
  getTopics,
  getTimetable,
  getExaminations,
  getHolidays,
  getExtraClassRequests,
  createExtraClassRequest,
  reviseExtraClassRequest,
} from '../../services/storage';
import { detectExtraClassClashes, ClashDetectionResult } from '../../utils/clashDetection';
import { Modal } from '../common/Modal';
import {
  BranchId,
  AcademicTrackId,
  ExtraClassRequest,
  Subject,
} from '../../types';
import {
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Building2,
  FileText,
  Info,
} from 'lucide-react';

interface RequestExtraClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestSubmitted?: (req: ExtraClassRequest) => void;
  editingRequest?: ExtraClassRequest | null;
}

export const RequestExtraClassModal: React.FC<RequestExtraClassModalProps> = ({
  isOpen,
  onClose,
  onRequestSubmitted,
  editingRequest,
}) => {
  const { currentUser } = useAuth();

  const branches = getBranches();
  const allBatches = getBatches();
  const allSubjects = getSubjects();
  const allTopics = getTopics();

  // Faculty branch assignment
  const facultyBranch: BranchId =
    editingRequest?.branch_id ||
    (currentUser?.branch_id || currentUser?.campus_id || 'Ghaziabad') as BranchId;

  // Faculty track assignment
  const facultyTrack: AcademicTrackId =
    editingRequest?.academic_track ||
    (currentUser?.assigned_track as AcademicTrackId) ||
    'Mirai Track';

  const [selectedBranch, setSelectedBranch] = useState<BranchId>(facultyBranch);
  const [selectedTrack, setSelectedTrack] = useState<AcademicTrackId>(facultyTrack);

  // Available batches for this branch and track
  const availableBatches = useMemo(() => {
    return allBatches.filter(
      (b) =>
        (b.branch_id || b.campus_id) === selectedBranch &&
        (!b.academic_track || b.academic_track === selectedTrack)
    );
  }, [allBatches, selectedBranch, selectedTrack]);

  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    editingRequest?.batch_id || (availableBatches[0]?.id || '')
  );

  // Available subjects for this batch and faculty
  const availableSubjects = useMemo(() => {
    return allSubjects.filter((s) => {
      const matchBatch = s.batch_id === selectedBatchId;
      const matchBranch = (s.branch_id || s.campus_id) === selectedBranch;
      const matchTrack = !s.academic_track || s.academic_track === selectedTrack;
      // If faculty, prioritize assigned subjects
      if (currentUser?.role === 'faculty') {
        const isAssigned = s.faculty_id === currentUser.id || currentUser.assigned_subject_ids?.includes(s.id);
        return matchBatch || (matchBranch && isAssigned);
      }
      return matchBatch || (matchBranch && matchTrack);
    });
  }, [allSubjects, selectedBatchId, selectedBranch, selectedTrack, currentUser]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    editingRequest?.subject_id || (availableSubjects[0]?.id || '')
  );

  // Date and Time fields
  const [requestedDate, setRequestedDate] = useState<string>(
    editingRequest?.date || '2026-09-24'
  );
  const [startTime, setStartTime] = useState<string>(editingRequest?.start_time || '15:00');
  const [endTime, setEndTime] = useState<string>(editingRequest?.end_time || '16:30');
  const [room, setRoom] = useState<string>(editingRequest?.room || 'Seminar Hall A');

  // Topics
  const currentSubjectTopics = useMemo(() => {
    return allTopics.filter((t) => t.subject_id === selectedSubjectId);
  }, [allTopics, selectedSubjectId]);

  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(
    editingRequest?.topic_ids || []
  );
  const [customTopicTitle, setCustomTopicTitle] = useState<string>(
    editingRequest?.topic_titles?.[0] || ''
  );

  // Reason and Notes
  const [reason, setReason] = useState<string>(editingRequest?.reason || '');
  const [notes, setNotes] = useState<string>(editingRequest?.notes || '');
  const [revisionNotes, setRevisionNotes] = useState<string>('');

  // Status & Validation
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state on editingRequest change or batch change
  useEffect(() => {
    if (editingRequest) {
      setSelectedBranch(editingRequest.branch_id);
      setSelectedTrack(editingRequest.academic_track);
      setSelectedBatchId(editingRequest.batch_id);
      setSelectedSubjectId(editingRequest.subject_id);
      setRequestedDate(editingRequest.date);
      setStartTime(editingRequest.start_time);
      setEndTime(editingRequest.end_time);
      setRoom(editingRequest.room || 'Seminar Hall A');
      setSelectedTopicIds(editingRequest.topic_ids || []);
      setCustomTopicTitle(editingRequest.topic_titles?.join(', ') || '');
      setReason(editingRequest.reason || '');
      setNotes(editingRequest.notes || '');
    } else {
      if (availableBatches.length > 0 && !availableBatches.some((b) => b.id === selectedBatchId)) {
        setSelectedBatchId(availableBatches[0].id);
      }
    }
  }, [editingRequest, availableBatches]);

  useEffect(() => {
    if (!editingRequest && availableSubjects.length > 0 && !availableSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(availableSubjects[0].id);
    }
  }, [availableSubjects, editingRequest]);

  // Compute live clash warnings for the faculty's awareness
  const liveClashPreview = useMemo<ClashDetectionResult | null>(() => {
    if (!selectedBatchId || !selectedSubjectId || !requestedDate || !startTime || !endTime) {
      return null;
    }
    if (startTime >= endTime) return null;

    const mockRequest: ExtraClassRequest = {
      id: editingRequest?.id || 'preview-temp',
      faculty_id: currentUser?.id || 'temp',
      faculty_name: currentUser?.name || 'Faculty',
      branch_id: selectedBranch,
      academic_track: selectedTrack,
      batch_id: selectedBatchId,
      subject_id: selectedSubjectId,
      date: requestedDate,
      start_time: startTime,
      end_time: endTime,
      duration_hours: 1.5,
      reason,
      status: 'pending',
      created_at: '',
      updated_at: '',
      history: [],
    };

    return detectExtraClassClashes(mockRequest, {
      existingRequests: getExtraClassRequests(),
      timetable: getTimetable(),
      examinations: getExaminations(),
      holidays: getHolidays(),
      subjects: getSubjects(),
      batches: getBatches(),
    });
  }, [
    selectedBranch,
    selectedTrack,
    selectedBatchId,
    selectedSubjectId,
    requestedDate,
    startTime,
    endTime,
    reason,
    editingRequest,
    currentUser,
  ]);

  const handleToggleTopic = (topicId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentUser) {
      setErrorMessage('You must be signed in as a faculty member to request an extra class.');
      return;
    }

    if (currentUser.role !== 'faculty' && currentUser.role !== 'admin') {
      setErrorMessage('Only faculty members or authorized administrators can request extra classes.');
      return;
    }

    if (startTime >= endTime) {
      setErrorMessage('End time must be after start time.');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Please state the academic reason or objective for requesting this extra class.');
      return;
    }

    setIsSubmitting(true);

    const resolvedTopicTitles: string[] = [];
    selectedTopicIds.forEach((id) => {
      const top = currentSubjectTopics.find((t) => t.id === id);
      if (top) resolvedTopicTitles.push(top.title);
    });
    if (customTopicTitle.trim()) {
      resolvedTopicTitles.push(customTopicTitle.trim());
    }

    if (editingRequest) {
      // Revision workflow
      const result = reviseExtraClassRequest(
        editingRequest.id,
        {
          branch_id: selectedBranch,
          academic_track: selectedTrack,
          batch_id: selectedBatchId,
          subject_id: selectedSubjectId,
          date: requestedDate,
          start_time: startTime,
          end_time: endTime,
          room,
          topic_ids: selectedTopicIds,
          topic_titles: resolvedTopicTitles,
          reason,
          notes,
          revision_notes: revisionNotes.trim() || 'Faculty updated class details and resubmitted.',
        },
        currentUser
      );

      setIsSubmitting(false);

      if (!result.success || !result.request) {
        setErrorMessage(result.error || 'Failed to update request.');
        return;
      }

      setSuccessNotice('Request updated and resubmitted to Campus Manager for review!');
      onRequestSubmitted?.(result.request);
      setTimeout(() => {
        setSuccessNotice(null);
        onClose();
      }, 1400);
    } else {
      // New request workflow
      const result = createExtraClassRequest(
        {
          branch_id: selectedBranch,
          academic_track: selectedTrack,
          batch_id: selectedBatchId,
          subject_id: selectedSubjectId,
          date: requestedDate,
          start_time: startTime,
          end_time: endTime,
          room,
          topic_ids: selectedTopicIds,
          topic_titles: resolvedTopicTitles,
          reason,
          notes,
        },
        currentUser
      );

      setIsSubmitting(false);

      if (!result.success || !result.request) {
        setErrorMessage(result.error || 'Failed to submit request.');
        return;
      }

      setSuccessNotice('Extra class request submitted successfully! Pending Campus Manager approval.');
      onRequestSubmitted?.(result.request);
      setTimeout(() => {
        setSuccessNotice(null);
        onClose();
      }, 1400);
    }
  };

  const branchRecord = branches.find((b) => b.id === selectedBranch) || branches[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingRequest ? 'Revise Extra Class Request' : 'Request Extra Class'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs text-[#1C1917]">
        {/* Policy notice */}
        <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#78716C] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[#78716C] leading-relaxed">
            <strong className="text-[#1C1917]">Academic Policy:</strong> Faculty cannot publish events directly to the official calendar. All extra class requests are verified for timetable clashes and must be approved by your Campus Manager before appearing on student calendars.
          </div>
        </div>

        {/* Changes requested banner if editing */}
        {editingRequest?.status === 'changes_requested' && editingRequest.change_request_notes && (
          <div className="p-3.5 rounded-2xl bg-[#F0F6FD] border border-[#CADCF8] text-[#1E3A8A] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#1E3A8A] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-xs mb-0.5">Manager Feedback & Requested Changes:</div>
              <p className="text-[11px] leading-relaxed text-[#193B6D]">{editingRequest.change_request_notes}</p>
            </div>
          </div>
        )}

        {/* Success confirmation */}
        {successNotice && (
          <div className="p-3.5 rounded-2xl bg-[#EEF7EF] border border-[#C8E8CD] text-[#1E4627] font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2D733B] shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-[#FDF2F4] border border-[#F8CAD4] text-[#701C2F] font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#9E2A4B] shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Branch & Track (Pre-filled from faculty assignment) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1.5">
              Assigned Branch
            </label>
            <div className="p-2.5 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[#78716C]" />
                <span className="font-bold text-[#1C1917]">{branchRecord.name}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#EFE8DC] font-semibold text-[#78716C]">
                {branchRecord.university_short_name}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1.5">
              Academic Track
            </label>
            <div className="p-2.5 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#B08800]" />
                <span className="font-bold text-[#1C1917]">{selectedTrack}</span>
              </div>
              <span className="text-[10px] text-[#78716C]">Enforced</span>
            </div>
          </div>
        </div>

        {/* Batch and Subject */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1.5">
              Target Batch <span className="text-[#9E2A4B]">*</span>
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden focus:border-[#1C1917]"
              required
            >
              {availableBatches.length === 0 ? (
                <option value="">No batches available</option>
              ) : (
                availableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1.5">
              Subject <span className="text-[#9E2A4B]">*</span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden focus:border-[#1C1917]"
              required
            >
              {availableSubjects.length === 0 ? (
                <option value="">No subjects available</option>
              ) : (
                availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Date, Start Time, End Time & Room */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1.5">
              Requested Date <span className="text-[#9E2A4B]">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden focus:border-[#1C1917]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1.5">
              Start Time <span className="text-[#9E2A4B]">*</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden focus:border-[#1C1917]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1.5">
              End Time <span className="text-[#9E2A4B]">*</span>
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden focus:border-[#1C1917]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1.5">
              Proposed Room
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. Lab 3, Hall A"
              className="w-full p-2.5 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden focus:border-[#1C1917]"
            />
          </div>
        </div>

        {/* Live Conflict Warning for Faculty */}
        {liveClashPreview?.hasClashes && (
          <div className="p-3.5 rounded-2xl bg-[#FEF9E7] border border-[#FBE69B] text-[#614800] space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-[#8C6D00] shrink-0" />
              <span>Potential Schedule Clash Detected for this Slot</span>
            </div>
            <ul className="text-[11px] list-disc list-inside space-y-1 text-[#4D3A00]">
              {liveClashPreview.conflicts.map((c, idx) => (
                <li key={idx}>
                  <strong>{c.title}:</strong> {c.details}
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-[#614800] italic">
              Note: The Campus Manager will be required to review this conflict or authorize an override before approving.
            </p>
          </div>
        )}

        {/* Topics to be Covered */}
        <div>
          <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1.5">
            Topics to be Covered
          </label>
          {currentSubjectTopics.length > 0 ? (
            <div className="max-h-36 overflow-y-auto p-2.5 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] space-y-1.5 mb-2">
              {currentSubjectTopics.map((top) => (
                <label
                  key={top.id}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTopicIds.includes(top.id)}
                    onChange={() => handleToggleTopic(top.id)}
                    className="rounded border-[#EFE8DC] text-[#1C1917] focus:ring-0"
                  />
                  <span className="text-xs text-[#1C1917] font-medium leading-snug">
                    {top.title}
                  </span>
                  {top.in_exam_scope && (
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-[#EEF7EF] text-[#1E4627] font-semibold shrink-0">
                      Exam Scope
                    </span>
                  )}
                </label>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-[#78716C] mb-2 italic">
              No formal curriculum topics loaded for this subject. Enter topic description below.
            </div>
          )}

          <input
            type="text"
            value={customTopicTitle}
            onChange={(e) => setCustomTopicTitle(e.target.value)}
            placeholder="Add specific topic details or special lecture title..."
            className="w-full p-2.5 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden focus:border-[#1C1917]"
          />
        </div>

        {/* Reason for Extra Class */}
        <div>
          <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1.5">
            Reason for Extra Class <span className="text-[#9E2A4B]">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Extra problem solving before midterm exam, compensation for previous holiday, lab practical demo..."
            className="w-full p-2.5 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden focus:border-[#1C1917]"
            required
          />
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1.5">
            Additional Notes for Campus Manager (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Audio-visual projector required, external speaker attending..."
            className="w-full p-2.5 rounded-xl bg-white border border-[#EFE8DC] font-medium text-[#1C1917] focus:outline-hidden focus:border-[#1C1917]"
          />
        </div>

        {/* Revision note if editing changes requested */}
        {editingRequest && (
          <div>
            <label className="block text-[11px] font-bold text-[#1E3A8A] uppercase tracking-wider mb-1.5">
              Response / Revision Notes for Manager
            </label>
            <input
              type="text"
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Describe what you updated in response to manager feedback..."
              className="w-full p-2.5 rounded-xl bg-white border border-[#CADCF8] font-medium text-[#1C1917] focus:outline-hidden focus:border-[#1C1917]"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#EFE8DC] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#EFE8DC] text-[#78716C] font-semibold hover:bg-[#FAF7F0] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-[#1C1917] text-white font-bold hover:bg-[#292524] transition-colors shadow-2xs flex items-center gap-2 disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FBE69B]" />
            <span>
              {isSubmitting
                ? 'Submitting...'
                : editingRequest
                ? 'Resubmit Request'
                : 'Submit Request for Approval'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
