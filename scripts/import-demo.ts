
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import {
  INITIAL_BATCHES,
  INITIAL_SEMESTERS,
  INITIAL_SUBJECTS,
  INITIAL_UNITS,
  INITIAL_TOPICS,
  INITIAL_HOLIDAYS,
  INITIAL_TIMETABLE,
  INITIAL_EXAMINATIONS,
  INITIAL_SESSION_LOGS,
  INITIAL_MISSED_SESSIONS,
} from '../src/data/mockData';

const readEnv = (file: string) =>
  Object.fromEntries(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter(line => line.trim() && !line.trim().startsWith('#'))
      .map(line => {
        const i = line.indexOf('=');
        return [
          line.slice(0, i).trim(),
          line.slice(i + 1).trim().replace(/^["']|["']$/g, ''),
        ];
      })
  );

const env = {
  ...readEnv('.env.local'),
  ...readEnv('.env.import'),
};

const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('Missing Supabase URL or import secret in local env files');
}

const db = createClient(url, key);

async function importTable(table: string, rows: any[]) {
  if (!rows.length) {
    console.log(`${table}: no records`);
    return;
  }

  const { error } = await db.from(table).upsert(rows, { onConflict: 'id' });

  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`${table}: imported ${rows.length} records`);
}

async function main() {
  const tables = [
    ['batches', INITIAL_BATCHES],
    ['semesters', INITIAL_SEMESTERS],
    ['subjects', INITIAL_SUBJECTS],
    ['units', INITIAL_UNITS],
    ['topics', INITIAL_TOPICS],
    ['holidays', INITIAL_HOLIDAYS],
    ['timetable_entries', INITIAL_TIMETABLE],
    ['examinations', INITIAL_EXAMINATIONS],
    ['session_logs', INITIAL_SESSION_LOGS],
    ['missed_sessions', INITIAL_MISSED_SESSIONS],
  ] as const;

  for (const [table, rows] of tables) {
    await importTable(table, rows as any[]);
  }

  console.log('Demo import finished.');
}

main().catch(error => {
  console.error('Import stopped:', error.message);
  process.exitCode = 1;
});
