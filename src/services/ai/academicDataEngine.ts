import {
  UserProfile,
  Subject,
  Topic,
  Semester,
  Holiday,
  TimetableEntry,
  Examination,
  MissedSessionRecord,
  ExtraClassRequest,
  ApprovedExtraClass,
  StudentOpportunity,
  DailyLearningTest,
  SubjectProgressCalculation,
  ExamReadinessCalculation,
  BranchId,
} from '../../types';
import {
  getBranches,
  getBatchesForUser,
  getSubjectsForUser,
  getTopics,
  getTimetableByBranch,
  getExaminationsForUser,
  getSessionLogsForUser,
  getMissedSessions,
  getExtraClassRequestsForUser,
  getApprovedExtraClassesForUser,
  getHolidaysByBranch,
  getSemestersByBranch,
  getOpportunitiesForUser,
  getDailyLearningTestsForUser,
} from '../storage';
import {
  calculateSubjectProgress,
  calculateExamReadiness,
  formatDateYMD,
  calculateHoursInScope,
  calculateCoveredHours,
  calculateCoveragePercentage,
  calculateRemainingHours,
} from '../../utils/calculations';

export interface AcademicQueryResult {
  content: string;
  intent: string;
  citations: string[];
  suggestedActions?: string[];
  isRecommendation?: boolean;
}

/**
 * Extracts and strictly scopes the authenticated user's academic context.
 * Never allows client-supplied overrides of campus, batch, or permissions.
 */
export function getAuthorizedUserContextSummary(user: UserProfile): string {
  const campus = user.branch_id || user.campus_id || 'Institutional';
  const role = user.role;
  const batches = getBatchesForUser(user);
  const subjects = getSubjectsForUser(user);
  const exams = getExaminationsForUser(user);
  const opportunities = getOpportunitiesForUser(user);
  const learningTests = getDailyLearningTestsForUser(user);
  const missedSessions = getMissedSessions().filter((m) => {
    if (role === 'admin') return true;
    if (role === 'campus_manager') return (m.branch_id || m.campus_id) === campus;
    if (role === 'faculty') return m.faculty_id === user.id;
    return false;
  });

  const batchNames = batches.map((b) => `${b.name} (Sem ${b.current_semester})`).join(', ') || 'None assigned';
  const subjectList = subjects.map((s) => `${s.name} (${s.code})`).join(', ') || 'None assigned';

  return `
[AUTHENTICATED USER CONTEXT]
- Name: ${user.name}
- Role: ${role.toUpperCase()}
- Assigned Campus/Branch: ${campus}
- Assigned Track: ${user.assigned_track || 'All Tracks'}
- Accessible Batches: ${batchNames}
- Accessible Subjects: ${subjectList}
- Active Examinations in Scope: ${exams.length}
- Eligible Opportunities: ${opportunities.length}
- Student Learning Tests on Record: ${learningTests.length}
- Missed / Overdue Session Logs: ${missedSessions.length}
`.trim();
}

/**
 * Identify subjects falling behind for the user's scope.
 * Uses CourseTracker's buffer ratio thresholds (< 1.15 is TIGHT, < 1.00 is DANGER).
 */
export function getFallingBehindSubjects(user: UserProfile): {
  critical: SubjectProgressCalculation[];
  tight: SubjectProgressCalculation[];
  onTrack: SubjectProgressCalculation[];
} {
  const subjects = getSubjectsForUser(user);
  const topics = getTopics();
  const campus = (user.branch_id || user.campus_id || 'Ghaziabad') as BranchId;
  const semesters = getSemestersByBranch(campus);
  const holidays = getHolidaysByBranch(campus);
  const timetable = getTimetableByBranch(campus);

  const todayStr = formatDateYMD(new Date());

  const critical: SubjectProgressCalculation[] = [];
  const tight: SubjectProgressCalculation[] = [];
  const onTrack: SubjectProgressCalculation[] = [];

  for (const subject of subjects) {
    const sem = semesters.find((s) => s.batch_id === subject.batch_id) || semesters[0];
    if (!sem) continue;

    const progress = calculateSubjectProgress(
      subject,
      topics,
      todayStr,
      sem.end_date,
      sem,
      holidays,
      timetable
    );

    if (progress.status === 'DANGER') {
      critical.push(progress);
    } else if (progress.status === 'TIGHT') {
      tight.push(progress);
    } else {
      onTrack.push(progress);
    }
  }

  return { critical, tight, onTrack };
}

