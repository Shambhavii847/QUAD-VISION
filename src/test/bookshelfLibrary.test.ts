import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSubjects,
  getUnits,
  getTopics,
  getBatches,
  getSemesters,
  getHolidays,
  getTimetable,
  resetToDemoData,
} from '../services/storage';
import {
  calculateHoursInScope,
  calculateCoveredHours,
  calculateCoveragePercentage,
  calculateSubjectProgress,
} from '../utils/calculations';
import { getBookTheme, BOOK_PALETTES } from '../components/lessonPlan/BookCover';

describe('Digital Bookshelf Syllabus Redesign Verification', () => {
  beforeEach(() => {
    resetToDemoData();
  });

  it('1. Verifies that all 6 cohesive pastel palettes are correctly configured', () => {
    const keys = Object.keys(BOOK_PALETTES);
    expect(keys).toContain('sage');
    expect(keys).toContain('lavender');
    expect(keys).toContain('butter');
    expect(keys).toContain('pink');
    expect(keys).toContain('blue');
    expect(keys).toContain('ivory');

    expect(BOOK_PALETTES.sage.name).toBe('Sage Green');
    expect(BOOK_PALETTES.lavender.name).toBe('Lavender');
    expect(BOOK_PALETTES.butter.name).toBe('Butter Yellow');
    expect(BOOK_PALETTES.pink.name).toBe('Pastel Pink');
    expect(BOOK_PALETTES.blue.name).toBe('Powder Blue');
    expect(BOOK_PALETTES.ivory.name).toBe('Warm Ivory');
  });

  it('2. Assigns distinct, beautiful pastel book themes to subjects', () => {
    const subjects = getSubjects();
    expect(subjects.length).toBeGreaterThanOrEqual(6);

    const cs301Gzb = subjects.find((s) => s.id === 'subj-gzb-cs301');
    const cs302Gzb = subjects.find((s) => s.id === 'subj-gzb-cs302');
    const kcs301 = subjects.find((s) => s.id === 'subj-gzb-kcs301');
    const bcs301 = subjects.find((s) => s.id === 'subj-blr-bcs301');

    expect(cs301Gzb).toBeDefined();
    expect(cs302Gzb).toBeDefined();
    expect(kcs301).toBeDefined();
    expect(bcs301).toBeDefined();

    if (cs301Gzb && cs302Gzb && kcs301 && bcs301) {
      const themeCs301 = getBookTheme(cs301Gzb);
      const themeCs302 = getBookTheme(cs302Gzb);
      const themeKcs301 = getBookTheme(kcs301);
      const themeBcs301 = getBookTheme(bcs301);

      expect(themeCs301.key).toBe('sage');
      expect(themeCs302.key).toBe('butter');
      expect(themeKcs301.key).toBe('lavender');
      expect(themeBcs301.key).toBe('pink');
    }
  });

  it('3. Respects branch and track separation (Mirai Track vs University Track)', () => {
    const subjects = getSubjects();

    // Mirai Track subjects
    const miraiSubjects = subjects.filter((s) => s.academic_track === 'Mirai Track');
    // University Track subjects
    const universitySubjects = subjects.filter((s) => s.academic_track === 'University Track');

    expect(miraiSubjects.length).toBeGreaterThan(0);
    expect(universitySubjects.length).toBeGreaterThan(0);

    // Mirai and University subjects must not overlap
    const miraiIds = new Set(miraiSubjects.map((s) => s.id));
    universitySubjects.forEach((s) => {
      expect(miraiIds.has(s.id)).toBe(false);
    });

    // Branches: Ghaziabad, Bangalore, Jaipur
    const gzbSubjects = subjects.filter((s) => s.branch_id === 'Ghaziabad');
    const blrSubjects = subjects.filter((s) => s.branch_id === 'Bangalore');
    const jprSubjects = subjects.filter((s) => s.branch_id === 'Jaipur');

    expect(gzbSubjects.length).toBeGreaterThanOrEqual(2);
    expect(blrSubjects.length).toBeGreaterThanOrEqual(2);
    expect(jprSubjects.length).toBeGreaterThanOrEqual(2);
  });

  it('4. Filters subjects by code or name search query', () => {
    const subjects = getSubjects();

    // Search by code: "CS302"
    const cs302Match = subjects.filter(
      (s) => s.code.toLowerCase().includes('cs302') || s.name.toLowerCase().includes('cs302')
    );
    expect(cs302Match.length).toBe(1);
    expect(cs302Match[0].name).toContain('Database Management');

    // Search by name: "Data Structures"
    const dsMatch = subjects.filter(
      (s) =>
        s.code.toLowerCase().includes('data structures') ||
        s.name.toLowerCase().includes('data structures')
    );
    expect(dsMatch.length).toBeGreaterThanOrEqual(4);
  });

  it('5. Successfully opens Subject 1: Data Structures & Algorithms (Mirai GZB) with real syllabus', () => {
    const subjects = getSubjects();
    const units = getUnits();
    const topics = getTopics();

    const subject1 = subjects.find((s) => s.id === 'subj-gzb-cs301');
    expect(subject1).toBeDefined();
    if (!subject1) return;

    expect(subject1.code).toBe('CS301');
    expect(subject1.branch_id).toBe('Ghaziabad');
    expect(subject1.academic_track).toBe('Mirai Track');
    expect(subject1.faculty_name).toBe('Dr. Radhika Sharma');

    // Units for Subject 1
    const subUnits = units
      .filter((u) => u.subject_id === subject1.id)
      .sort((a, b) => a.unit_number - b.unit_number);
    expect(subUnits.length).toBeGreaterThanOrEqual(3);
    expect(subUnits[0].title).toContain('Linear Structures');
    expect(subUnits[1].title).toContain('Trees, BST');

    // Topics for Subject 1
    const subTopics = topics.filter((t) => t.subject_id === subject1.id);
    expect(subTopics.length).toBeGreaterThanOrEqual(3);

    const scopeHours = calculateHoursInScope(subTopics);
    const coveredHours = calculateCoveredHours(subTopics);
    const pct = calculateCoveragePercentage(coveredHours, scopeHours);

    expect(scopeHours).toBeGreaterThan(0);
    expect(coveredHours).toBeGreaterThan(0);
    expect(pct).toBeGreaterThan(0);
  });

  it('6. Successfully opens Subject 2: AKTU KCS301 Data Structures (Ghaziabad AKTU Board)', () => {
    const subjects = getSubjects();
    const units = getUnits();
    const topics = getTopics();

    const subject2 = subjects.find((s) => s.id === 'subj-gzb-kcs301');
    expect(subject2).toBeDefined();
    if (!subject2) return;

    expect(subject2.code).toBe('KCS301');
    expect(subject2.branch_id).toBe('Ghaziabad');
    expect(subject2.academic_track).toBe('University Track');
    expect(subject2.university_name).toContain('AKTU');

    // Units
    const subUnits = units.filter((u) => u.subject_id === subject2.id);
    expect(subUnits.length).toBeGreaterThanOrEqual(2);
    expect(subUnits[0].title).toContain('AKTU Unit I');

    // Topics
    const subTopics = topics.filter((t) => t.subject_id === subject2.id);
    expect(subTopics.length).toBeGreaterThanOrEqual(2);

    const scopeHours = calculateHoursInScope(subTopics);
    expect(scopeHours).toBeGreaterThan(0);
  });

  it('7. Successfully opens Subject 3: VTU BCS301 Data Structures & Applications (Bangalore VTU)', () => {
    const subjects = getSubjects();
    const units = getUnits();
    const topics = getTopics();

    const subject3 = subjects.find((s) => s.id === 'subj-blr-bcs301');
    expect(subject3).toBeDefined();
    if (!subject3) return;

    expect(subject3.code).toBe('BCS301');
    expect(subject3.branch_id).toBe('Bangalore');
    expect(subject3.academic_track).toBe('University Track');
    expect(subject3.university_name).toContain('VTU');

    // Units
    const subUnits = units.filter((u) => u.subject_id === subject3.id);
    expect(subUnits.length).toBeGreaterThanOrEqual(2);
    expect(subUnits[0].title).toContain('VTU Module 1');

    // Topics
    const subTopics = topics.filter((t) => t.subject_id === subject3.id);
    expect(subTopics.length).toBeGreaterThanOrEqual(2);

    const scopeHours = calculateHoursInScope(subTopics);
    expect(scopeHours).toBeGreaterThan(0);
  });

  it('8. Validates calculation engine integration for progression status', () => {
    const subjects = getSubjects();
    const topics = getTopics();
    const semesters = getSemesters();
    const holidays = getHolidays();
    const timetable = getTimetable();

    const subject = subjects[0];
    const semester = semesters.find((s) => s.batch_id === subject.batch_id) || semesters[0];
    const branchHolidays = holidays.filter((h) => !h.branch_id || h.branch_id === subject.branch_id);

    const progress = calculateSubjectProgress(
      subject,
      topics,
      '2026-09-18',
      semester.end_date,
      semester,
      branchHolidays,
      timetable
    );

    expect(progress).toBeDefined();
    expect(['ON TRACK', 'TIGHT', 'DANGER', 'COMPLETE']).toContain(progress.status);
    expect(progress.coverage_percentage).toBeGreaterThanOrEqual(0);
    expect(progress.coverage_percentage).toBeLessThanOrEqual(100);
    expect(progress.buffer_ratio).toBeGreaterThanOrEqual(0);
  });
});
