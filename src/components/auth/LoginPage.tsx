import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../../services/authContext';
import {
  GraduationCap,
  BookOpen,
  Shield,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Lock,
  CheckCircle2,
  HelpCircle,
  Database,
} from 'lucide-react';
import { Modal } from '../common/Modal';

type PortalType = 'student' | 'faculty' | 'staff';

const loginSchema = z.object({
  identifier: z.string().min(3, 'Please enter your registered ID or email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login, isBackendConnected, isDemoMode, resetPassword } = useAuth();
  const [activePortal, setActivePortal] = useState<PortalType>('student');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const handlePortalSwitch = (portal: PortalType) => {
    setActivePortal(portal);
    setAuthError(null);
    reset();
  };

  const onLoginSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await login(values.identifier, values.password, activePortal);
      if (!res.success) {
        setAuthError(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) return;
    const res = await resetPassword(forgotPasswordEmail);
    if (res.success) {
      setForgotPasswordMsg('Password reset instructions dispatched to your email.');
    } else {
      setForgotPasswordMsg(res.error || 'Failed to initiate password reset.');
    }
  };

  const portalConfig = {
    student: {
      title: 'Student Login',
      badge: 'Student Portal',
      description: 'Access your assigned batch syllabus, roadmap & upcoming exam schedules.',
      identifierLabel: 'Student ID or Registered Email',
      placeholder: 'e.g. aman.gzb@msot.edu or user-student-aman',
      icon: GraduationCap,
      color: 'bg-[#F9DF7B]/30 text-[#644B00] border-[#F9DF7B]',
      accentColor: '#B08800',
    },
    faculty: {
      title: 'Faculty Login',
      badge: 'Faculty Portal',
      description: 'Log teaching sessions, deliver syllabus plans & manage assigned subjects.',
      identifierLabel: 'Faculty ID or Institutional Email',
      placeholder: 'e.g. radhika.gzb@msot.edu or user-fac-radhika',
      icon: BookOpen,
      color: 'bg-[#B8D094]/30 text-[#2D451B] border-[#B8D094]',
      accentColor: '#557B2F',
    },
    staff: {
      title: 'Admin / Campus Manager Login',
      badge: 'Governance & Management',
      description: 'Manage academic rules, campus timetables, escalations and university tracks.',
      identifierLabel: 'Staff ID or Institutional Email',
      placeholder: 'e.g. admin@msot.edu or manager.gzb@msot.edu',
      icon: Shield,
      color: 'bg-[#F6AECB]/30 text-[#701A4A] border-[#F6AECB]',
      accentColor: '#701A4A',
    },
  }[activePortal];

  const ActiveIcon = portalConfig.icon;

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1C1917] font-sans flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-[#FBE69B]/40">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        {/* Brand Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1C1917] text-white shadow-xs mb-3 border border-black/5">
          <GraduationCap className="w-8 h-8 text-[#FBE69B]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1917]">
          MSOT Course Progression
        </h1>
        <p className="mt-1 text-xs text-[#78716C]">
          Academic Syllabus Monitoring, Timetable Engine & Exam Readiness
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EFE8DC] shadow-[0_8px_30px_-4px_rgba(28,25,23,0.04)]">
          {/* Status Badge */}
          <div className="mb-5 flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider">
              Secure Institutional Access
            </span>
            {isBackendConnected && !isDemoMode ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF7EF] text-[#2D451B] text-[10px] font-semibold border border-[#C8E8CD]">
                <Database className="w-3 h-3 text-[#557B2F]" />
                <span>Supabase Live</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F0] text-[#78716C] text-[10px] font-semibold border border-[#EFE8DC]">
                <Lock className="w-3 h-3 text-[#78716C]" />
                <span>Encrypted Local Vault</span>
              </span>
            )}
          </div>

          {/* 3 Portal Selection Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] mb-6">
            <button
              type="button"
              onClick={() => handlePortalSwitch('student')}
              className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                activePortal === 'student'
                  ? 'bg-white text-[#1C1917] shadow-2xs border border-[#EFE8DC]'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-[#B08800] shrink-0" />
              <span className="truncate">Student</span>
            </button>

            <button
              type="button"
              onClick={() => handlePortalSwitch('faculty')}
              className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                activePortal === 'faculty'
                  ? 'bg-white text-[#1C1917] shadow-2xs border border-[#EFE8DC]'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#557B2F] shrink-0" />
              <span className="truncate">Faculty</span>
            </button>

            <button
              type="button"
              onClick={() => handlePortalSwitch('staff')}
              className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                activePortal === 'staff'
                  ? 'bg-white text-[#1C1917] shadow-2xs border border-[#EFE8DC]'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <Shield className="w-4 h-4 text-[#701A4A] shrink-0" />
              <span className="truncate">Admin / Mgr</span>
            </button>
          </div>

          {/* Active Portal Header */}
          <div className="mb-5 pb-4 border-b border-[#EFE8DC] flex items-start gap-3">
            <div className={`p-2.5 rounded-2xl border ${portalConfig.color} shrink-0`}>
              <ActiveIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1C1917]">{portalConfig.title}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${portalConfig.color}`}>
                  {portalConfig.badge}
                </span>
              </div>
              <p className="text-xs text-[#78716C] mt-0.5 leading-relaxed">
                {portalConfig.description}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {authError && (
            <div className="mb-5 p-3.5 rounded-2xl bg-[#FDF2F4] border border-[#F8CAD4] text-[#701A4A] text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#701A4A]" />
              <span className="leading-snug">{authError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onLoginSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] uppercase tracking-wider mb-1.5">
                {portalConfig.identifierLabel}
              </label>
              <input
                type="text"
                autoComplete="username"
                {...register('identifier')}
                placeholder={portalConfig.placeholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE8DC] bg-[#FAF7F0]/40 focus:bg-white text-xs font-medium text-[#1C1917] placeholder-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#1C1917]/10 focus:border-[#1C1917]/40 transition-all shadow-2xs"
              />
              {errors.identifier && (
                <p className="mt-1 text-xs text-[#701A4A] font-medium">{errors.identifier.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#1C1917] uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-[11px] font-medium text-[#78716C] hover:text-[#1C1917] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  placeholder="Enter your account password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#EFE8DC] bg-[#FAF7F0]/40 focus:bg-white text-xs font-medium text-[#1C1917] placeholder-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#1C1917]/10 focus:border-[#1C1917]/40 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#1C1917] p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-[#701A4A] font-medium">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-full text-xs font-semibold text-white bg-[#1C1917] hover:bg-black shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-[#FBE69B]" />
                  <span>Sign In to {portalConfig.title.replace(' Login', '')}</span>
                </>
              )}
            </button>
          </form>

          {/* Institutional Credential Reference Note */}
          <div className="mt-6 pt-5 border-t border-[#EFE8DC] text-xs text-[#78716C] space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#1C1917] text-[11px]">
              <HelpCircle className="w-3.5 h-3.5 text-[#78716C]" />
              <span>Institutional Access Notes:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Use your registered institutional email or ID. Initial academic accounts are provisioned with passphrase <code className="bg-[#FAF7F0] px-1.5 py-0.5 rounded border border-[#EFE8DC] font-mono font-medium text-[#1C1917]">Academic@2026</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotPasswordOpen}
        onClose={() => {
          setIsForgotPasswordOpen(false);
          setForgotPasswordMsg(null);
        }}
        title="Institutional Password Assistance"
      >
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-xs text-[#736D61] leading-relaxed">
            Enter your registered institutional email. If your account is found, recovery instructions will be provided.
          </p>
          <div>
            <label className="block text-xs font-bold text-[#161616] uppercase tracking-wider mb-1">
              Registered Institutional Email
            </label>
            <input
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              placeholder="e.g. yourname@msot.edu"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFC9] bg-white text-xs font-medium"
            />
          </div>

          {forgotPasswordMsg && (
            <div className="p-3 rounded-xl bg-[#FAF4E8] border border-[#E8DFC9] text-xs text-[#161616] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#557B2F] shrink-0" />
              <span>{forgotPasswordMsg}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsForgotPasswordOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#736D61] hover:bg-[#FAF4E8] border border-[#E8DFC9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#161616] text-[#FAF4E8]"
            >
              Send Recovery Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
