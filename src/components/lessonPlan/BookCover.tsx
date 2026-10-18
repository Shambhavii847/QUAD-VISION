import React from 'react';
import { Subject, Topic, ProgressionStatus } from '../../types';
import { Code, Database, Globe, Cpu, Shield, Binary, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

export type BookPaletteKey = 'ivory' | 'pink' | 'lavender' | 'butter' | 'sage' | 'blue';

export interface BookTheme {
  name: string;
  key: BookPaletteKey;
  coverBg: string;
  spineBg: string;
  spineBorder: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  accentColor: string;
  ribbonColor: string;
  embossPattern: string;
}

export const BOOK_PALETTES: Record<BookPaletteKey, BookTheme> = {
  sage: {
    name: 'Sage Green',
    key: 'sage',
    coverBg: 'from-[#EAF5EC] via-[#D5ECDA] to-[#BFDECA]',
    spineBg: 'from-[#2A5C37] via-[#3B7B4C] to-[#2A5C37]',
    spineBorder: 'border-[#1E4627]/30',
    textColor: 'text-[#163820]',
    badgeBg: 'bg-[#1E4627]/10',
    badgeText: 'text-[#1E4627]',
    borderColor: 'border-[#A8D3B4]',
    accentColor: '#2A5C37',
    ribbonColor: 'bg-[#2A5C37]',
    embossPattern: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.35) 0%, transparent 60%)',
  },
  lavender: {
    name: 'Lavender',
    key: 'lavender',
    coverBg: 'from-[#F4EFFF] via-[#E8DCFC] to-[#D5C2F6]',
    spineBg: 'from-[#4C1D95] via-[#6D28D9] to-[#4C1D95]',
    spineBorder: 'border-[#4C1D95]/30',
    textColor: 'text-[#37136E]',
    badgeBg: 'bg-[#4C1D95]/10',
    badgeText: 'text-[#4C1D95]',
    borderColor: 'border-[#C9B1F5]',
    accentColor: '#5B21B6',
    ribbonColor: 'bg-[#6D28D9]',
    embossPattern: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)',
  },
  butter: {
    name: 'Butter Yellow',
    key: 'butter',
    coverBg: 'from-[#FFFDE8] via-[#FEF7BD] to-[#FBEA95]',
    spineBg: 'from-[#78350F] via-[#92400E] to-[#78350F]',
    spineBorder: 'border-[#78350F]/30',
    textColor: 'text-[#5C2E0B]',
    badgeBg: 'bg-[#78350F]/10',
    badgeText: 'text-[#78350F]',
    borderColor: 'border-[#E9CF7A]',
    accentColor: '#92400E',
    ribbonColor: 'bg-[#92400E]',
    embossPattern: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.45) 0%, transparent 60%)',
  },
  pink: {
    name: 'Pastel Pink',
    key: 'pink',
    coverBg: 'from-[#FDF2F5] via-[#FCE3EB] to-[#F8CAD7]',
    spineBg: 'from-[#831843] via-[#9D174D] to-[#831843]',
    spineBorder: 'border-[#831843]/30',
    textColor: 'text-[#631032]',
    badgeBg: 'bg-[#831843]/10',
    badgeText: 'text-[#831843]',
    borderColor: 'border-[#F2ABC1]',
    accentColor: '#9D174D',
    ribbonColor: 'bg-[#9D174D]',
    embossPattern: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)',
  },
  blue: {
    name: 'Powder Blue',
    key: 'blue',
    coverBg: 'from-[#F0F8FF] via-[#DCEDFC] to-[#C3DFF8]',
    spineBg: 'from-[#0C4A6E] via-[#075985] to-[#0C4A6E]',
    spineBorder: 'border-[#0C4A6E]/30',
    textColor: 'text-[#0A3853]',
    badgeBg: 'bg-[#0C4A6E]/10',
    badgeText: 'text-[#0C4A6E]',
    borderColor: 'border-[#A3CDF1]',
    accentColor: '#0369A1',
    ribbonColor: 'bg-[#0284C7]',
    embossPattern: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.35) 0%, transparent 60%)',
  },
  ivory: {
    name: 'Warm Ivory',
    key: 'ivory',
    coverBg: 'from-[#FFFDF9] via-[#F8F1E4] to-[#EFE3CE]',
    spineBg: 'from-[#292524] via-[#44403C] to-[#292524]',
    spineBorder: 'border-[#292524]/30',
    textColor: 'text-[#24201E]',
    badgeBg: 'bg-[#292524]/10',
    badgeText: 'text-[#292524]',
    borderColor: 'border-[#D4C3A7]',
    accentColor: '#44403C',
    ribbonColor: 'bg-[#44403C]',
    embossPattern: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.45) 0%, transparent 60%)',
  },
};

