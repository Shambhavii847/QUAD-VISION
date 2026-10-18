import {
  Topic,
  Semester,
  Holiday,
  TimetableEntry,
  ProgressionStatus,
  SubjectProgressCalculation,
  ExamReadinessCalculation,
  Subject,
} from '../types';

export function formatDateYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a given Saturday date is the 2nd or 4th Saturday of the month.
 * In India/MSOT academic calendars:
 * - 1st, 3rd, 5th Saturdays are working days.
 * - 2nd and 4th Saturdays are holidays.
 */
export function isSecondOrFourthSaturday(date: Date): boolean {
  if (date.getDay() !== 6) return false;
  const dayOfMonth = date.getDate();
  const saturdayIndex = Math.ceil(dayOfMonth / 7);
  return saturdayIndex === 2 || saturdayIndex === 4;
}

/**
 * Determines whether a specific calendar date is a teaching day.
 * Respects:
 * 1. Working weekdays configured in semester
 * 2. Saturday rule: 'none' | 'all' | 'second_fourth'
 * 3. Declared holidays and non-teaching days
 */
export function isTeachingDay(
  date: Date,
  semester: Semester,
  holidays: Holiday[]
): boolean {
  const dateStr = formatDateYMD(date);

  // 1. Check if date is within semester start and end
  const semStart = new Date(semester.start_date + 'T00:00:00');
  const semEnd = new Date(semester.end_date + 'T23:59:59');
  if (date < semStart || date > semEnd) {
    return false;
  }

  // 2. Check declared holidays
  const isHoliday = holidays.some(
    (h) => h.date === dateStr && h.is_non_teaching
  );
  if (isHoliday) {
    return false;
  }

  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

  // Check if day of week is configured in working weekdays
  if (!semester.working_weekdays.includes(dayOfWeek)) {
    return false;
  }

  // 3. Saturday specific rule
  if (dayOfWeek === 6) {
    if (semester.saturday_rule === 'none') {
      return false;
    }
    if (semester.saturday_rule === 'second_fourth') {
      // 2nd and 4th Saturdays are off
      if (isSecondOrFourthSaturday(date)) {
        return false;
      }
    }
    // 'all' means all Saturdays are working
  }

  return true;
}

/**
 * Calculate available teaching hours for a subject between fromDate and toDate.
 * Avoids double-counting: only counts future teaching slots according to timetable.
 */