/**
 * Returns structured pending session logs for faculty or campus managers.
 */
export function getPendingSessionLogs(user: UserProfile): MissedSessionRecord[] {
  const campus = user.branch_id || user.campus_id;
  const missed = getMissedSessions();

  if (user.role === 'admin') {
    return missed.filter((m) => m.status === 'unlogged' || m.status === 'escalated');
  }

  if (user.role === 'campus_manager') {
    return missed.filter(
      (m) =>
        (!campus || (m.branch_id || m.campus_id) === campus) &&
        (m.status === 'unlogged' || m.status === 'escalated')
    );
  }

  if (user.role === 'faculty') {
    return missed.filter(
      (m) => m.faculty_id === user.id && (m.status === 'unlogged' || m.status === 'escalated')
    );
  }

  // Students do not have session log management duties
  return [];
}

/**
 * Generates a compliant recovery plan for a specific subject based on CourseTracker's 4-step formula:
 * 1. Identify syllabus shortfall
 * 2. Check remaining scheduled teaching capacity & calendar constraints
 * 3. Propose concrete next steps and assumptions
 * 4. Clearly label as a proposal (not an approved change)
 */
export function generateRecoveryPlan(
  subjectIdentifier: string,
  user: UserProfile
): {
  success: boolean;
  message: string;
  details?: {
    subjectName: string;
    shortfallHours: number;
    availableHours: number;
    recommendedExtraSessions: number;
  };
} {
  const subjects = getSubjectsForUser(user);
  const cleanId = subjectIdentifier.trim().toLowerCase();

  const subject = subjects.find(
    (s) =>
      s.id.toLowerCase() === cleanId ||
      s.code.toLowerCase() === cleanId ||
      s.name.toLowerCase().includes(cleanId)
  );

  if (!subject) {
    return {
      success: false,
      message: `No authorized subject found matching "${subjectIdentifier}". You can only request recovery plans for subjects assigned to your campus and role.`,
    };
  }

  const topics = getTopics().filter((t) => t.subject_id === subject.id);
  const campus = (subject.branch_id || user.branch_id || user.campus_id || 'Ghaziabad') as BranchId;
  const semesters = getSemestersByBranch(campus);
  const holidays = getHolidaysByBranch(campus);
  const timetable = getTimetableByBranch(campus);
  const sem = semesters.find((s) => s.batch_id === subject.batch_id) || semesters[0];

  if (!sem) {
    return {
      success: false,
      message: `Academic semester calendar configuration is missing for ${subject.name}.`,
    };
  }

  const todayStr = formatDateYMD(new Date());
  const progress = calculateSubjectProgress(
    subject,
    topics,
    todayStr,
    sem.end_date,
    sem,
    holidays,
    timetable
  );

  const shortfallHours = Math.max(0, Math.round((progress.remaining_hours - progress.available_teaching_hours) * 10) / 10);
  const sessionDuration = 1.5; // Standard 90-minute slot
  const extraSessionsNeeded = shortfallHours > 0 ? Math.ceil(shortfallHours / sessionDuration) : 0;

  const planText = `
### 📋 Proposed Recovery Plan: ${subject.name} (${subject.code})
**Campus:** ${campus} • **Faculty:** ${subject.faculty_name || 'Assigned Instructor'} • **Semester End:** ${sem.end_date}

---

#### 1. Syllabus Shortfall Analysis
- **In-Scope Syllabus:** ${progress.total_in_scope_hours} planned hours
- **Currently Covered:** ${progress.covered_hours} hours (${progress.coverage_percentage}%)
- **Remaining Syllabus Hours:** ${progress.remaining_hours} hours
- **Remaining Scheduled Timetable Capacity:** ${progress.available_teaching_hours} hours
- **Buffer Ratio:** ${progress.buffer_ratio === 999 ? 'Infinity (Completed)' : progress.buffer_ratio.toFixed(2)} (${progress.status})
- **Net Syllabus Shortfall:** **${shortfallHours} hours**

#### 2. Teaching Capacity & Calendar Constraints
- Regular teaching slots between today and semester conclusion provide ${progress.available_teaching_hours} hours.
- Declared holidays and non-teaching days in ${campus}: ${holidays.length} events respected.
- Saturday Rule: Working Saturdays have been factored into the available hours.

#### 3. Proposed Recovery Next Steps & Assumptions
${
  extraSessionsNeeded > 0
    ? `- **Recommended Action:** Schedule **${extraSessionsNeeded} extra class session(s)** of ${sessionDuration} hours each to eliminate the ${shortfallHours}-hour gap before finals.
- **Suggested Slot 1:** Working Saturday afternoon (14:00 – 15:30) in Seminar Hall B or Lab.
- **Suggested Slot 2:** Weekday zero-hour or post-lecture slot (16:00 – 17:30).
- **Focus Topics:** Prioritize incomplete and overdue topics (${progress.overdue_topics_count} overdue topics on record).`
    : `- The subject is currently **${progress.status}** with sufficient buffer capacity (${progress.buffer_ratio.toFixed(2)}x).
- Maintain the current pace of delivery without requiring emergency extra classes.`
}

---

> [!IMPORTANT]
> **PROPOSAL ONLY**: This is an academic recovery recommendation calculated by CourseTracker AI. It **does NOT** automatically modify the official timetable or publish calendar events. Faculty members must formally submit an Extra Class Request through the **"Request Extra Class"** portal for Campus Manager review.
`.trim();

  return {
    success: true,
    message: planText,
    details: {
      subjectName: subject.name,
      shortfallHours,
      availableHours: progress.available_teaching_hours,
      recommendedExtraSessions: extraSessionsNeeded,
    },
  };
}

