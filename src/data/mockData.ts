import {
  UserProfile,
  Branch,
  Batch,
  Semester,
  Holiday,
  Subject,
  Unit,
  Topic,
  TimetableEntry,
  SessionLog,
  Examination,
  MissedSessionRecord,
  AuditTrailEntry,
} from '../types';

// ==========================================
// 1. INITIAL BRANCHES & UNIVERSITY AFFILIATIONS
// ==========================================
export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'Ghaziabad',
    name: 'Ghaziabad Branch',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    university_affiliation: 'Dr. A.P.J. Abdul Kalam Technical University (AKTU)',
    university_short_name: 'AKTU',
    address: 'Plot 12, Knowledge Park, NH-24 Bypass, Ghaziabad, UP',
    total_students: 540,
  },
  {
    id: 'Bangalore',
    name: 'Bangalore Branch',
    city: 'Bangalore',
    state: 'Karnataka',
    university_affiliation: 'Visvesvaraya Technological University (VTU)',
    university_short_name: 'VTU',
    address: 'Survey 48, Electronics City Phase 1, Bangalore, Karnataka',
    total_students: 620,
  },
  {
    id: 'Jaipur',
    name: 'Jaipur Branch',
    city: 'Jaipur',
    state: 'Rajasthan',
    university_affiliation: 'Jagannath University',
    university_short_name: 'Jagannath University',
    address: 'NH-12, Chaksu Educational Campus, Jaipur, Rajasthan',
    total_students: 410,
  },
];

// ==========================================
// 2. INITIAL USERS & PERSONAS WITH RBAC
// ==========================================
export const INITIAL_USERS: UserProfile[] = [
  // Global Administrator
  {
    id: 'user-admin',
    name: 'Dr. Suresh Chandra',
    email: 'admin@msot.edu',
    role: 'admin',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
  },

  // Ghaziabad Personas
  {
    id: 'user-mgr-gzb',
    name: 'Vikramaditya Roy',
    email: 'manager.gzb@msot.edu',
    role: 'campus_manager',
    branch_id: 'Ghaziabad',
    campus_id: 'Ghaziabad',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
  },
  {
    id: 'user-fac-radhika',
    name: 'Dr. Radhika Sharma',
    email: 'radhika.gzb@msot.edu',
    role: 'faculty',
    branch_id: 'Ghaziabad',
    campus_id: 'Ghaziabad',
    assigned_track: 'Mirai Track',
    assigned_subject_ids: ['subj-gzb-cs301'],
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces',
  },
  {
    id: 'user-fac-arvind',
    name: 'Prof. Arvind Menon',
    email: 'arvind.gzb@msot.edu',
    role: 'faculty',
    branch_id: 'Ghaziabad',
    campus_id: 'Ghaziabad',
    assigned_track: 'Mirai Track',
    assigned_subject_ids: ['subj-gzb-cs302'],
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
  },
  {
    id: 'user-fac-rajesh',
    name: 'Dr. Rajesh Kumar (AKTU Chair)',
    email: 'rajesh.aktu@msot.edu',
    role: 'faculty',
    branch_id: 'Ghaziabad',
    campus_id: 'Ghaziabad',
    assigned_track: 'University Track',
    assigned_subject_ids: ['subj-gzb-kcs301'],
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces',
  },
  {
    id: 'user-student-aman',
    name: 'Aman Gupta (Ghaziabad Student)',
    email: 'aman.gzb@msot.edu',
    role: 'student',
    branch_id: 'Ghaziabad',
    campus_id: 'Ghaziabad',
    assigned_batch_ids: ['batch-gzb-mirai'],
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=faces',
  },

  // Bangalore Personas
  {
    id: 'user-mgr-blr',
    name: 'Pooja Hegde',
    email: 'manager.blr@msot.edu',
    role: 'campus_manager',
    branch_id: 'Bangalore',
    campus_id: 'Bangalore',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces',
  },
  {
    id: 'user-fac-anand',
    name: 'Dr. Anand Murthy',
    email: 'anand.blr@msot.edu',
    role: 'faculty',
    branch_id: 'Bangalore',
    campus_id: 'Bangalore',
    assigned_track: 'Mirai Track',
    assigned_subject_ids: ['subj-blr-cs301'],
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=faces',
  },
  {
    id: 'user-fac-suresh',
    name: 'Dr. Suresh Babu (VTU Board)',
    email: 'suresh.vtu@msot.edu',
    role: 'faculty',
    branch_id: 'Bangalore',
    campus_id: 'Bangalore',
    assigned_track: 'University Track',
    assigned_subject_ids: ['subj-blr-bcs301'],
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=faces',
  },
  {
    id: 'user-student-deepa',
    name: 'Deepa Swaminathan (Bangalore Student)',
    email: 'deepa.blr@msot.edu',
    role: 'student',
    branch_id: 'Bangalore',
    campus_id: 'Bangalore',
    assigned_batch_ids: ['batch-blr-vtu'],
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
  },

  // Jaipur Personas
  {
    id: 'user-mgr-jpr',
    name: 'Ramesh Shekhawat',
    email: 'manager.jpr@msot.edu',
    role: 'campus_manager',
    branch_id: 'Jaipur',
    campus_id: 'Jaipur',
    avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop&crop=faces',
  },
  {
    id: 'user-fac-vikram',
    name: 'Prof. Vikram Rathore',
    email: 'vikram.jpr@msot.edu',
    role: 'faculty',
    branch_id: 'Jaipur',
    campus_id: 'Jaipur',
    assigned_track: 'Mirai Track',
    assigned_subject_ids: ['subj-jpr-cs301'],
    avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=faces',
  },
  {
    id: 'user-fac-mahendra',
    name: 'Dr. Mahendra Sharma (Jagannath Univ Dean)',
    email: 'mahendra.jnu@msot.edu',
    role: 'faculty',
    branch_id: 'Jaipur',
    campus_id: 'Jaipur',
    assigned_track: 'University Track',
    assigned_subject_ids: ['subj-jpr-jnu301'],
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
  },
  {
    id: 'user-student-mohit',
    name: 'Mohit Joshi (Jaipur Student)',
    email: 'mohit.jpr@msot.edu',
    role: 'student',
    branch_id: 'Jaipur',
    campus_id: 'Jaipur',
    assigned_batch_ids: ['batch-jpr-mirai'],
    avatar_url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=100&h=100&fit=crop&crop=faces',
  },
];