export function calculateAvailableTeachingHours(
  subjectId: string,
  fromDateStr: string,
  toDateStr: string,
  semester: Semester,
  holidays: Holiday[],
  timetable: TimetableEntry[]
): number {
  const fromDate = new Date(fromDateStr + 'T00:00:00');
  const toDate = new Date(toDateStr + 'T23:59:59');

  if (fromDate > toDate) {
    return 0;
  }

  const subjectTimetable = timetable.filter((t) => t.subject_id === subjectId);
  if (subjectTimetable.length === 0) {
    return 0;
  }

  let totalHours = 0;
  const current = new Date(fromDate);

  while (current <= toDate) {
    if (isTeachingDay(current, semester, holidays)) {
      const dayOfWeek = current.getDay(); // 0..6
      const daySlots = subjectTimetable.filter((t) => t.day_of_week === dayOfWeek);
      for (const slot of daySlots) {
        totalHours += slot.duration_hours;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return Math.round(totalHours * 100) / 100;
}

/**
 * Calculate Hours in Scope:
 * Sum the planned hours of all required, non-skipped topics.
 */
export function calculateHoursInScope(topics: Topic[]): number {
  const inScope = topics.filter((t) => t.status !== 'skipped');
  const sum = inScope.reduce((acc, t) => acc + (t.planned_hours || 0), 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Calculate Covered Hours:
 * - Completed topic: count all its planned hours.
 * - In-progress topic: count planned hours multiplied by its completion percentage.
 * - Skipped topic: excluded (0 hours).
 */
export function calculateCoveredHours(topics: Topic[]): number {
  let covered = 0;
  for (const topic of topics) {
    if (topic.status === 'completed') {
      covered += topic.planned_hours;
    } else if (topic.status === 'in_progress') {
      const pct = Math.min(100, Math.max(0, topic.completion_percentage || 0));
      covered += topic.planned_hours * (pct / 100);
    }
    // 'not_started' and 'skipped' contribute 0 covered hours
  }
  return Math.round(covered * 100) / 100;
}

/**
 * Calculate Coverage Percentage:
 * Covered hours / hours in scope * 100.
 * Safely handles 0 denominator.
 */
export function calculateCoveragePercentage(
  coveredHours: number,
  hoursInScope: number
): number {
  if (hoursInScope <= 0) {
    return coveredHours > 0 ? 100 : 0;
  }
  const pct = (coveredHours / hoursInScope) * 100;
  return Math.min(100, Math.round(pct * 10) / 10);
}

/**
 * Calculate Remaining Hours:
 * Hours in scope - Covered hours.
 */
export function calculateRemainingHours(
  hoursInScope: number,
  coveredHours: number
): number {
  const rem = hoursInScope - coveredHours;
  return Math.max(0, Math.round(rem * 100) / 100);
}

/**
 * Calculate Buffer Ratio:
 * Available teaching hours / remaining hours.
 * When remaining hours <= 0, returns Infinity (safe representation).
 */
export function calculateBufferRatio(
  availableHours: number,
  remainingHours: number
): number {
  if (remainingHours <= 0.001) {
    return Infinity;
  }
  if (availableHours <= 0) {
    return 0;
  }
  const ratio = availableHours / remainingHours;
  return Math.round(ratio * 100) / 100;
}

/**
 * Evaluate Progression Status based on buffer ratio and completion:
 * - COMPLETE: All required in-scope hours are covered (remaining <= 0).
 * - ON TRACK: Buffer ratio >= 1.15.
 * - TIGHT: 1.00 <= Buffer ratio < 1.15.
 * - DANGER: Buffer ratio < 1.00.
 */
export function determineProgressionStatus(
  remainingHours: number,
  bufferRatio: number
): ProgressionStatus {
  if (remainingHours <= 0.001) {
    return 'COMPLETE';
  }
  if (bufferRatio >= 1.15) {
    return 'ON TRACK';
  }
  if (bufferRatio >= 1.00) {
    return 'TIGHT';
  }
  return 'DANGER';
}

/**
 * Check if a topic is overdue:
 * A topic is overdue if its planned date has passed and it is not fully covered.
 */
export function isTopicOverdue(topic: Topic, currentDateStr: string): boolean {
  if (!topic.planned_date) return false;
  if (topic.status === 'completed' || topic.status === 'skipped') return false;
  return topic.planned_date < currentDateStr;
}

/**
 * Calculate Pace Versus Plan:
 * Covered hours - hours that should have been covered by the current date.
 * (Hours due = sum of planned hours of non-skipped topics with planned_date <= current_date).
 */
export function calculatePaceVsPlan(
  topics: Topic[],
  coveredHours: number,
  currentDateStr: string
): number {
  const hoursDue = topics
    .filter((t) => t.status !== 'skipped' && t.planned_date && t.planned_date <= currentDateStr)
    .reduce((sum, t) => sum + t.planned_hours, 0);

  const pace = coveredHours - hoursDue;
  return Math.round(pace * 100) / 100;
}

/**
 * Determine track overall status:
 * The overall academic track status must reflect the worst-performing subject,
 * not the average of subject statuses.
 * Severity: DANGER > TIGHT > ON TRACK > COMPLETE
 */
export function determineTrackOverallStatus(
  statuses: ProgressionStatus[]
): ProgressionStatus {
  if (statuses.length === 0) return 'ON TRACK';
  if (statuses.includes('DANGER')) return 'DANGER';
  if (statuses.includes('TIGHT')) return 'TIGHT';
  if (statuses.includes('ON TRACK')) return 'ON TRACK';
  return 'COMPLETE';
}

/**
 * Full calculation for a Subject.
 */
export function calculateSubjectProgress(
  subject: Subject,
  topics: Topic[],
  currentDateStr: string,
  targetDateStr: string,
  semester: Semester,
  holidays: Holiday[],
  timetable: TimetableEntry[]
): SubjectProgressCalculation {
  const subjectTopics = topics.filter((t) => t.subject_id === subject.id);
  const totalInScope = calculateHoursInScope(subjectTopics);
  const covered = calculateCoveredHours(subjectTopics);
  const remaining = calculateRemainingHours(totalInScope, covered);
  const coveragePct = calculateCoveragePercentage(covered, totalInScope);

  const availableHours = calculateAvailableTeachingHours(
    subject.id,
    currentDateStr,
    targetDateStr,
    semester,
    holidays,
    timetable
  );

  const bufferRatio = calculateBufferRatio(availableHours, remaining);
  const status = determineProgressionStatus(remaining, bufferRatio);
  const pace = calculatePaceVsPlan(subjectTopics, covered, currentDateStr);

  const overdueTopics = subjectTopics.filter((t) => isTopicOverdue(t, currentDateStr));

  // Find planned completion date (last topic's planned date)
  const plannedDates = subjectTopics
    .map((t) => t.planned_date)
    .filter((d): d is string => !!d)
    .sort();
  const plannedCompletionDate = plannedDates.length > 0 ? plannedDates[plannedDates.length - 1] : undefined;

  return {
    subject_id: subject.id,
    subject_name: subject.name,
    subject_code: subject.code,
    faculty_name: subject.faculty_name || 'Faculty Member',
    total_in_scope_hours: totalInScope,
    covered_hours: covered,
    coverage_percentage: coveragePct,
    remaining_hours: remaining,
    available_teaching_hours: availableHours,
    buffer_ratio: bufferRatio === Infinity ? 999 : bufferRatio,
    pace_vs_plan_hours: pace,
    overdue_topics_count: overdueTopics.length,
    status,
    planned_completion_date: plannedCompletionDate,
    is_all_completed: remaining <= 0.001 && totalInScope > 0,
  };
}

/**
 * Full calculation for Exam Readiness:
 * Calculates exam readiness using examination-specific syllabus scope,
 * NOT the entire course if only part of the course is included.
 */
export function calculateExamReadiness(
  examId: string,
  examName: string,
  examDateStr: string,
  subject: Subject,
  topics: Topic[],
  inScopeTopicIds: string[],
  currentDateStr: string,
  semester: Semester,
  holidays: Holiday[],
  timetable: TimetableEntry[]
): ExamReadinessCalculation {
  // Filter topics strictly to the exam syllabus scope
  const examScopeTopics = topics.filter(
    (t) => t.subject_id === subject.id && inScopeTopicIds.includes(t.id)
  );

  const totalInScope = calculateHoursInScope(examScopeTopics);
  const covered = calculateCoveredHours(examScopeTopics);
  const remaining = calculateRemainingHours(totalInScope, covered);
  const coveragePct = calculateCoveragePercentage(covered, totalInScope);

  const availableHours = calculateAvailableTeachingHours(
    subject.id,
    currentDateStr,
    examDateStr,
    semester,
    holidays,
    timetable
  );

  const bufferRatio = calculateBufferRatio(availableHours, remaining);
  const status = determineProgressionStatus(remaining, bufferRatio);

  const urgentAttention = examScopeTopics
    .filter((t) => t.status !== 'completed' && t.status !== 'skipped')
    .map((t) => ({
      topic_id: t.id,
      title: t.title,
      planned_hours: t.planned_hours,
      completion_percentage: t.completion_percentage,
      is_overdue: isTopicOverdue(t, currentDateStr),
    }))
    .sort((a, b) => (b.is_overdue ? 1 : 0) - (a.is_overdue ? 1 : 0));

  return {
    examination_id: examId,
    examination_name: examName,
    subject_id: subject.id,
    subject_name: subject.name,
    exam_date: examDateStr,
    total_in_scope_hours: totalInScope,
    covered_hours: covered,
    remaining_hours: remaining,
    available_teaching_hours: availableHours,
    coverage_percentage: coveragePct,
    buffer_ratio: bufferRatio === Infinity ? 999 : bufferRatio,
    status,
    urgent_attention_topics: urgentAttention,
  };
}

/**
 * Topic Planned Date Calculation Engine:
 * Automatically calculate planned topic dates based on available timetable slots
 * and topic hours, skipping holidays, non-working Saturdays, and non-teaching days.
 */
export function recalculateTopicPlannedDates(
  subjectId: string,
  topics: Topic[],
  semester: Semester,
  holidays: Holiday[],
  timetable: TimetableEntry[]
): Topic[] {
  // Sort topics by sequence order
  const subjectTopics = topics
    .filter((t) => t.subject_id === subjectId)
    .sort((a, b) => a.sequence_order - b.sequence_order);

  const otherTopics = topics.filter((t) => t.subject_id !== subjectId);

  const subjectTimetable = timetable.filter((t) => t.subject_id === subjectId);
  if (subjectTimetable.length === 0) {
    return topics;
  }

  // Iterate days starting from semester start_date
  let currentDate = new Date(semester.start_date + 'T00:00:00');
  const semEnd = new Date(semester.end_date + 'T23:59:59');

  let currentTopicIdx = 0;
  let currentTopicHoursNeeded =
    subjectTopics.length > 0 ? subjectTopics[0].planned_hours : 0;

  const updatedTopics: Topic[] = [...subjectTopics];

  while (currentDate <= semEnd && currentTopicIdx < updatedTopics.length) {
    if (isTeachingDay(currentDate, semester, holidays)) {
      const dayOfWeek = currentDate.getDay();
      const slots = subjectTimetable.filter((t) => t.day_of_week === dayOfWeek);

      for (const slot of slots) {
        let slotCapacity = slot.duration_hours;

        while (slotCapacity > 0 && currentTopicIdx < updatedTopics.length) {
          const topic = updatedTopics[currentTopicIdx];

          // If topic is skipped, it takes 0 hours and can be stamped with current date
          if (topic.status === 'skipped') {
            updatedTopics[currentTopicIdx] = {
              ...topic,
              planned_date: formatDateYMD(currentDate),
            };
            currentTopicIdx++;
            if (currentTopicIdx < updatedTopics.length) {
              currentTopicHoursNeeded = updatedTopics[currentTopicIdx].planned_hours;
            }
            continue;
          }

          if (slotCapacity >= currentTopicHoursNeeded) {
            slotCapacity -= currentTopicHoursNeeded;
            updatedTopics[currentTopicIdx] = {
              ...topic,
              planned_date: formatDateYMD(currentDate),
            };
            currentTopicIdx++;
            if (currentTopicIdx < updatedTopics.length) {
              currentTopicHoursNeeded = updatedTopics[currentTopicIdx].planned_hours;
            }
          } else {
            currentTopicHoursNeeded -= slotCapacity;
            slotCapacity = 0;
            // The topic extends into this date and will finish on a future date
            updatedTopics[currentTopicIdx] = {
              ...topic,
              planned_date: formatDateYMD(currentDate),
            };
          }
        }
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return [...otherTopics, ...updatedTopics];
}