/**
 * Returns student revision recommendations based on their own Daily Learning Tests.
 */
export function getRevisionRecommendations(user: UserProfile): string {
  const tests = getDailyLearningTestsForUser(user);

  if (user.role !== 'student') {
    return 'Daily learning test revision summaries are tailored specifically to students. As faculty or management, you can review aggregate subject performance in the Faculty/Campus Dashboard.';
  }

  if (tests.length === 0) {
    return 'No completed daily learning tests were found for your account. Once your instructors conduct daily micro-quizzes or lesson checks, topics needing revision will be automatically listed here.';
  }

  const weakList: {
    subjectName: string;
    topicTitle: string;
    concept: string;
    reading: string;
    testDate: string;
    score: number;
  }[] = [];

  for (const test of tests) {
    for (const w of test.weak_topics) {
      weakList.push({
        subjectName: test.subject_name,
        topicTitle: w.topic_title,
        concept: w.concept,
        reading: w.recommended_reading,
        testDate: test.date,
        score: test.percentage,
      });
    }
  }

  if (weakList.length === 0) {
    return `🎉 **Great work, ${user.name}!** All your recorded daily learning tests have passing scores without flagged weak topics. Keep up the consistent review!`;
  }

  const items = weakList
    .map(
      (w, i) => `
**${i + 1}. ${w.subjectName} — ${w.topicTitle}** (Test Score: ${w.score}%)
- 🎯 **Key Concept to Master:** ${w.concept}
- 📚 **Recommended Reference:** \`${w.reading}\`
- 📅 *Flagged on ${w.testDate}*
`
    )
    .join('\n');

  return `
### 🧠 Your Personalized Revision Recommendations (${weakList.length} Concepts Identified)

Based on your recent Daily Learning Tests, here are the exact conceptual areas where focused revision will boost your retention:

${items}

---
💡 *Tip: Schedule 20–30 minutes to review these references before your next class session.*
`.trim();
}

/**
 * Returns eligible published opportunities for the student.
 */
export function getEligibleOpportunitiesResponse(user: UserProfile): string {
  const opps = getOpportunitiesForUser(user);
  const campus = user.branch_id || user.campus_id || 'Institutional';

  if (opps.length === 0) {
    return `There are currently no active published opportunities eligible for your assigned batch and campus (${campus}). New internships, hackathons, and certifications are published regularly.`;
  }

  const list = opps
    .map(
      (o, i) => `
**${i + 1}. [${(o.type || o.category || 'OPPORTUNITY').toUpperCase()}] ${o.title}**
- 🏢 **Organization:** ${o.organization || o.organizer}
- 💰 **Stipend / Award:** ${o.stipend_or_reward || 'Recognition Certificate'}
- 📍 **Location:** ${o.location || 'Online'}
- ⏳ **Application Deadline:** **${o.deadline || o.application_deadline || 'Rolling'}**
- 📝 **Requirements:** ${(o.requirements || o.eligibility_requirements || []).join(' • ')}
- 🔗 **Application Link:** [Apply Here](${o.apply_url || o.official_url || '#'})
`
    )
    .join('\n');

  return `
### 🚀 Active Published Opportunities for Your Batch (${opps.length} Eligible)
*Filtered strictly to ${campus} campus • ${user.assigned_track || 'Curriculum Track'}*

${list}
`.trim();
}

