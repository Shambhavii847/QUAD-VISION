import { performance } from 'perf_hooks';
import {
  calculateSubjectProgress,
  calculateExamReadiness,
  calculateHoursInScope,
  calculateCoveredHours,
  recalculateTopicPlannedDates,
} from '../utils/calculations';
import {
  INITIAL_SUBJECTS,
  INITIAL_TOPICS,
  INITIAL_SEMESTERS,
  INITIAL_HOLIDAYS,
  INITIAL_TIMETABLE,
  INITIAL_EXAMINATIONS,
} from '../data/mockData';

export interface LoadTestResult {
  concurrentUsers: number;
  totalRequests: number;
  totalDurationMs: number;
  throughputRps: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  successRatePct: number;
}

export function runUserProgressionSimulation(userId: string): { success: boolean; durationMs: number } {
  const start = performance.now();
  try {
    const subject = INITIAL_SUBJECTS[0];
    const sem = INITIAL_SEMESTERS[0];
    const holidays = INITIAL_HOLIDAYS;
    const timetable = INITIAL_TIMETABLE;
    const topics = INITIAL_TOPICS;

    // 1. Calculate subject progress
    const progress = calculateSubjectProgress(
      subject,
      topics,
      '2026-09-18',
      '2026-11-30',
      sem,
      holidays,
      timetable
    );

    // 2. Calculate exam readiness
    const exam = INITIAL_EXAMINATIONS[0];
    const readiness = calculateExamReadiness(
      exam.id,
      exam.name,
      exam.exam_date,
      subject,
      topics,
      exam.syllabus_scope_topic_ids,
      '2026-09-18',
      sem,
      holidays,
      timetable
    );

    // 3. Recalculate planned dates
    const recalculated = recalculateTopicPlannedDates(
      subject.id,
      topics,
      sem,
      holidays,
      timetable
    );

    const end = performance.now();
    return { success: progress !== null && readiness !== null && recalculated.length > 0, durationMs: end - start };
  } catch (err) {
    const end = performance.now();
    return { success: false, durationMs: end - start };
  }
}

export function benchmarkConcurrency(userCount: number, requestsPerUser = 10): LoadTestResult {
  const latencies: number[] = [];
  let successfulRequests = 0;
  const totalRequests = userCount * requestsPerUser;

  const wallClockStart = performance.now();

  for (let u = 0; u < userCount; u++) {
    for (let r = 0; r < requestsPerUser; r++) {
      const result = runUserProgressionSimulation(`user-${u}`);
      latencies.push(result.durationMs);
      if (result.success) successfulRequests++;
    }
  }

  const wallClockEnd = performance.now();
  const totalDurationMs = wallClockEnd - wallClockStart;

  latencies.sort((a, b) => a - b);
  const avgLatencyMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p95LatencyMs = latencies[Math.floor(latencies.length * 0.95)] || avgLatencyMs;
  const p99LatencyMs = latencies[Math.floor(latencies.length * 0.99)] || avgLatencyMs;
  const throughputRps = (totalRequests / (totalDurationMs / 1000));
  const successRatePct = (successfulRequests / totalRequests) * 100;

  return {
    concurrentUsers: userCount,
    totalRequests,
    totalDurationMs: Math.round(totalDurationMs * 100) / 100,
    throughputRps: Math.round(throughputRps * 100) / 100,
    avgLatencyMs: Math.round(avgLatencyMs * 1000) / 1000,
    p95LatencyMs: Math.round(p95LatencyMs * 1000) / 1000,
    p99LatencyMs: Math.round(p99LatencyMs * 1000) / 1000,
    successRatePct,
  };
}

// Run load tests for 50, 100, and 200 users
console.log('=== MSOT COURSE PROGRESSION TRACKER: LOAD TEST EXECUTION ===');
const results50 = benchmarkConcurrency(50, 10);
console.log('50 Users:', JSON.stringify(results50, null, 2));

const results100 = benchmarkConcurrency(100, 10);
console.log('100 Users:', JSON.stringify(results100, null, 2));

const results200 = benchmarkConcurrency(200, 10);
console.log('200 Users:', JSON.stringify(results200, null, 2));