// ==========================================
// 3. INITIAL BATCHES BY BRANCH & TRACK
// ==========================================
export const INITIAL_BATCHES: Batch[] = [
  // Ghaziabad
  {
    id: 'batch-gzb-mirai',
    name: 'B.Tech CSE 2024-28 (Mirai Track GZB)',
    branch_id: 'Ghaziabad',
    campus_id: 'Ghaziabad',
    academic_track: 'Mirai Track',
    current_semester: 3,
    start_year: 2024,
    end_year: 2028,
  },
  {
    id: 'batch-gzb-aktu',
    name: 'B.Tech CSE 2024-28 (AKTU Affiliated)',
    branch_id: 'Ghaziabad',
    campus_id: 'Ghaziabad',
    academic_track: 'University Track',
    university_name: 'Dr. A.P.J. Abdul Kalam Technical University (AKTU)',
    current_semester: 3,
    start_year: 2024,
    end_year: 2028,
  },

  // Bangalore
  {
    id: 'batch-blr-mirai',
    name: 'B.Tech CSE 2024-28 (Mirai Track BLR)',
    branch_id: 'Bangalore',
    campus_id: 'Bangalore',
    academic_track: 'Mirai Track',
    current_semester: 3,
    start_year: 2024,
    end_year: 2028,
  },
  {
    id: 'batch-blr-vtu',
    name: 'B.Tech CSE 2024-28 (VTU Affiliated)',
    branch_id: 'Bangalore',
    campus_id: 'Bangalore',
    academic_track: 'University Track',
    university_name: 'Visvesvaraya Technological University (VTU)',
    current_semester: 3,
    start_year: 2024,
    end_year: 2028,
  },

  // Jaipur
  {
    id: 'batch-jpr-mirai',
    name: 'B.Tech CSE 2024-28 (Mirai Track JPR)',
    branch_id: 'Jaipur',
    campus_id: 'Jaipur',
    academic_track: 'Mirai Track',
    current_semester: 3,
    start_year: 2024,
    end_year: 2028,
  },
  {
    id: 'batch-jpr-jnu',
    name: 'B.Tech CSE 2024-28 (Jagannath Univ Affiliated)',
    branch_id: 'Jaipur',
    campus_id: 'Jaipur',
    academic_track: 'University Track',
    university_name: 'Jagannath University',
    current_semester: 3,
    start_year: 2024,
    end_year: 2028,
  },
];