export function getBookTheme(subject: Subject): BookTheme {
  const code = (subject.code || '').toUpperCase();
  const id = (subject.id || '').toLowerCase();

  if (code.includes('CS301') && id.includes('gzb') && !code.includes('K')) return BOOK_PALETTES.sage;
  if (code.includes('CS302')) return BOOK_PALETTES.butter;
  if (code.includes('KCS301')) return BOOK_PALETTES.lavender;
  if (code.includes('BCS301')) return BOOK_PALETTES.pink;
  if (id.includes('blr')) return BOOK_PALETTES.blue;
  if (code.includes('JNU') || id.includes('jnu')) return BOOK_PALETTES.ivory;

  // Stable hash fallback
  const hash = (subject.code + subject.name).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const keys: BookPaletteKey[] = ['sage', 'lavender', 'butter', 'pink', 'blue', 'ivory'];
  return BOOK_PALETTES[keys[hash % keys.length]];
}

export function getSubjectLucideIcon(code: string, name: string) {
  const c = (code + ' ' + name).toLowerCase();
  if (c.includes('cs') || c.includes('algo') || c.includes('program') || c.includes('data structure')) return Code;
  if (c.includes('dbms') || c.includes('database') || c.includes('sql')) return Database;
  if (c.includes('web') || c.includes('network') || c.includes('cloud')) return Globe;
  if (c.includes('os') || c.includes('system') || c.includes('hardware') || c.includes('micro')) return Cpu;
  if (c.includes('security') || c.includes('crypto')) return Shield;
  if (c.includes('math') || c.includes('discrete') || c.includes('stat')) return Binary;
  return BookOpen;
}

interface BookCoverProps {
  subject: Subject;
  unitsCount: number;
  topicsCount: number;
  coveragePercentage: number;
  coveredHours: number;
  totalHours: number;
  status: ProgressionStatus;
  onClick?: () => void;
  size?: 'normal' | 'compact' | 'mini';
}