/**
 * Admin cross-campus comparison report.
 * Strictly blocked for non-admin accounts.
 */
export function getCrossCampusComparison(user: UserProfile): {
  success: boolean;
  message: string;
} {
  if (user.role !== 'admin') {
    return {
      success: false,
      message: '⛔ **Access Denied**: Cross-campus comparative analysis is restricted to Institutional Global Administrators.',
    };
  }

  const branches = getBranches();
  const allSubjects = getSubjectsForUser(user);
  const allMissed = getMissedSessions();
  const allRequests = getExtraClassRequestsForUser(user);

  const report = branches
    .map((b) => {
      const bSubjects = allSubjects.filter((s) => s.branch_id === b.id);
      const bMissed = allMissed.filter((m) => m.branch_id === b.id && m.status === 'unlogged');
      const bPendingRequests = allRequests.filter((r) => r.branch_id === b.id && r.status === 'pending');

      return `
#### 🏛️ ${b.name} (${b.university_short_name})
- **Location:** ${b.city}, ${b.state}
- **Enrolled Students:** ${b.total_students}
- **Active Academic Subjects:** ${bSubjects.length}
- **Unlogged Faculty Sessions:** ${bMissed.length} pending
- **Pending Extra Class Requests:** ${bPendingRequests.length} awaiting review
`;
    })
    .join('\n');

  return {
    success: true,
    message: `
### 🌐 Institutional Cross-Branch Comparative Overview
*Administrator Authorization: Verified (${user.name})*

${report}

---
*Data verified against local institutional vault & active campus timetables.*
`.trim(),
  };
}

/**
 * Primary deterministic Natural Language query handler for CourseTracker.
 * Seamlessly resolves user queries with real data and calculations.
 */