// ==========================================
// 4. INITIAL SEMESTERS & BRANCH CALENDARS
// ==========================================
export const INITIAL_SEMESTERS: Semester[] = [
  // Ghaziabad
  {
    id: 'sem-gzb-mirai',
    branch_id: 'Ghaziabad',
    academic_track: 'Mirai Track',
    batch_id: 'batch-gzb-mirai',
    semester_number: 3,
    start_date: '2026-08-01',
    end_date: '2026-11-30',
    working_weekdays: [1, 2, 3, 4, 5, 6],
    saturday_rule: 'second_fourth',
    university_calendar_notes: 'Mirai High-Velocity Systems Curriculum',
  },
  {
    id: 'sem-gzb-aktu',
    branch_id: 'Ghaziabad',
    academic_track: 'University Track',
    batch_id: 'batch-gzb-aktu',
    semester_number: 3,
    start_date: '2026-08-10',
    end_date: '2026-12-15',
    working_weekdays: [1, 2, 3, 4, 5, 6],
    saturday_rule: 'second_fourth',
    university_calendar_notes: 'Dr. A.P.J. Abdul Kalam Technical University (AKTU) Odd Semester',
  },

  // Bangalore
  {
    id: 'sem-blr-mirai',
    branch_id: 'Bangalore',
    academic_track: 'Mirai Track',
    batch_id: 'batch-blr-mirai',
    semester_number: 3,
    start_date: '2026-08-01',
    end_date: '2026-11-30',
    working_weekdays: [1, 2, 3, 4, 5, 6],
    saturday_rule: 'second_fourth',
    university_calendar_notes: 'Mirai Bangalore Tech Node',
  },
  {
    id: 'sem-blr-vtu',
    branch_id: 'Bangalore',
    academic_track: 'University Track',
    batch_id: 'batch-blr-vtu',
    semester_number: 3,
    start_date: '2026-08-01',
    end_date: '2026-11-20',
    working_weekdays: [1, 2, 3, 4, 5, 6],
    saturday_rule: 'all', // VTU Saturday teaching rule
    university_calendar_notes: 'Visvesvaraya Technological University (VTU) Belagavi Board',
  },

  // Jaipur
  {
    id: 'sem-jpr-mirai',
    branch_id: 'Jaipur',
    academic_track: 'Mirai Track',
    batch_id: 'batch-jpr-mirai',
    semester_number: 3,
    start_date: '2026-08-01',
    end_date: '2026-11-30',
    working_weekdays: [1, 2, 3, 4, 5, 6],
    saturday_rule: 'second_fourth',
    university_calendar_notes: 'Mirai Jaipur Node',
  },
  {
    id: 'sem-jpr-jnu',
    branch_id: 'Jaipur',
    academic_track: 'University Track',
    batch_id: 'batch-jpr-jnu',
    semester_number: 3,
    start_date: '2026-08-16',
    end_date: '2026-12-05',
    working_weekdays: [1, 2, 3, 4, 5, 6],
    saturday_rule: 'second_fourth',
    university_calendar_notes: 'Jagannath University Academic Council Guidelines',
  },
];

