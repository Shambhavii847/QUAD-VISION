import {
  ExtraClassRequest,
  TimetableEntry,
  Examination,
  Holiday,
  Subject,
  Batch,
} from '../types';

export interface ClashConflict {
  type:
    | 'duplicate_request'
    | 'batch_extra_class_overlap'
    | 'faculty_extra_class_overlap'
    | 'batch_timetable_clash'
    | 'faculty_timetable_clash'
    | 'examination_clash'
    | 'holiday_clash';
  severity: 'error' | 'warning';
  title: string;
  details: string;
  conflictingEntity?: any;
}

export interface ClashDetectionResult {
  hasClashes: boolean;
  canOverride: boolean;
  conflicts: ClashConflict[];
}

/**
 * Checks if two time intervals [startA, endA] and [startB, endB] overlap.
 * Time strings are in "HH:MM" format.
 */
export function doTimesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Returns Monday=1, Tuesday=2, ... Sunday=7 from YYYY-MM-DD
 */
export function getDayOfWeekFromDateString(dateStr: string): number {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

/**
 * Detects all schedule conflicts for an extra class request.
 */
export function detectExtraClassClashes(
  request: ExtraClassRequest,
  options: {
    existingRequests: ExtraClassRequest[];
    timetable: TimetableEntry[];
    examinations: Examination[];
    holidays: Holiday[];
    subjects?: Subject[];
    batches?: Batch[];
  }
): ClashDetectionResult {
  const conflicts: ClashConflict[] = [];
  const reqDayOfWeek = getDayOfWeekFromDateString(request.date);

  // 1. Check duplicate request
  const duplicate = options.existingRequests.find(
    (r) =>
      r.id !== request.id &&
      r.batch_id === request.batch_id &&
      r.subject_id === request.subject_id &&
      r.date === request.date &&
      r.start_time === request.start_time &&
      r.end_time === request.end_time &&
      (r.status === 'pending' || r.status === 'approved')
  );

  if (duplicate) {
    conflicts.push({
      type: 'duplicate_request',
      severity: 'error',
      title: 'Duplicate Extra Class Request',
      details: `A duplicate request (${duplicate.status.toUpperCase()}) already exists for this subject, batch, date (${request.date}), and time (${request.start_time} - ${request.end_time}). Requested by ${duplicate.faculty_name}.`,
      conflictingEntity: duplicate,
    });
  }

  // 2. Check batch overlapping with another approved or pending extra-class request
  const batchOverlaps = options.existingRequests.filter(
    (r) =>
      r.id !== request.id &&
      r.batch_id === request.batch_id &&
      r.date === request.date &&
      (r.status === 'pending' || r.status === 'approved') &&
      doTimesOverlap(r.start_time, r.end_time, request.start_time, request.end_time)
  );

  batchOverlaps.forEach((other) => {
    // Avoid double reporting if duplicate was already flagged
    if (duplicate && duplicate.id === other.id) return;

    conflicts.push({
      type: 'batch_extra_class_overlap',
      severity: other.status === 'approved' ? 'error' : 'warning',
      title: `Batch Time Conflict (${other.status === 'approved' ? 'Approved' : 'Pending'} Extra Class)`,
      details: `This batch already has an ${other.status} extra class "${other.subject_name || other.subject_code || 'Session'}" on ${other.date} from ${other.start_time} to ${other.end_time} (Faculty: ${other.faculty_name}).`,
      conflictingEntity: other,
    });
  });

  // 3. Check faculty overlapping with another approved/pending extra-class request
  const facultyOverlaps = options.existingRequests.filter(
    (r) =>
      r.id !== request.id &&
      r.faculty_id === request.faculty_id &&
      r.date === request.date &&
      (r.status === 'pending' || r.status === 'approved') &&
      doTimesOverlap(r.start_time, r.end_time, request.start_time, request.end_time)
  );

  facultyOverlaps.forEach((other) => {
    if (batchOverlaps.some((b) => b.id === other.id)) return;
    conflicts.push({
      type: 'faculty_extra_class_overlap',
      severity: other.status === 'approved' ? 'error' : 'warning',
      title: `Faculty Schedule Conflict (${other.status} Extra Class)`,
      details: `Instructor ${request.faculty_name} is already booked for another extra class "${other.subject_name || other.subject_code}" on ${other.date} from ${other.start_time} to ${other.end_time}.`,
      conflictingEntity: other,
    });
  });

  // 4. Check existing regular timetable classes for the batch
  const batchTimetableClashes = options.timetable.filter(
    (t) =>
      (t.batch_id === request.batch_id ||
        ((t.branch_id || t.campus_id) === request.branch_id &&
          t.academic_track === request.academic_track &&
          t.batch_id === request.batch_id)) &&
      t.day_of_week === reqDayOfWeek &&
      doTimesOverlap(t.start_time, t.end_time, request.start_time, request.end_time)
  );

  batchTimetableClashes.forEach((slot) => {
    const subj = options.subjects?.find((s) => s.id === slot.subject_id);
    conflicts.push({
      type: 'batch_timetable_clash',
      severity: 'error',
      title: 'Timetable Clash with Scheduled Batch Class',
      details: `Batch has a regularly scheduled timetable lecture "${subj?.name || slot.subject_id}" on day ${reqDayOfWeek} from ${slot.start_time} to ${slot.end_time} in room ${slot.room}.`,
      conflictingEntity: slot,
    });
  });

  // 5. Check faculty timetable conflicts (faculty scheduled elsewhere)
  const facultyTimetableClashes = options.timetable.filter(
    (t) =>
      t.faculty_id === request.faculty_id &&
      t.day_of_week === reqDayOfWeek &&
      doTimesOverlap(t.start_time, t.end_time, request.start_time, request.end_time)
  );

  facultyTimetableClashes.forEach((slot) => {
    if (batchTimetableClashes.some((b) => b.id === slot.id)) return;
    const subj = options.subjects?.find((s) => s.id === slot.subject_id);
    conflicts.push({
      type: 'faculty_timetable_clash',
      severity: 'error',
      title: 'Instructor Timetable Conflict',
      details: `Instructor ${request.faculty_name} is already teaching "${subj?.name || slot.subject_id}" on day ${reqDayOfWeek} from ${slot.start_time} to ${slot.end_time} in room ${slot.room}.`,
      conflictingEntity: slot,
    });
  });

  // 6. Check examination conflicts
  const examClashes = options.examinations.filter(
    (e) =>
      e.exam_date === request.date &&
      (e.batch_id === request.batch_id ||
        (e.branch_id === request.branch_id && e.academic_track === request.academic_track))
  );

  examClashes.forEach((exam) => {
    conflicts.push({
      type: 'examination_clash',
      severity: 'error',
      title: 'Conflict with Official Examination',
      details: `An official examination "${exam.name}" is scheduled on ${request.date} for this batch. Teaching classes cannot be held during official examination days.`,
      conflictingEntity: exam,
    });
  });

  // 7. Check holiday and non-teaching date conflicts
  const holidayClashes = options.holidays.filter(
    (h) =>
      h.date === request.date &&
      (!h.branch_id || (h.branch_id || h.campus_id) === request.branch_id) &&
      h.is_non_teaching
  );

  holidayClashes.forEach((hol) => {
    conflicts.push({
      type: 'holiday_clash',
      severity: 'error',
      title: 'Conflict with Non-Teaching Holiday',
      details: `${request.date} is declared as a non-teaching holiday: "${hol.name}" for ${request.branch_id} campus.`,
      conflictingEntity: hol,
    });
  });

  return {
    hasClashes: conflicts.length > 0,
    canOverride: conflicts.length > 0 && !conflicts.some((c) => c.type === 'duplicate_request'),
    conflicts,
  };
}
