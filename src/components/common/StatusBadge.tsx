import React from 'react';
import { ProgressionStatus } from '../../types';

interface StatusBadgeProps {
  status: ProgressionStatus;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showDetails = true }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3.5 py-1.5 text-sm font-semibold',
  }[size];

  // Warm, pastel palette matching design specifications:
  // Sage Green (#C4D59B) -> ON TRACK / COMPLETE
  // Butter Yellow (#F5DE75) -> TIGHT
  // Pastel Pink (#F3B5D8) -> DANGER
  const statusConfig: Record<
    ProgressionStatus,
    { bg: string; text: string; border: string; dot: string; label: string }
  > = {
    COMPLETE: {
      bg: 'bg-[#EEF7EF]',
      text: 'text-[#1E4627]',
      border: 'border-[#C8E8CD]',
      dot: 'bg-[#4ADE80]',
      label: 'Complete',
    },
    'ON TRACK': {
      bg: 'bg-[#EEF7EF]',
      text: 'text-[#1E4627]',
      border: 'border-[#C8E8CD]',
      dot: 'bg-[#4ADE80]',
      label: showDetails ? 'On Track (≥1.15)' : 'On Track',
    },
    TIGHT: {
      bg: 'bg-[#FEF9E7]',
      text: 'text-[#614800]',
      border: 'border-[#FBE69B]',
      dot: 'bg-[#FACC15]',
      label: showDetails ? 'Tight (1.00–1.14)' : 'Tight',
    },
    DANGER: {
      bg: 'bg-[#FDF2F4]',
      text: 'text-[#701C2F]',
      border: 'border-[#F8CAD4]',
      dot: 'bg-[#F472B6]',
      label: showDetails ? 'Behind (<1.00)' : 'Behind',
    },
  };

  const config = statusConfig[status] || statusConfig['ON TRACK'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-[0_1px_2px_rgba(0,0,0,0.02)] font-medium transition-all ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      <span className="tracking-tight">{config.label}</span>
    </span>
  );
};
