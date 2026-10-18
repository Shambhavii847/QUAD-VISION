import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getSubjects,
  getBatches,
  getTopics,
  getTimetable,
  saveSessionLog,
  createTopic,
  getBranches,
} from '../../services/storage';
import { Modal } from '../common/Modal';
import { SessionStatus, TopicProgressInput, TimetableEntry, CampusId } from '../../types';
import {
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Clock,
  BookOpen,
  FileText,
  Sparkles,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';

interface SessionLoggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedSlot?: TimetableEntry | null;
}

export const SessionLoggingModal: React.FC<SessionLoggingModalProps> = ({
  isOpen,
  onClose,
  preselectedSlot,
}) => {
  const { currentUser } = useAuth();
  const subjects = getSubjects();
  const batches = getBatches();
  const allTopics = getTopics();
  const timetable = getTimetable();

  const branches = getBranches();

  const [campusId, setCampusId] = useState<CampusId>(
    currentUser?.branch_id || currentUser?.campus_id || 'Ghaziabad'
  );
  const [batchId, setBatchId] = useState(preselectedSlot?.batch_id || batches[0]?.id || '');
  const [subjectId, setSubjectId] = useState(
    preselectedSlot?.subject_id ||
      currentUser?.assigned_subject_ids?.[0] ||
      subjects[0]?.id ||
      ''
  );
  const [scheduledClassId, setScheduledClassId] = useState(preselectedSlot?.id || '');
  const [sessionDate, setSessionDate] = useState('2026-09-18');
  const [durationHours, setDurationHours] = useState(preselectedSlot?.duration_hours || 1.5);
  const [status, setStatus] = useState<SessionStatus>('completed');
  const [classworkStatus, setClassworkStatus] = useState('');
  const [homeworkStatus, setHomeworkStatus] = useState('');
  const [carryForward, setCarryForward] = useState('');
  const [facultyNotes, setFacultyNotes] = useState('');

  // Selected topics covered with individual completion percentages
  const [selectedTopicProgress, setSelectedTopicProgress] = useState<TopicProgressInput[]>([]);
  const [topicsRemainingInput, setTopicsRemainingInput] = useState<string>('');

  // Quick lesson plan entry state
  const [isQuickTopicOpen, setIsQuickTopicOpen] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicHours, setNewTopicHours] = useState(2.0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter topics for the chosen subject
  const subjectTopics = allTopics.filter((t) => t.subject_id === subjectId);

  // Filter timetable slots for the subject
  const availableSlots = timetable.filter((t) => t.subject_id === subjectId);

  const handleToggleTopic = (topicId: string, defaultPct: number = 100) => {
    const existing = selectedTopicProgress.find((p) => p.topic_id === topicId);
    if (existing) {
      setSelectedTopicProgress(selectedTopicProgress.filter((p) => p.topic_id !== topicId));
    } else {
      setSelectedTopicProgress([...selectedTopicProgress, { topic_id: topicId, completion_percentage: defaultPct }]);
    }
  };

  const handleUpdateTopicPercentage = (topicId: string, pct: number) => {
    setSelectedTopicProgress(
      selectedTopicProgress.map((p) =>
        p.topic_id === topicId ? { ...p, completion_percentage: Math.min(100, Math.max(0, pct)) } : p
      )
    );
  };

  const handleQuickAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !currentUser) return;
    const defaultUnitId = subjectTopics[0]?.unit_id || 'unit-cs301-u1';
    const nextSeq = subjectTopics.length + 1;

    const created = createTopic(
      {
        unit_id: defaultUnitId,
        subject_id: subjectId,
        title: newTopicTitle.trim(),
        planned_hours: Number(newTopicHours) || 2.0,
        sequence_order: nextSeq,
        status: 'not_started',
        completion_percentage: 0,
        in_exam_scope: true,
      },
      currentUser
    );

    // Auto-select the newly created topic
    if (created) {
      setSelectedTopicProgress([
        ...selectedTopicProgress,
        { topic_id: created.id, completion_percentage: 100 },
      ]);
    }

    setNewTopicTitle('');
    setIsQuickTopicOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (status !== 'cancelled' && status !== 'skipped' && !classworkStatus.trim()) {
      setErrorMessage('Please describe the classwork content delivered in this session.');
      return;
    }

    if (!currentUser) {
      setErrorMessage('User session missing.');
      return;
    }

    const topicsRemainingArray = topicsRemainingInput
      ? topicsRemainingInput.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const res = saveSessionLog(
      {
        scheduled_class_id: scheduledClassId || undefined,
        campus_id: campusId,
        batch_id: batchId,
        subject_id: subjectId,
        faculty_id: currentUser.id,
        date: sessionDate,
        duration_hours: Number(durationHours),
        status,
        topics_covered: selectedTopicProgress,
        topics_remaining: topicsRemainingArray,
        carry_forward: carryForward || undefined,
        classwork_status: classworkStatus || (status === 'cancelled' ? 'Session Cancelled' : 'Non-teaching slot'),
        homework_status: homeworkStatus || 'Self-study exercises',
        faculty_notes: facultyNotes || undefined,
      },
      currentUser
    );

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to save session log.');
      return;
    }

    setSuccessMessage('Class session logged successfully! Course progression has been recalculated.');
    setTimeout(() => {
      onClose();
      setSuccessMessage(null);
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Class Session Delivery & Syllabus Log"
      description="Record lecture delivery, covered topics, classwork/homework, and carry-forward notes."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-[#FDF2F4] border border-[#F8CAD4] text-[#701C2F] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E8637E]" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-[#EEF7EF] border border-[#C8E8CD] text-[#1E4627] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4ADE80]" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Campus, Batch & Subject Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Campus / Branch
            </label>
            <select
              value={campusId}
              onChange={(e) => setCampusId(e.target.value as CampusId)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-[#FAF7F0] font-medium text-[#1C1917]"
            >
              <optgroup label="Branches">
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.university_short_name})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Legacy Campuses">
                <option value="HI-Tech">HI-Tech (Hyderabad)</option>
                <option value="Ratnam">Ratnam (Bangalore)</option>
                <option value="RGIB">RGIB (Pune)</option>
                <option value="JUJ">JUJ (Noida)</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Batch & Track
            </label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-[#FAF7F0] font-medium text-[#1C1917]"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.academic_track})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Subject
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-[#FAF7F0] font-medium text-[#1C1917]"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}: {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date, Timetable Slot, Duration & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Date
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-medium"
            />
          </div>

          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Scheduled Slot
            </label>
            <select
              value={scheduledClassId}
              onChange={(e) => {
                setScheduledClassId(e.target.value);
                const match = timetable.find((t) => t.id === e.target.value);
                if (match) setDurationHours(match.duration_hours);
              }}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-medium"
            >
              <option value="">-- Ad-hoc / Extra Class --</option>
              {availableSlots.map((s) => (
                <option key={s.id} value={s.id}>
                  Day {s.day_of_week} ({s.start_time}-{s.end_time})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Duration (Hrs)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={durationHours}
              onChange={(e) => setDurationHours(parseFloat(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-medium"
            />
          </div>

          {/* All 5 Session Statuses */}
          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Session Status (5 Types)
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SessionStatus)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-medium text-[#1C1917]"
            >
              <option value="completed">Conducted / Completed</option>
              <option value="partially_completed">Partially Completed</option>
              <option value="cancelled">Cancelled (Reschedules dates)</option>
              <option value="rescheduled">Rescheduled / Substitute</option>
              <option value="skipped">Skipped / Non-teaching</option>
            </select>
          </div>
        </div>

        {/* Topics Covered & Topic Progress Slider */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block font-medium text-[#1C1917]">
              Topics Covered During This Session
            </label>
            <button
              type="button"
              onClick={() => setIsQuickTopicOpen(!isQuickTopicOpen)}
              className="text-[11px] font-medium text-[#1C1917] hover:text-[#701C2F] flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#FAF7F0] border border-[#EFE8DC] cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#1C1917]" />
              <span>+ Quick Add Topic</span>
            </button>
          </div>

          {/* Quick Add Topic inline drawer */}
          {isQuickTopicOpen && (
            <div className="mb-3 p-3 bg-[#FAF7F0] border border-[#EFE8DC] rounded-2xl flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                placeholder="Topic Title (e.g. Graph BFS Traversal)"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                className="flex-1 w-full px-3 py-1.5 bg-white border border-[#EFE8DC] rounded-xl text-xs font-normal"
              />
              <input
                type="number"
                step="0.5"
                min="0.5"
                placeholder="Planned Hours"
                value={newTopicHours}
                onChange={(e) => setNewTopicHours(parseFloat(e.target.value) || 2)}
                className="w-24 px-3 py-1.5 bg-white border border-[#EFE8DC] rounded-xl text-xs font-normal"
              />
              <button
                type="button"
                onClick={handleQuickAddTopic}
                className="w-full sm:w-auto px-4 py-1.5 bg-[#1C1917] text-[#FBE69B] font-medium rounded-xl text-xs shrink-0 cursor-pointer"
              >
                Add Topic
              </button>
            </div>
          )}

          <div className="border border-[#EFE8DC] rounded-2xl p-3 bg-[#FAF7F0]/40 max-h-48 overflow-y-auto space-y-2">
            {subjectTopics.length === 0 ? (
              <p className="text-[#71695F]">No topics found for this subject.</p>
            ) : (
              subjectTopics.map((top) => {
                const selected = selectedTopicProgress.find((p) => p.topic_id === top.id);
                return (
                  <div
                    key={top.id}
                    className={`p-2.5 rounded-xl border transition-all ${
                      selected
                        ? 'bg-white border-[#C8E8CD] shadow-2xs'
                        : 'bg-white/70 border-[#EFE8DC] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => handleToggleTopic(top.id, 100)}
                          className="rounded border-[#EFE8DC] text-[#1C1917] focus:ring-0 w-4 h-4 cursor-pointer accent-[#1C1917]"
                        />
                        <div>
                          <p className="font-medium text-[#1C1917]">
                            {top.sequence_order}. {top.title}
                          </p>
                          <p className="text-[10px] text-[#71695F]">
                            Planned: {top.planned_hours}h • Currently: {top.completion_percentage}% covered
                            {top.planned_date ? ` • Scheduled: ${top.planned_date}` : ''}
                          </p>
                        </div>
                      </label>

                      {selected && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-medium text-[#71695F]">
                            Delivered:
                          </span>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            step="10"
                            value={selected.completion_percentage}
                            onChange={(e) =>
                              handleUpdateTopicPercentage(top.id, parseInt(e.target.value))
                            }
                            className="w-20 accent-[#1C1917]"
                          />
                          <span className="text-xs font-semibold w-10 text-right text-[#1C1917]">
                            {selected.completion_percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Topics Remaining / Left Behind */}
        <div>
          <label className="block font-medium text-[#1C1917] mb-1">
            Topics Remaining / Left Behind (Comma-separated)
          </label>
          <input
            type="text"
            placeholder="e.g. Circular Queue Edge Cases, Priority Queue Comparison"
            value={topicsRemainingInput}
            onChange={(e) => setTopicsRemainingInput(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
          />
        </div>

        {/* Classwork Delivered & Homework Assigned */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Classwork Delivered <span className="text-[#701C2F]">*</span>
            </label>
            <textarea
              rows={2}
              required={status !== 'cancelled' && status !== 'skipped'}
              placeholder="e.g., Covered stack implementation using arrays, pushed/popped examples on whiteboard."
              value={classworkStatus}
              onChange={(e) => setClassworkStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white text-xs font-normal resize-none focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Homework / Assignment Given
            </label>
            <textarea
              rows={2}
              placeholder="e.g., LeetCode 20 (Valid Parentheses) and implement MinStack."
              value={homeworkStatus}
              onChange={(e) => setHomeworkStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white text-xs font-normal resize-none focus:outline-hidden"
            />
          </div>
        </div>

        {/* Carry Forward & Faculty Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Carry-Forward Agenda (For Next Class)
            </label>
            <input
              type="text"
              placeholder="e.g., Doubly linked list insertion edge cases"
              value={carryForward}
              onChange={(e) => setCarryForward(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
            />
          </div>

          <div>
            <label className="block font-medium text-[#1C1917] mb-1">
              Internal Faculty Notes
            </label>
            <input
              type="text"
              placeholder="e.g., Students need more practice on pointer manipulation"
              value={facultyNotes}
              onChange={(e) => setFacultyNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFE8DC] bg-white font-normal"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE8DC]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#EFE8DC] bg-white hover:bg-[#FAF7F0] text-[#1C1917] font-medium text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#2C2825] text-white font-medium text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-[#FBE69B]" />
            <span>Submit Class Log & Recalculate</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