// ==========================================
// 5. BRANCH-ISOLATED HOLIDAYS
// ==========================================
export const INITIAL_HOLIDAYS: Holiday[] = [
  // National Holidays
  { id: 'hol-nat-1', semester_id: 'sem-gzb-mirai', date: '2026-08-15', name: 'Independence Day', is_non_teaching: true },
  { id: 'hol-nat-2', semester_id: 'sem-gzb-mirai', date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', is_non_teaching: true },
  { id: 'hol-nat-3', semester_id: 'sem-gzb-mirai', date: '2026-11-09', name: 'Diwali Day 1', is_non_teaching: true },
  { id: 'hol-nat-4', semester_id: 'sem-gzb-mirai', date: '2026-11-10', name: 'Diwali Day 2', is_non_teaching: true },

  // Ghaziabad Specific (UP Holidays)
  { id: 'hol-gzb-1', branch_id: 'Ghaziabad', semester_id: 'sem-gzb-aktu', date: '2026-10-20', name: 'Dussehra / Vijayadashami', is_non_teaching: true },
  { id: 'hol-gzb-2', branch_id: 'Ghaziabad', semester_id: 'sem-gzb-aktu', date: '2026-10-29', name: 'Karwa Chauth Regional Holiday', is_non_teaching: true },

  // Bangalore Specific (Karnataka State Holidays)
  { id: 'hol-blr-1', branch_id: 'Bangalore', semester_id: 'sem-blr-vtu', date: '2026-11-01', name: 'Kannada Rajyotsava (Karnataka Formation Day)', is_non_teaching: true },
  { id: 'hol-blr-2', branch_id: 'Bangalore', semester_id: 'sem-blr-vtu', date: '2026-11-26', name: 'Kanakadasa Jayanti', is_non_teaching: true },

  // Jaipur Specific (Rajasthan State Holidays)
  { id: 'hol-jpr-1', branch_id: 'Jaipur', semester_id: 'sem-jpr-jnu', date: '2026-10-24', name: 'Rajasthan Cultural Festival Day', is_non_teaching: true },
  { id: 'hol-jpr-2', branch_id: 'Jaipur', semester_id: 'sem-jpr-jnu', date: '2026-11-20', name: 'Pushkar Fair Official Non-Teaching Day', is_non_teaching: true },
];

// ==========================================
// 6. INITIAL SUBJECTS PER BRANCH & UNIVERSITY
// ==========================================
export const INITIAL_SUBJECTS: Subject[] = [
  // Ghaziabad — Mirai Track
  {
    id: 'subj-gzb-cs301',
    branch_id: 'Ghaziabad',
    academic_track: 'Mirai Track',
    batch_id: 'batch-gzb-mirai',
    semester_number: 3,
    code: 'CS301',
    name: 'Data Structures & Algorithms (Mirai)',
    university_name: 'Mirai Specialization',
    total_credits: 4,
    faculty_id: 'user-fac-radhika',
    faculty_name: 'Dr. Radhika Sharma',
    color_code: '#2563EB',
  },
  {
    id: 'subj-gzb-cs302',
    branch_id: 'Ghaziabad',
    academic_track: 'Mirai Track',
    batch_id: 'batch-gzb-mirai',
    semester_number: 3,
    code: 'CS302',
    name: 'Database Management Systems (Mirai)',
    university_name: 'Mirai Specialization',
    total_credits: 4,
    faculty_id: 'user-fac-arvind',
    faculty_name: 'Prof. Arvind Menon',
    color_code: '#059669',
  },

  // Ghaziabad — University Track (AKTU)
  {
    id: 'subj-gzb-kcs301',
    branch_id: 'Ghaziabad',
    academic_track: 'University Track',
    batch_id: 'batch-gzb-aktu',
    semester_number: 3,
    code: 'KCS301',
    name: 'Data Structures (AKTU Board)',
    university_name: 'Dr. A.P.J. Abdul Kalam Technical University (AKTU)',
    total_credits: 4,
    faculty_id: 'user-fac-rajesh',
    faculty_name: 'Dr. Rajesh Kumar (AKTU Chair)',
    color_code: '#7C3AED',
  },

  // Bangalore — Mirai Track
  {
    id: 'subj-blr-cs301',
    branch_id: 'Bangalore',
    academic_track: 'Mirai Track',
    batch_id: 'batch-blr-mirai',
    semester_number: 3,
    code: 'CS301',
    name: 'Data Structures & Algorithms (Mirai BLR)',
    university_name: 'Mirai Specialization',
    total_credits: 4,
    faculty_id: 'user-fac-anand',
    faculty_name: 'Dr. Anand Murthy',
    color_code: '#2563EB',
  },

  // Bangalore — University Track (VTU)
  {
    id: 'subj-blr-bcs301',
    branch_id: 'Bangalore',
    academic_track: 'University Track',
    batch_id: 'batch-blr-vtu',
    semester_number: 3,
    code: 'BCS301',
    name: 'Data Structures & Applications (VTU Scheme)',
    university_name: 'Visvesvaraya Technological University (VTU)',
    total_credits: 4,
    faculty_id: 'user-fac-suresh',
    faculty_name: 'Dr. Suresh Babu (VTU Board)',
    color_code: '#D97706',
  },

  // Jaipur — Mirai Track
  {
    id: 'subj-jpr-cs301',
    branch_id: 'Jaipur',
    academic_track: 'Mirai Track',
    batch_id: 'batch-jpr-mirai',
    semester_number: 3,
    code: 'CS301',
    name: 'Data Structures & Algorithms (Mirai JPR)',
    university_name: 'Mirai Specialization',
    total_credits: 4,
    faculty_id: 'user-fac-vikram',
    faculty_name: 'Prof. Vikram Rathore',
    color_code: '#2563EB',
  },

  // Jaipur — University Track (Jagannath University)
  {
    id: 'subj-jpr-jnu301',
    branch_id: 'Jaipur',
    academic_track: 'University Track',
    batch_id: 'batch-jpr-jnu',
    semester_number: 3,
    code: 'JNU-CS301',
    name: 'Data Structures & Algorithms (Jagannath Univ)',
    university_name: 'Jagannath University',
    total_credits: 4,
    faculty_id: 'user-fac-mahendra',
    faculty_name: 'Dr. Mahendra Sharma (Dean)',
    color_code: '#DC2626',
  },
];

// ==========================================
// 7. INITIAL UNITS & GRANULAR TOPICS
// ==========================================
export const INITIAL_UNITS: Unit[] = [
  // Ghaziabad Mirai CS301 Units
  { id: 'unit-gzb-cs301-u1', subject_id: 'subj-gzb-cs301', unit_number: 1, title: 'Linear Structures: Arrays & Stacks', description: 'Foundations of linear algorithmic structures' },
  { id: 'unit-gzb-cs301-u2', subject_id: 'subj-gzb-cs301', unit_number: 2, title: 'Trees, BST & Heaps', description: 'Hierarchical tree balancing and traversals' },
  { id: 'unit-gzb-cs301-u3', subject_id: 'subj-gzb-cs301', unit_number: 3, title: 'Graph Traversal & Pathfinding', description: 'BFS, DFS, Dijkstra heuristics' },

  // Ghaziabad AKTU KCS301 Units
  { id: 'unit-gzb-kcs301-u1', subject_id: 'subj-gzb-kcs301', unit_number: 1, title: 'AKTU Unit I: Introduction to Data Structures & Arrays', description: 'AKTU official syllabus guidelines for Module 1' },
  { id: 'unit-gzb-kcs301-u2', subject_id: 'subj-gzb-kcs301', unit_number: 2, title: 'AKTU Unit II: Stacks, Queues and Recursion', description: 'Evaluation of expressions and queue variations' },

  // Bangalore VTU BCS301 Units
  { id: 'unit-blr-bcs301-u1', subject_id: 'subj-blr-bcs301', unit_number: 1, title: 'VTU Module 1: Introduction to Data Structures & C Pointers', description: 'VTU 2022 Scheme Module 1 syllabus' },
  { id: 'unit-blr-bcs301-u2', subject_id: 'subj-blr-bcs301', unit_number: 2, title: 'VTU Module 2: Stacks and Queues Applications', description: 'Multiple stacks, infix to postfix conversion' },

  // Jaipur Jagannath JNU-CS301 Units
  { id: 'unit-jpr-jnu301-u1', subject_id: 'subj-jpr-jnu301', unit_number: 1, title: 'Jagannath Unit 1: Data Representation & Algorithmic Complexity', description: 'Asymptotic notation and array primitives' },
  { id: 'unit-jpr-jnu301-u2', subject_id: 'subj-jpr-jnu301', unit_number: 2, title: 'Jagannath Unit 2: Linked Lists, Stacks & Queue Models', description: 'Linear list implementations' },
];

export const INITIAL_TOPICS: Topic[] = [
  // Ghaziabad Mirai CS301 Topics
  { id: 'top-gzb-1', unit_id: 'unit-gzb-cs301-u1', subject_id: 'subj-gzb-cs301', title: 'Dynamic Array Doubling & Memory Layout', planned_hours: 4.0, sequence_order: 1, planned_date: '2026-08-04', status: 'completed', completion_percentage: 100, actual_completion_date: '2026-08-04', in_exam_scope: true },
  { id: 'top-gzb-2', unit_id: 'unit-gzb-cs301-u1', subject_id: 'subj-gzb-cs301', title: 'Stack Invariants & Parentheses Matching', planned_hours: 6.0, sequence_order: 2, planned_date: '2026-08-11', status: 'completed', completion_percentage: 100, actual_completion_date: '2026-08-11', in_exam_scope: true },
  { id: 'top-gzb-3', unit_id: 'unit-gzb-cs301-u2', subject_id: 'subj-gzb-cs301', title: 'Binary Search Tree Balancing & Rotations', planned_hours: 10.0, sequence_order: 3, planned_date: '2026-09-01', status: 'in_progress', completion_percentage: 50, in_exam_scope: true },
  { id: 'top-gzb-4', unit_id: 'unit-gzb-cs301-u3', subject_id: 'subj-gzb-cs301', title: 'Dijkstra Shortest Path & Priority Queues', planned_hours: 10.0, sequence_order: 4, planned_date: '2026-10-06', status: 'not_started', completion_percentage: 0, in_exam_scope: true },

  // Ghaziabad AKTU KCS301 Topics
  { id: 'top-aktu-1', unit_id: 'unit-gzb-kcs301-u1', subject_id: 'subj-gzb-kcs301', title: 'AKTU Syllabus: Asymptotic Notations & Polynomial Arithmetic', planned_hours: 8.0, sequence_order: 1, planned_date: '2026-08-14', status: 'completed', completion_percentage: 100, actual_completion_date: '2026-08-14', in_exam_scope: true },
  { id: 'top-aktu-2', unit_id: 'unit-gzb-kcs301-u2', subject_id: 'subj-gzb-kcs301', title: 'AKTU Syllabus: Tower of Hanoi, Recursion & Double Ended Queues', planned_hours: 12.0, sequence_order: 2, planned_date: '2026-09-15', status: 'in_progress', completion_percentage: 40, in_exam_scope: true },
  { id: 'top-aktu-3', unit_id: 'unit-gzb-kcs301-u2', subject_id: 'subj-gzb-kcs301', title: 'AKTU Syllabus: Circular Lists & Sparse Matrix Representation', planned_hours: 10.0, sequence_order: 3, planned_date: '2026-10-14', status: 'not_started', completion_percentage: 0, in_exam_scope: true },

  // Bangalore VTU BCS301 Topics
  { id: 'top-vtu-1', unit_id: 'unit-blr-bcs301-u1', subject_id: 'subj-blr-bcs301', title: 'VTU 2022 Scheme: Pointers, Dynamic Memory Allocation & Structs', planned_hours: 8.0, sequence_order: 1, planned_date: '2026-08-10', status: 'completed', completion_percentage: 100, actual_completion_date: '2026-08-10', in_exam_scope: true },
  { id: 'top-vtu-2', unit_id: 'unit-blr-bcs301-u2', subject_id: 'subj-blr-bcs301', title: 'VTU 2022 Scheme: Evaluation of Postfix Expression & Circular Queues', planned_hours: 12.0, sequence_order: 2, planned_date: '2026-09-08', status: 'completed', completion_percentage: 100, actual_completion_date: '2026-09-08', in_exam_scope: true },
  { id: 'top-vtu-3', unit_id: 'unit-blr-bcs301-u2', subject_id: 'subj-blr-bcs301', title: 'VTU 2022 Scheme: Singly and Doubly Linked Lists Header Nodes', planned_hours: 10.0, sequence_order: 3, planned_date: '2026-10-10', status: 'in_progress', completion_percentage: 30, in_exam_scope: true },

  // Jaipur Jagannath JNU-CS301 Topics
  { id: 'top-jnu-1', unit_id: 'unit-jpr-jnu301-u1', subject_id: 'subj-jpr-jnu301', title: 'Jagannath Univ Curriculum: Primitive vs Non-Primitive Types', planned_hours: 6.0, sequence_order: 1, planned_date: '2026-08-20', status: 'completed', completion_percentage: 100, actual_completion_date: '2026-08-20', in_exam_scope: true },
  { id: 'top-jnu-2', unit_id: 'unit-jpr-jnu301-u2', subject_id: 'subj-jpr-jnu301', title: 'Jagannath Univ Curriculum: Array Representation of Stacks & Queues', planned_hours: 14.0, sequence_order: 2, planned_date: '2026-09-22', status: 'not_started', completion_percentage: 0, in_exam_scope: true },
];

// ==========================================
// 8. INITIAL TIMETABLE ENTRIES BY BRANCH
// ==========================================
export const INITIAL_TIMETABLE: TimetableEntry[] = [
  // Ghaziabad — Mirai CS301 (Dr. Radhika Sharma)
  { id: 'tt-gzb-1', branch_id: 'Ghaziabad', academic_track: 'Mirai Track', batch_id: 'batch-gzb-mirai', subject_id: 'subj-gzb-cs301', day_of_week: 1, start_time: '09:00', end_time: '10:30', duration_hours: 1.5, room: 'LH-GZB-101', faculty_id: 'user-fac-radhika' },
  { id: 'tt-gzb-2', branch_id: 'Ghaziabad', academic_track: 'Mirai Track', batch_id: 'batch-gzb-mirai', subject_id: 'subj-gzb-cs301', day_of_week: 3, start_time: '09:00', end_time: '10:30', duration_hours: 1.5, room: 'LH-GZB-101', faculty_id: 'user-fac-radhika' },
  { id: 'tt-gzb-3', branch_id: 'Ghaziabad', academic_track: 'Mirai Track', batch_id: 'batch-gzb-mirai', subject_id: 'subj-gzb-cs301', day_of_week: 5, start_time: '09:00', end_time: '10:30', duration_hours: 1.5, room: 'LH-GZB-101', faculty_id: 'user-fac-radhika' },

  // Ghaziabad — AKTU KCS301 (Dr. Rajesh Kumar)
  { id: 'tt-gzb-aktu-1', branch_id: 'Ghaziabad', academic_track: 'University Track', batch_id: 'batch-gzb-aktu', subject_id: 'subj-gzb-kcs301', day_of_week: 2, start_time: '10:00', end_time: '11:30', duration_hours: 1.5, room: 'AKTU-Hall-A', faculty_id: 'user-fac-rajesh' },
  { id: 'tt-gzb-aktu-2', branch_id: 'Ghaziabad', academic_track: 'University Track', batch_id: 'batch-gzb-aktu', subject_id: 'subj-gzb-kcs301', day_of_week: 4, start_time: '10:00', end_time: '11:30', duration_hours: 1.5, room: 'AKTU-Hall-A', faculty_id: 'user-fac-rajesh' },

  // Bangalore — Mirai CS301 (Dr. Anand Murthy)
  { id: 'tt-blr-1', branch_id: 'Bangalore', academic_track: 'Mirai Track', batch_id: 'batch-blr-mirai', subject_id: 'subj-blr-cs301', day_of_week: 2, start_time: '09:00', end_time: '10:30', duration_hours: 1.5, room: 'LH-BLR-A', faculty_id: 'user-fac-anand' },
  { id: 'tt-blr-2', branch_id: 'Bangalore', academic_track: 'Mirai Track', batch_id: 'batch-blr-mirai', subject_id: 'subj-blr-cs301', day_of_week: 4, start_time: '09:00', end_time: '10:30', duration_hours: 1.5, room: 'LH-BLR-A', faculty_id: 'user-fac-anand' },

  // Bangalore — VTU BCS301 (Dr. Suresh Babu)
  { id: 'tt-blr-vtu-1', branch_id: 'Bangalore', academic_track: 'University Track', batch_id: 'batch-blr-vtu', subject_id: 'subj-blr-bcs301', day_of_week: 1, start_time: '11:00', end_time: '12:30', duration_hours: 1.5, room: 'VTU-Seminar-1', faculty_id: 'user-fac-suresh' },
  { id: 'tt-blr-vtu-2', branch_id: 'Bangalore', academic_track: 'University Track', batch_id: 'batch-blr-vtu', subject_id: 'subj-blr-bcs301', day_of_week: 3, start_time: '11:00', end_time: '12:30', duration_hours: 1.5, room: 'VTU-Seminar-1', faculty_id: 'user-fac-suresh' },
  { id: 'tt-blr-vtu-3', branch_id: 'Bangalore', academic_track: 'University Track', batch_id: 'batch-blr-vtu', subject_id: 'subj-blr-bcs301', day_of_week: 6, start_time: '09:30', end_time: '11:00', duration_hours: 1.5, room: 'VTU-Seminar-1', faculty_id: 'user-fac-suresh' },

  // Jaipur — Mirai CS301 (Prof. Vikram Rathore)
  { id: 'tt-jpr-1', branch_id: 'Jaipur', academic_track: 'Mirai Track', batch_id: 'batch-jpr-mirai', subject_id: 'subj-jpr-cs301', day_of_week: 1, start_time: '10:00', end_time: '11:30', duration_hours: 1.5, room: 'LH-JPR-101', faculty_id: 'user-fac-vikram' },
  { id: 'tt-jpr-2', branch_id: 'Jaipur', academic_track: 'Mirai Track', batch_id: 'batch-jpr-mirai', subject_id: 'subj-jpr-cs301', day_of_week: 3, start_time: '10:00', end_time: '11:30', duration_hours: 1.5, room: 'LH-JPR-101', faculty_id: 'user-fac-vikram' },

  // Jaipur — Jagannath JNU-CS301 (Dr. Mahendra Sharma)
  { id: 'tt-jpr-jnu-1', branch_id: 'Jaipur', academic_track: 'University Track', batch_id: 'batch-jpr-jnu', subject_id: 'subj-jpr-jnu301', day_of_week: 2, start_time: '14:00', end_time: '15:30', duration_hours: 1.5, room: 'JNU-Auditorium', faculty_id: 'user-fac-mahendra' },
  { id: 'tt-jpr-jnu-2', branch_id: 'Jaipur', academic_track: 'University Track', batch_id: 'batch-jpr-jnu', subject_id: 'subj-jpr-jnu301', day_of_week: 4, start_time: '14:00', end_time: '15:30', duration_hours: 1.5, room: 'JNU-Auditorium', faculty_id: 'user-fac-mahendra' },
];

// ==========================================
// 9. INITIAL EXAMINATIONS BY BRANCH & UNIVERSITY
// ==========================================
export const INITIAL_EXAMINATIONS: Examination[] = [
  // Ghaziabad — Mirai Midterm
  {
    id: 'exam-gzb-mirai-mid',
    branch_id: 'Ghaziabad',
    academic_track: 'Mirai Track',
    subject_id: 'subj-gzb-cs301',
    batch_id: 'batch-gzb-mirai',
    name: 'Mirai Track Ghaziabad Midterm Assessment',
    exam_date: '2026-10-15',
    university_affiliation: 'Mirai Specialization',
    syllabus_scope_topic_ids: ['top-gzb-1', 'top-gzb-2', 'top-gzb-3'],
  },
  // Ghaziabad — AKTU End Semester Exam
  {
    id: 'exam-gzb-aktu-end',
    branch_id: 'Ghaziabad',
    academic_track: 'University Track',
    subject_id: 'subj-gzb-kcs301',
    batch_id: 'batch-gzb-aktu',
    name: 'AKTU Odd Semester Examination (Dr. A.P.J. AKTU)',
    exam_date: '2026-12-10',
    university_affiliation: 'Dr. A.P.J. Abdul Kalam Technical University (AKTU)',
    syllabus_scope_topic_ids: ['top-aktu-1', 'top-aktu-2', 'top-aktu-3'],
  },

  // Bangalore — Mirai Midterm
  {
    id: 'exam-blr-mirai-mid',
    branch_id: 'Bangalore',
    academic_track: 'Mirai Track',
    subject_id: 'subj-blr-cs301',
    batch_id: 'batch-blr-mirai',
    name: 'Mirai Track Bangalore Midterm Assessment',
    exam_date: '2026-10-18',
    university_affiliation: 'Mirai Specialization',
    syllabus_scope_topic_ids: ['top-vtu-1'],
  },
  // Bangalore — VTU Semester End Exam
  {
    id: 'exam-blr-vtu-end',
    branch_id: 'Bangalore',
    academic_track: 'University Track',
    subject_id: 'subj-blr-bcs301',
    batch_id: 'batch-blr-vtu',
    name: 'VTU Semester-End University Examination',
    exam_date: '2026-11-18',
    university_affiliation: 'Visvesvaraya Technological University (VTU)',
    syllabus_scope_topic_ids: ['top-vtu-1', 'top-vtu-2', 'top-vtu-3'],
  },

  // Jaipur — Mirai Midterm
  {
    id: 'exam-jpr-mirai-mid',
    branch_id: 'Jaipur',
    academic_track: 'Mirai Track',
    subject_id: 'subj-jpr-cs301',
    batch_id: 'batch-jpr-mirai',
    name: 'Mirai Track Jaipur Midterm Assessment',
    exam_date: '2026-10-16',
    university_affiliation: 'Mirai Specialization',
    syllabus_scope_topic_ids: ['top-jnu-1'],
  },
  // Jaipur — Jagannath University Term Exam
  {
    id: 'exam-jpr-jnu-end',
    branch_id: 'Jaipur',
    academic_track: 'University Track',
    subject_id: 'subj-jpr-jnu301',
    batch_id: 'batch-jpr-jnu',
    name: 'Jagannath University Winter Term Examination',
    exam_date: '2026-12-01',
    university_affiliation: 'Jagannath University',
    syllabus_scope_topic_ids: ['top-jnu-1', 'top-jnu-2'],
  },
];

// ==========================================
// 10. INITIAL SESSION LOGS BY BRANCH
// ==========================================
export const INITIAL_SESSION_LOGS: SessionLog[] = [
  {
    id: 'log-gzb-1',
    scheduled_class_id: 'tt-gzb-1',
    branch_id: 'Ghaziabad',
    campus_id: 'Ghaziabad',
    academic_track: 'Mirai Track',
    batch_id: 'batch-gzb-mirai',
    subject_id: 'subj-gzb-cs301',
    faculty_id: 'user-fac-radhika',
    date: '2026-08-04',
    duration_hours: 1.5,
    status: 'completed',
    topics_covered: [{ topic_id: 'top-gzb-1', completion_percentage: 100 }],
    topics_remaining: [],
    classwork_status: 'Covered dynamic array geometric growth model and memory realloc overhead.',
    homework_status: 'Implement custom Vector class in C++ with size, capacity, push_back.',
    faculty_notes: 'Students quickly understood amortized O(1) analysis.',
    created_at: '2026-08-04T11:00:00Z',
  },
  {
    id: 'log-gzb-aktu-1',
    scheduled_class_id: 'tt-gzb-aktu-1',
    branch_id: 'Ghaziabad',
    campus_id: 'Ghaziabad',
    academic_track: 'University Track',
    batch_id: 'batch-gzb-aktu',
    subject_id: 'subj-gzb-kcs301',
    faculty_id: 'user-fac-rajesh',
    date: '2026-08-14',
    duration_hours: 1.5,
    status: 'completed',
    topics_covered: [{ topic_id: 'top-aktu-1', completion_percentage: 100 }],
    topics_remaining: [],
    classwork_status: 'Covered AKTU Module 1: Big-O, Big-Omega, Theta definitions and examples.',
    homework_status: 'Solve previous year AKTU university questions (2021-2024).',
    faculty_notes: 'Aligned strictly with AKTU question bank patterns.',
    created_at: '2026-08-14T12:00:00Z',
  },
];

// ==========================================
// 11. INITIAL MISSED SESSIONS
// ==========================================
export const INITIAL_MISSED_SESSIONS: MissedSessionRecord[] = [
  {
    id: 'missed-gzb-1',
    timetable_entry_id: 'tt-gzb-3',
    branch_id: 'Ghaziabad',
    campus_id: 'Ghaziabad',
    academic_track: 'Mirai Track',
    batch_id: 'batch-gzb-mirai',
    subject_id: 'subj-gzb-cs301',
    faculty_id: 'user-fac-radhika',
    scheduled_date: '2026-09-11',
    scheduled_time: '09:00 - 10:30',
    duration_hours: 1.5,
    status: 'unlogged',
    hours_overdue: 52,
    escalated_at: '2026-09-13T12:00:00Z',
  },
  {
    id: 'missed-blr-1',
    timetable_entry_id: 'tt-blr-vtu-2',
    branch_id: 'Bangalore',
    campus_id: 'Bangalore',
    academic_track: 'University Track',
    batch_id: 'batch-blr-vtu',
    subject_id: 'subj-blr-bcs301',
    faculty_id: 'user-fac-suresh',
    scheduled_date: '2026-09-16',
    scheduled_time: '11:00 - 12:30',
    duration_hours: 1.5,
    status: 'reminded',
    hours_overdue: 24,
    last_notified_at: '2026-09-17T09:00:00Z',
  },
];

// ==========================================
// 12. INITIAL AUDIT LOGS
// ==========================================
export const INITIAL_AUDIT_LOGS: AuditTrailEntry[] = [
  {
    id: 'audit-1',
    branch_id: 'Ghaziabad',
    entity_type: 'branch',
    entity_id: 'Ghaziabad',
    action: 'create',
    performed_by_id: 'user-admin',
    performed_by_name: 'Dr. Suresh Chandra',
    details: 'Configured Ghaziabad branch with Dr. A.P.J. Abdul Kalam Technical University (AKTU) affiliation',
    timestamp: '2026-08-01T08:00:00Z',
  },
  {
    id: 'audit-2',
    branch_id: 'Bangalore',
    entity_type: 'branch',
    entity_id: 'Bangalore',
    action: 'create',
    performed_by_id: 'user-admin',
    performed_by_name: 'Dr. Suresh Chandra',
    details: 'Configured Bangalore branch with Visvesvaraya Technological University (VTU) affiliation',
    timestamp: '2026-08-01T08:05:00Z',
  },
  {
    id: 'audit-3',
    branch_id: 'Jaipur',
    entity_type: 'branch',
    entity_id: 'Jaipur',
    action: 'create',
    performed_by_id: 'user-admin',
    performed_by_name: 'Dr. Suresh Chandra',
    details: 'Configured Jaipur branch with Jagannath University affiliation',
    timestamp: '2026-08-01T08:10:00Z',
  },
];
