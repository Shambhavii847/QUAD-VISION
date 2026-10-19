import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getBranches,
  getCampuses,
  getBatches,
  getSemesters,
  getHolidays,
  getSubjects,
  getTopics,
  getTimetable,
  getExaminations,
  getUsers,
  resetToDemoData,
} from '../../services/storage';
import { checkSupabaseConnection } from '../../services/supabaseService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { Modal } from '../common/Modal';
import { CsvImporter } from './CsvImporter';
import {
  Settings,
  RotateCcw,
  Building2,
  BookOpen,
  Users,
  Calendar,
  GraduationCap,
  Layers,
  CheckCircle2,
  AlertCircle,
  Shield,
  Trash2,
  Plus,
  Database,
  RefreshCw,
  Server,
  Key,
  ExternalLink,
  Zap,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';

import { AccessDenied } from '../common/AccessDenied';
import { AdminOpportunitiesManager } from './AdminOpportunitiesManager';

export const AdminManagement: React.FC = () => {
  const { currentUser, isAdmin, reSyncDatabase } = useAuth();

  if (!isAdmin) {
    return <AccessDenied requiredRole="Administrator" />;
  }

  const [activeTab, setActiveTab] = useState<
    'backend' | 'opportunities' | 'csv' | 'branches' | 'tracks' | 'batches' | 'subjects' | 'faculty' | 'users'
  >('backend');

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Supabase Diagnostics state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    tested: boolean;
    connected: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const branches = getBranches();
  const batches = getBatches();
  const subjects = getSubjects();
  const users = getUsers();
  const topics = getTopics();

  const handleResetData = () => {
    resetToDemoData();
    setIsResetConfirmOpen(false);
    showNotice('Successfully reset database to clean initial demo state!');
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    const res = await checkSupabaseConnection();
    setTestingConnection(false);
    setConnectionResult({ tested: true, ...res });
  };

  const handleSyncDatabase = async () => {
    setSyncing(true);
    const success = await reSyncDatabase();
    setSyncing(false);
    if (success) {
      showNotice('Successfully pulled latest tables from Supabase PostgreSQL!');
    } else {
      showNotice('Sync completed. (Check Supabase credentials if live sync is expected).');
    }
  };

  const showNotice = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const tracks = [
    {
      id: 'Mirai Track',
      description: 'Advanced technology track with accelerated industry specialization and separate branch-specific faculty and timetable.',
      focus: 'High-Pace Systems & AI',
      batches: 3,
    },
    {
      id: 'University Track',
      description: 'Standard accredited degree curriculum governed by affiliated regional universities (AKTU, VTU, Jagannath University).',
      focus: 'Core Engineering Foundations',
      batches: 3,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8DC] shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] px-3 py-0.5 rounded-full bg-[#FAF7F0] text-[#78716C] border border-[#EFE8DC] font-semibold">
                Central Administration
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-[#1C1917]" />
              <span>Academic Configuration & Diagnostics</span>
            </h2>
            <p className="text-xs text-[#78716C] mt-1 max-w-2xl leading-relaxed">
              Global administration for all 3 campus branches (Ghaziabad, Bangalore, Jaipur), academic tracks, syllabus ingestion, and data synchronization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-4 py-2 rounded-full bg-[#FDF2F4] hover:bg-[#F8CAD4]/40 text-[#701A4A] border border-[#F8CAD4] font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#701A4A]" />
              <span>Reset Demo Seed Data</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className="mt-4 p-3.5 rounded-2xl bg-[#EEF7EF] border border-[#C8E8CD] text-[#2D451B] font-medium text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#557B2F] shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Tab Navigation - Capsule Pills */}
        <div className="flex items-center gap-2 mt-6 pt-2 border-t border-[#EFE8DC]/80 overflow-x-auto">
          {[
            { id: 'backend', label: 'Storage & Diagnostics', icon: Database },
            { id: 'opportunities', label: 'Opportunities Hub', icon: Sparkles },
            { id: 'csv', label: 'CSV Bulk Ingestion', icon: FileSpreadsheet },
            { id: 'branches', label: 'Branches (3)', icon: Building2 },
            { id: 'tracks', label: 'Tracks (2)', icon: Layers },
            { id: 'batches', label: 'Batches & Semesters', icon: Calendar },
            { id: 'subjects', label: 'Subjects & Credits', icon: BookOpen },
            { id: 'users', label: 'Users & Roles', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#1C1917] text-white shadow-2xs'
                  : 'bg-[#FAF7F0] text-[#78716C] hover:text-[#1C1917] hover:bg-white border border-[#EFE8DC]'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* OPPORTUNITIES MANAGEMENT TAB */}
      {activeTab === 'opportunities' && <AdminOpportunitiesManager />}

      {/* CSV IMPORTER TAB */}
      {activeTab === 'csv' && <CsvImporter />}

      {/* TAB CONTENT: Backend & Storage */}
      {activeTab === 'backend' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-[#EFE8DC] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#1C1917] text-sm">
                Dual Storage Architecture Status
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                isSupabaseConfigured
                  ? 'bg-[#EEF7EF] text-[#2D451B] border-[#C8E8CD]'
                  : 'bg-[#FEF9E7] text-[#644B00] border-[#FBE69B]'
              }`}>
                {isSupabaseConfigured ? 'Supabase Connected' : 'Local Storage Mode'}
              </span>
            </div>

            <p className="text-xs text-[#78716C] leading-relaxed">
              MSOT operates in high-performance local persistent mode with zero cloud configuration needed. If environment variables are supplied, it synchronizes seamlessly with PostgreSQL.
            </p>

            <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[#78716C]">Configured Batches:</span>
                <span className="font-semibold text-[#1C1917]">{batches.length} Batches</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#78716C]">Configured Subjects:</span>
                <span className="font-semibold text-[#1C1917]">{subjects.length} Subjects</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#78716C]">Active Syllabus Topics:</span>
                <span className="font-semibold text-[#1C1917]">{topics.length} Topics</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-4 py-2 rounded-full bg-[#1C1917] hover:bg-black text-[#FBE69B] font-medium text-xs flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{testingConnection ? 'Testing...' : 'Test Storage Diagnostics'}</span>
              </button>
            </div>

            {connectionResult && (
              <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs">
                {connectionResult.connected ? (
                  <p className="text-[#2D451B] font-medium">
                    Storage backend reachable with {connectionResult.latencyMs}ms latency.
                  </p>
                ) : (
                  <p className="text-[#644B00] font-medium">
                    Running in High-Performance Local Browser Storage mode.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#EFE8DC] shadow-2xs space-y-4">
            <h3 className="font-bold text-[#1C1917] text-sm">
              Academic Calendar Rules Summary
            </h3>
            <p className="text-xs text-[#78716C] leading-relaxed">
              Rules governing available hours calculations, Indian Saturday rules, and target date windows.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] flex justify-between items-center">
                <span className="font-semibold text-[#1C1917]">Saturday Rule:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F0F6FD] text-[#1E3A8A] font-medium border border-[#CADCF8]">
                  second_fourth (2nd & 4th Off)
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] flex justify-between items-center">
                <span className="font-semibold text-[#1C1917]">Working Weekdays:</span>
                <span className="font-semibold text-[#1C1917]">Mon, Tue, Wed, Thu, Fri, Sat</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] flex justify-between items-center">
                <span className="font-semibold text-[#1C1917]">Track Severity Order:</span>
                <span className="font-semibold text-[#701A4A]">DANGER &gt; TIGHT &gt; ON TRACK &gt; COMPLETE</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Branches & Universities */}
      {activeTab === 'branches' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {branches.map((b) => (
            <div key={b.id} className="bg-white rounded-3xl p-6 border border-[#EFE8DC] shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#1C1917] text-[#FBE69B]">
                  {b.id} Branch
                </span>
                <span className="text-xs text-[#78716C] font-medium">{b.total_students} Students</span>
              </div>
              <div>
                <h4 className="font-bold text-[#1C1917] text-base">{b.name}</h4>
                <p className="text-xs text-[#78716C] mt-0.5">{b.city}, {b.state}</p>
                <p className="text-[11px] text-[#A8A29E] mt-1">{b.address}</p>
              </div>
              <div className="pt-3 border-t border-[#EFE8DC]/80 space-y-1">
                <span className="text-[10px] font-semibold text-[#78716C] uppercase tracking-wider block">
                  Affiliated University (Univ Track)
                </span>
                <div className="text-xs font-semibold text-[#701A4A] bg-[#FDF2F4] px-2.5 py-1 rounded-xl border border-[#F8CAD4]">
                  {b.university_affiliation}
                </div>
              </div>
              <div className="pt-2 border-t border-[#EFE8DC]/80 flex items-center justify-between text-xs">
                <span className="text-[#78716C]">Tracks Supported:</span>
                <span className="font-semibold text-[#1C1917]">Mirai + Univ Track</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT: Tracks */}
      {activeTab === 'tracks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tracks.map((t) => (
            <div key={t.id} className="bg-white rounded-3xl p-6 border border-[#EFE8DC] shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#1C1917] text-base">{t.id}</h4>
                <span className="px-3 py-0.5 rounded-full text-[11px] font-medium bg-[#EEF7EF] text-[#2D451B] border border-[#C8E8CD]">
                  Active Track
                </span>
              </div>
              <p className="text-xs text-[#78716C] leading-relaxed">{t.description}</p>
              <div className="pt-3 border-t border-[#EFE8DC]/80 flex items-center justify-between text-xs">
                <span className="text-[#78716C]">Primary Focus:</span>
                <span className="font-semibold text-[#1C1917]">{t.focus}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT: Batches */}
      {activeTab === 'batches' && (
        <div className="bg-white rounded-3xl border border-[#EFE8DC] shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EFE8DC] bg-[#FAF7F0]/60">
            <h3 className="font-bold text-[#1C1917] text-sm">Configured Batches & Cohorts</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F0] text-[#78716C] font-semibold border-b border-[#EFE8DC]">
              <tr>
                <th className="py-3 px-4">Batch Name</th>
                <th className="py-3 px-4">Campus</th>
                <th className="py-3 px-4">Academic Track</th>
                <th className="py-3 px-4">Current Semester</th>
                <th className="py-3 px-4">Years</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DC]/60">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-[#FAF7F0]/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#1C1917]">{b.name}</td>
                  <td className="py-3 px-4 text-[#78716C]">{b.campus_id}</td>
                  <td className="py-3 px-4 font-medium text-[#1C1917]">{b.academic_track}</td>
                  <td className="py-3 px-4 font-semibold text-[#1C1917]">Semester {b.current_semester}</td>
                  <td className="py-3 px-4 text-[#78716C]">{b.start_year} - {b.end_year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: Subjects */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-3xl border border-[#EFE8DC] shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EFE8DC] bg-[#FAF7F0]/60">
            <h3 className="font-bold text-[#1C1917] text-sm">Registered Subjects & Faculty Allocation</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F0] text-[#78716C] font-semibold border-b border-[#EFE8DC]">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Subject Name</th>
                <th className="py-3 px-4">Credits</th>
                <th className="py-3 px-4">Faculty In Charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DC]/60">
              {subjects.map((s) => (
                <tr key={s.id} className="hover:bg-[#FAF7F0]/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#1C1917]">{s.code}</td>
                  <td className="py-3 px-4 font-semibold text-[#1C1917]">{s.name}</td>
                  <td className="py-3 px-4 font-medium text-[#78716C]">{s.total_credits} Credits</td>
                  <td className="py-3 px-4 text-[#78716C]">{s.faculty_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-[#EFE8DC] shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EFE8DC] bg-[#FAF7F0]/60">
            <h3 className="font-bold text-[#1C1917] text-sm">System Users & Persona Roster</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F0] text-[#78716C] font-semibold border-b border-[#EFE8DC]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Campus</th>
                <th className="py-3 px-4">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DC]/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#FAF7F0]/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#1C1917] flex items-center gap-2.5">
                    <img
                      src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop'}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-[#EFE8DC]"
                    />
                    <span>{u.name}</span>
                  </td>
                  <td className="py-3 px-4 font-medium capitalize text-[#1C1917]">{u.role.replace('_', ' ')}</td>
                  <td className="py-3 px-4 text-[#78716C]">{u.campus_id || 'All Campuses'}</td>
                  <td className="py-3 px-4 text-[#78716C]">{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title="Reset Academic Demo Data"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#78716C] leading-relaxed">
            Are you sure you want to reset all academic tables to their initial seed state? This will restore the default subjects, timetable, and session records for HI-Tech campus.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setIsResetConfirmOpen(false)}
              className="px-4 py-2 rounded-full border border-[#EFE8DC] bg-white text-[#1C1917] font-medium cursor-pointer hover:bg-[#FAF7F0]"
            >
              Cancel
            </button>
            <button
              onClick={handleResetData}
              className="px-4 py-2 rounded-full bg-[#FDF2F4] text-[#701A4A] border border-[#F8CAD4] font-semibold cursor-pointer hover:bg-[#F8CAD4]/40"
            >
              Confirm Reset
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