export function processAcademicQuery(
  rawQuery: string,
  user: UserProfile
): AcademicQueryResult {
  const query = rawQuery.trim().toLowerCase();
  const campus = user.branch_id || user.campus_id || 'Ghaziabad';

  // 1. Security & Prompt Injection Guard
  const injectionPatterns = [
    'ignore previous',
    'system prompt',
    'reveal password',
    'show password',
    'drop table',
    'delete from',
    'sql injection',
    'bypass campus',
    'switch to admin',
    'impersonate',
    'dump database',
  ];

  if (injectionPatterns.some((pattern) => query.includes(pattern))) {
    return {
      content: `🛡️ **Security Policy Enforcement**: Your request contains restricted commands or attempts to access administrative system configurations. CourseTracker enforces strict role-based access control and campus isolation. Only data authorized for your account (**${user.name} • ${user.role.toUpperCase()}**) can be accessed.`,
      intent: 'security_violation',
      citations: ['RBAC Security Policy', 'Campus Data Isolation Guard'],
    };
  }

  // 2. Cross-Campus Unauthorized Probing Guard
  const otherCampuses = (['Ghaziabad', 'Bangalore', 'Jaipur'] as BranchId[]).filter(
    (c) => c !== campus
  );

  if (
    user.role !== 'admin' &&
    otherCampuses.some(
      (c) =>
        query.includes(c.toLowerCase()) &&
        !query.includes('what campus') &&
        !query.includes('my campus')
    )
  ) {
    return {
      content: `🔒 **Campus Data Isolation**: You are currently authenticated at the **${campus} Campus**. Academic regulations prohibit viewing or querying data from other campuses (${otherCampuses.join(', ')}). Your assistant is strictly isolated to your assigned campus.`,
      intent: 'campus_boundary_blocked',
      citations: ['Institutional Campus Isolation Protocol'],
    };
  }

  // 3. Falling behind subjects
  if (
    query.includes('falling behind') ||
    query.includes('behind schedule') ||
    query.includes('danger') ||
    query.includes('at risk') ||
    query.includes('lagging')
  ) {
    const { critical, tight, onTrack } = getFallingBehindSubjects(user);

    if (critical.length === 0 && tight.length === 0) {
      return {
        content: `✅ **Great News!** All ${onTrack.length} subjects in your academic scope (${campus} Campus) are currently **ON TRACK** or completed according to syllabus buffer calculations. No subjects are currently in DANGER or TIGHT status.`,
        intent: 'falling_behind_query',
        citations: ['Course Progression Engine', 'Buffer Ratio Calculations'],
        suggestedActions: ['Suggest a recovery plan for this subject', 'How many syllabus hours remain?'],
      };
    }

    const critList = critical
      .map(
        (c) =>
          `- 🔴 **${c.subject_name} (${c.subject_code})**: Buffer Ratio **${c.buffer_ratio.toFixed(2)}x** (< 1.00) • Coverage: ${c.coverage_percentage}% • Shortfall: ${Math.round((c.remaining_hours - c.available_teaching_hours) * 10) / 10} hrs (${c.overdue_topics_count} overdue topics)`
      )
      .join('\n');

    const tightList = tight
      .map(
        (t) =>
          `- 🟡 **${t.subject_name} (${t.subject_code})**: Buffer Ratio **${t.buffer_ratio.toFixed(2)}x** (1.00–1.14) • Coverage: ${t.coverage_percentage}% • ${t.remaining_hours} hrs remaining`
      )
      .join('\n');

    const response = `
### ⚠️ Subjects Requiring Attention (${campus} Campus)

${
  critical.length > 0
    ? `#### 🔴 Critical Attention (Status: DANGER)\n${critList}\n`
    : ''
}
${
  tight.length > 0
    ? `#### 🟡 Tight Buffer (Status: TIGHT)\n${tightList}\n`
    : ''
}
---
💡 *To catch up on any of these subjects, you can ask:*
- *"Suggest a recovery plan for [Subject Name]"*
- *"Which faculty session logs are pending?"*
`.trim();

    return {
      content: response,
      intent: 'falling_behind_query',
      citations: ['Subject Progression Thresholds', 'Timetable Engine'],
      suggestedActions: [
        critical[0] ? `Suggest a recovery plan for ${critical[0].subject_name}` : 'How many syllabus hours remain?',
        'Which faculty session logs are pending?',
      ],
    };
  }

  // 4. Recovery plan proposal
  if (
    query.includes('recovery plan') ||
    query.includes('catch up') ||
    query.includes('recover syllabus')
  ) {
    const subjects = getSubjectsForUser(user);
    // Find subject in query or pick first critical / tight subject
    let targetSubject = subjects.find(
      (s) => query.includes(s.code.toLowerCase()) || query.includes(s.name.toLowerCase())
    );

    if (!targetSubject) {
      const { critical, tight } = getFallingBehindSubjects(user);
      if (critical.length > 0) {
        targetSubject = subjects.find((s) => s.id === critical[0].subject_id);
      } else if (tight.length > 0) {
        targetSubject = subjects.find((s) => s.id === tight[0].subject_id);
      } else if (subjects.length > 0) {
        targetSubject = subjects[0];
      }
    }

    if (!targetSubject) {
      return {
        content: 'Please specify the subject code or name you would like a recovery plan for (e.g., *"Suggest a recovery plan for Data Structures"*).',
        intent: 'recovery_plan_query',
        citations: ['Syllabus Progress Records'],
      };
    }

    const plan = generateRecoveryPlan(targetSubject.id, user);
    return {
      content: plan.message,
      intent: 'recovery_plan_query',
      citations: ['Semester Calendar', 'Timetable Slots', 'Working Saturday Rules'],
      isRecommendation: true,
      suggestedActions: ['Request Extra Class', 'Which faculty session logs are pending?'],
    };
  }

  // 5. Revision recommendations
  if (
    query.includes('revise') ||
    query.includes('revision') ||
    query.includes('weak topics') ||
    query.includes('learning test') ||
    query.includes('test score')
  ) {
    const revText = getRevisionRecommendations(user);
    return {
      content: revText,
      intent: 'revision_query',
      citations: ['Daily Learning Tests', 'Covered Lesson Topics'],
      suggestedActions: ['What opportunities are open for my batch?', 'Upcoming exams'],
    };
  }

  // 6. Opportunities query
  if (
    query.includes('opportunity') ||
    query.includes('opportunities') ||
    query.includes('internship') ||
    query.includes('hackathon') ||
    query.includes('certification') ||
    query.includes('fellowship')
  ) {
    const oppText = getEligibleOpportunitiesResponse(user);
    return {
      content: oppText,
      intent: 'opportunities_query',
      citations: ['Institutional Opportunities Board', 'Batch Eligibility Matrix'],
      suggestedActions: ['What topics should I revise today?', 'How many syllabus hours remain?'],
    };
  }

  // 7. Remaining syllabus hours
  if (
    query.includes('hours remain') ||
    query.includes('remaining hours') ||
    query.includes('syllabus hours') ||
    query.includes('hours left')
  ) {
    const subjects = getSubjectsForUser(user);
    const topics = getTopics();

    const lines = subjects.map((s) => {
      const sTopics = topics.filter((t) => t.subject_id === s.id);
      const inScope = calculateHoursInScope(sTopics);
      const covered = calculateCoveredHours(sTopics);
      const remaining = calculateRemainingHours(inScope, covered);
      const pct = calculateCoveragePercentage(covered, inScope);
      return `- **${s.name} (${s.code})**: **${remaining} hours remaining** (${covered}/${inScope} hrs covered • ${pct}%)`;
    });

    return {
      content: `
### ⏱️ Remaining Syllabus Hours by Course
*Campus: ${campus}*

${lines.join('\n')}

---
*Calculated strictly from non-skipped syllabus topics in the current academic semester.*
`.trim(),
      intent: 'remaining_hours_query',
      citations: ['Lesson Plan Management', 'Covered Session Logs'],
      suggestedActions: ['Which subjects are falling behind?', 'Upcoming exams'],
    };
  }

  // 8. Pending session logs
  if (
    query.includes('session log') ||
    query.includes('unlogged') ||
    query.includes('pending log') ||
    query.includes('missed session')
  ) {
    const pending = getPendingSessionLogs(user);

    if (user.role === 'student') {
      return {
        content: `ℹ️ **Student Access Note**: Session logs and faculty attendance logs are managed exclusively by Faculty members and Campus Managers. You can monitor your covered syllabus topics in the **Student Portal** or **Learning Library**.`,
        intent: 'session_logs_query',
        citations: ['RBAC Permissions Policy'],
      };
    }

    if (pending.length === 0) {
      return {
        content: `✅ **All Clear!** There are no pending or unlogged faculty teaching sessions in your scope at this time. All scheduled timetable classes have been properly logged.`,
        intent: 'session_logs_query',
        citations: ['Faculty Timetable Logs'],
      };
    }

    const items = pending.map(
      (p, i) =>
        `${i + 1}. **${p.scheduled_date} (${p.scheduled_time})** — Subject: \`${p.subject_id}\` (${p.duration_hours} hrs) • Status: \`${p.status.toUpperCase()}\` • **${p.hours_overdue} hrs overdue**`
    );

    return {
      content: `
### ⚠️ Pending Faculty Session Logs (${pending.length} Unlogged)
*Campus: ${campus}*

The following timetable slots have concluded without an official teaching log being submitted:

${items.join('\n')}

---
👉 *Faculty instructors can click "Log Session" on the Faculty Dashboard to record covered topics and homework status.*
`.trim(),
      intent: 'session_logs_query',
      citations: ['Missed Session Tracking Engine'],
      suggestedActions: ['Which subjects are falling behind this semester?', 'Suggest a recovery plan'],
    };
  }

  // 9. Upcoming exams & readiness
  if (
    query.includes('exam') ||
    query.includes('examination') ||
    query.includes('midterm') ||
    query.includes('end semester')
  ) {
    const exams = getExaminationsForUser(user);
    const subjects = getSubjectsForUser(user);
    const topics = getTopics();
    const semesters = getSemestersByBranch(campus as BranchId);
    const holidays = getHolidaysByBranch(campus as BranchId);
    const timetable = getTimetableByBranch(campus as BranchId);
    const todayStr = formatDateYMD(new Date());

    if (exams.length === 0) {
      return {
        content: `No scheduled examinations were found for your assigned batches in ${campus}.`,
        intent: 'exams_query',
        citations: ['Examination Calendar'],
      };
    }

    const examCards = exams.map((e) => {
      const subject = subjects.find((s) => s.id === e.subject_id);
      if (!subject) return `- **${e.name}**: Scheduled on **${e.exam_date}**`;
      const sem = semesters.find((s) => s.batch_id === subject.batch_id) || semesters[0];
      if (!sem) return `- **${e.name}**: Scheduled on **${e.exam_date}**`;

      const readiness = calculateExamReadiness(
        e.id,
        e.name,
        e.exam_date,
        subject,
        topics,
        e.syllabus_scope_topic_ids,
        todayStr,
        sem,
        holidays,
        timetable
      );

      return `
#### 📝 ${e.name} — ${subject.name}
- **Exam Date:** **${e.exam_date}**
- **Readiness Status:** **${readiness.status}** (Buffer Ratio: ${readiness.buffer_ratio.toFixed(2)}x)
- **Scope Progress:** ${readiness.covered_hours} / ${readiness.total_in_scope_hours} hrs in scope (${readiness.coverage_percentage}%)
- **Available Hours Before Exam:** ${readiness.available_teaching_hours} hrs
${
  readiness.urgent_attention_topics.length > 0
    ? `- ⚠️ **Urgent Scope Topics:** ${readiness.urgent_attention_topics.map((t) => t.title).join(', ')}`
    : '- ✅ All exam-scope topics are comfortably on track.'
}
`;
    });

    return {
      content: `
### 🎯 Upcoming Examinations & Readiness Analysis
*Campus: ${campus}*

${examCards.join('\n')}
`.trim(),
      intent: 'exams_query',
      citations: ['Examination Syllabus Scope Matrix', 'Timetable Availability'],
      suggestedActions: ['How many syllabus hours remain?', 'What topics should I revise today?'],
    };
  }

  // 10. Admin cross-campus comparison
  if (
    query.includes('comparison') ||
    query.includes('compare branch') ||
    query.includes('compare campus') ||
    query.includes('all branches') ||
    query.includes('cross campus')
  ) {
    const comp = getCrossCampusComparison(user);
    return {
      content: comp.message,
      intent: 'cross_campus_query',
      citations: ['Institutional Branches Registry', 'Cross-Campus Academic Sync'],
      suggestedActions: ['Which subjects are falling behind?', 'Which faculty session logs are pending?'],
    };
  }

  // 11. General academic greeting / Help
  const userBatches = getBatchesForUser(user);
  const userSubjects = getSubjectsForUser(user);

  return {
    content: `
Hello **${user.name}**! I am **CourseTracker AI**, your role-aware institutional assistant.

### 🏛️ Active Session Context
- **Role:** \`${user.role.toUpperCase()}\`
- **Campus:** **${campus} Branch**
- **Enrolled / Assigned Batches:** ${userBatches.map((b) => b.name).join(', ') || 'Standard Track'}
- **Accessible Subjects:** ${userSubjects.length} courses loaded

### 💡 Suggested Questions for Your Role:
${
  user.role === 'student'
    ? `- *"What topics should I revise today?"*\n- *"What opportunities are open for my batch?"*\n- *"How many syllabus hours remain before exams?"*\n- *"Upcoming exams and syllabus coverage"*`
    : user.role === 'faculty'
    ? `- *"Which subjects are falling behind this semester?"*\n- *"Suggest a recovery plan for my subject"*\n- *"Which faculty session logs are pending?"*\n- *"How many syllabus hours remain?"*`
    : user.role === 'campus_manager'
    ? `- *"Which subjects are falling behind across ${campus}?"*\n- *"Identify upcoming exam readiness risks"*\n- *"Show missing faculty session logs"*\n- *"Suggest a recovery plan for delayed subjects"*`
    : `- *"Compare syllabus progress across all branches"*\n- *"Which subjects are falling behind institutional standards?"*\n- *"Review pending administrative logs and escalation counts"*`
}

*Feel free to type your question below or click one of the suggested prompts.*
`.trim(),
    intent: 'general_help',
    citations: ['CourseTracker Role Registry'],
    suggestedActions:
      user.role === 'student'
        ? ['What topics should I revise today?', 'What opportunities are open for my batch?']
        : ['Which subjects are falling behind this semester?', 'Suggest a recovery plan'],
  };
}