export const BookCover: React.FC<BookCoverProps> = ({
  subject,
  unitsCount,
  topicsCount,
  coveragePercentage,
  coveredHours,
  totalHours,
  status,
  onClick,
  size = 'normal',
}) => {
  const theme = getBookTheme(subject);
  const IconComponent = getSubjectLucideIcon(subject.code, subject.name);

  // Status configuration
  const statusConfig: Record<
    ProgressionStatus,
    { label: string; bg: string; text: string; dot: string; border: string }
  > = {
    COMPLETE: {
      label: 'Completed',
      bg: 'bg-[#EEF7EF]',
      text: 'text-[#1E4627]',
      dot: 'bg-[#22C55E]',
      border: 'border-[#C8E8CD]',
    },
    'ON TRACK': {
      label: 'On Track',
      bg: 'bg-[#EEF7EF]',
      text: 'text-[#1E4627]',
      dot: 'bg-[#22C55E]',
      border: 'border-[#C8E8CD]',
    },
    TIGHT: {
      label: 'Tight',
      bg: 'bg-[#FEF9E7]',
      text: 'text-[#78350F]',
      dot: 'bg-[#EAB308]',
      border: 'border-[#FBE69B]',
    },
    DANGER: {
      label: 'Behind',
      bg: 'bg-[#FDF2F4]',
      text: 'text-[#831843]',
      dot: 'bg-[#EC4899]',
      border: 'border-[#F8CAD4]',
    },
  };

  const statusStyle = statusConfig[status] || statusConfig['ON TRACK'];

  if (size === 'mini') {
    return (
      <div
        className={`relative w-20 h-28 rounded-r-lg rounded-l-xs bg-gradient-to-br ${theme.coverBg} border ${theme.borderColor} shadow-md overflow-hidden flex flex-col justify-between p-2 select-none shrink-0`}
      >
        {/* Spine strip */}
        <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-black/10 border-r border-black/10 backdrop-blur-2xs" />
        <div className="pl-2">
          <span className="text-[9px] font-bold tracking-tight text-[#1C1917]/70 block">{subject.code}</span>
        </div>
        <div className="pl-2">
          <IconComponent className="w-4 h-4 opacity-70" style={{ color: theme.accentColor }} />
        </div>
        <div className="pl-2">
          <span className="text-[8px] font-semibold text-[#1C1917] line-clamp-2 leading-tight">{subject.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col items-center select-none w-full max-w-[260px] mx-auto">
      {/* 3D Clickable Book */}
      <button
        type="button"
        onClick={onClick}
        className="relative w-full aspect-[1/1.42] text-left cursor-pointer transition-all duration-300 ease-out transform group-hover:-translate-y-2.5 group-hover:rotate-[0.5deg] focus:outline-hidden focus-visible:ring-4 focus-visible:ring-[#1C1917]/20 rounded-r-2xl rounded-l-xs"
        style={{ perspective: '1200px' }}
        aria-label={`Open syllabus for ${subject.name} (${subject.code})`}
      >
        {/* Soft 3D Drop Shadow */}
        <div className="absolute inset-0 rounded-r-2xl rounded-l-xs bg-black/25 blur-md translate-y-3 group-hover:translate-y-5 group-hover:blur-xl opacity-70 group-hover:opacity-90 transition-all duration-300 pointer-events-none" />

        {/* Realistic Page Edges (Right and Bottom stack of paper) */}
        <div className="absolute top-1.5 bottom-1.5 -right-2 w-3 rounded-r-md bg-gradient-to-r from-[#F0ECE2] via-[#FAF7F0] to-[#E5DFD1] shadow-[2px_2px_5px_rgba(0,0,0,0.15)] border-y border-r border-[#D9D0BE] flex flex-col justify-around py-2 opacity-95">
          <div className="w-full h-px bg-black/5" />
          <div className="w-full h-px bg-black/5" />
          <div className="w-full h-px bg-black/5" />
          <div className="w-full h-px bg-black/5" />
        </div>

        {/* Top Paper Stack Glimpse */}
        <div className="absolute -top-1 left-3 right-0 h-1.5 rounded-t-xs bg-[#F4EFE6] border-t border-l border-[#D9D0BE] opacity-80" />

        {/* Main Book Front Cover */}
        <div
          className={`relative z-10 w-full h-full rounded-r-2xl rounded-l-xs bg-gradient-to-br ${theme.coverBg} border ${theme.borderColor} shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),_0_6px_16px_rgba(28,25,23,0.08)] overflow-hidden flex flex-col justify-between p-4 sm:p-5`}
        >
          {/* Subtle linen/emboss texture overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
            style={{ backgroundImage: theme.embossPattern }}
          />

          {/* Diagonal Gloss Sheen */}
          <div className="absolute -top-24 -left-24 w-56 h-72 bg-gradient-to-br from-white/30 via-white/5 to-transparent rotate-25 pointer-events-none" />

          {/* Slim Spine & Hinge Crease Effect (Left side of hardcover) */}
          <div className="absolute top-0 bottom-0 left-0 w-4 sm:w-5 bg-gradient-to-r from-black/20 via-black/5 to-transparent border-r border-black/10 flex items-center justify-center">
            {/* Blind debossed groove / hinge indentation */}
            <div className="absolute top-0 bottom-0 right-0 w-px bg-white/40" />
            <div className="absolute top-0 bottom-0 left-1 w-px bg-black/10" />
          </div>

          {/* Bookmark Ribbon Hanging from Top */}
          <div
            className={`absolute top-0 right-6 w-3 h-9 ${theme.ribbonColor} shadow-md rounded-b-xs transition-transform duration-300 group-hover:translate-y-1.5`}
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)',
            }}
          />

          {/* Header Metadata on Cover */}
          <div className="pl-3 sm:pl-3.5 relative z-10">
            <div className="flex items-center justify-between gap-1 pr-6">
              <span
                className={`text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${theme.badgeBg} ${theme.badgeText} backdrop-blur-xs`}
              >
                {subject.academic_track || 'Curriculum'}
              </span>

              <span className="text-[10px] font-semibold text-[#1C1917]/60">
                {subject.total_credits ? `${subject.total_credits} cr` : 'Sem 3'}
              </span>
            </div>

            <div className="mt-2.5">
              <span className="text-[11px] sm:text-xs font-black tracking-widest uppercase text-[#1C1917]/75 font-mono">
                {subject.code}
              </span>
            </div>
          </div>

          {/* Center Title & Academic Motif */}
          <div className="pl-3 sm:pl-3.5 my-auto relative z-10 space-y-2">
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/80 backdrop-blur-xs border border-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
            >
              <IconComponent className="w-5 h-5 sm:w-5.5 sm:h-5.5" style={{ color: theme.accentColor }} />
            </div>

            <h3
              className={`font-serif font-bold text-sm sm:text-base leading-snug line-clamp-3 ${theme.textColor} tracking-tight`}
            >
              {subject.name}
            </h3>

            {subject.faculty_name && (
              <p className="text-[10px] sm:text-[11px] font-medium text-[#1C1917]/65 line-clamp-1">
                {subject.faculty_name}
              </p>
            )}
          </div>

          {/* Bottom Cover Footer: Unit & Topic Structure */}
          <div className="pl-3 sm:pl-3.5 pt-2 border-t border-black/8 relative z-10 flex items-center justify-between text-[10px] sm:text-[11px] font-medium text-[#1C1917]/75">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 opacity-70" />
              <span>{unitsCount} Units</span>
            </span>
            <span className="text-[#1C1917]/60">{topicsCount} Topics</span>
          </div>
        </div>
      </button>

      {/* Beneath the Book: Progress Indicator & Progression Status Pill */}
      <div className="w-full mt-3 px-1 space-y-1.5 text-xs">
        {/* Progress bar + percentage */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#71695F] font-medium">Coverage</span>
          <span className="font-bold text-[#1C1917]">{coveragePercentage.toFixed(0)}%</span>
        </div>

        <div className="w-full bg-[#EAE2D5] rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.min(100, coveragePercentage)}%`,
              backgroundColor: theme.accentColor,
            }}
          />
        </div>

        {/* Bottom row: Hours & Status indicator */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px] text-[#8C8275]">
            {coveredHours.toFixed(1)} / {totalHours.toFixed(1)} hrs
          </span>

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
            <span>{statusStyle.label}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
