import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    isWarning?: boolean;
  };
  progress?: {
    value: number; // 0 to 100
    color?: string;
  };
  highlightColor?: 'blue' | 'green' | 'yellow' | 'pink' | 'charcoal';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  progress,
  highlightColor = 'charcoal',
}) => {
  const colorMap = {
    green: {
      card: 'card-pastel-green text-[#1E4627]',
      icon: 'bg-white text-[#1E4627] border-[#C8E8CD]',
      title: 'text-[#2D5A38]',
      value: 'text-[#1E4627]',
      sub: 'text-[#2D5A38]',
      progressTrack: 'bg-black/5',
      progressFill: 'bg-[#4ADE80]',
    },
    yellow: {
      card: 'card-pastel-yellow text-[#614800]',
      icon: 'bg-white text-[#614800] border-[#FBE69B]',
      title: 'text-[#7A5C00]',
      value: 'text-[#614800]',
      sub: 'text-[#7A5C00]',
      progressTrack: 'bg-black/5',
      progressFill: 'bg-[#FACC15]',
    },
    pink: {
      card: 'card-pastel-pink text-[#701C2F]',
      icon: 'bg-white text-[#701C2F] border-[#F8CAD4]',
      title: 'text-[#8C2940]',
      value: 'text-[#701C2F]',
      sub: 'text-[#8C2940]',
      progressTrack: 'bg-black/5',
      progressFill: 'bg-[#F472B6]',
    },
    blue: {
      card: 'card-pastel-blue text-[#193B6D]',
      icon: 'bg-white text-[#193B6D] border-[#CCE0F9]',
      title: 'text-[#275394]',
      value: 'text-[#193B6D]',
      sub: 'text-[#275394]',
      progressTrack: 'bg-black/5',
      progressFill: 'bg-[#38BDF8]',
    },
    charcoal: {
      card: 'card-pastel-charcoal text-[#1C1917]',
      icon: 'bg-[#FAF7F0] text-[#1C1917] border-[#EFE8DC]',
      title: 'text-[#71695F]',
      value: 'text-[#1C1917]',
      sub: 'text-[#71695F]',
      progressTrack: 'bg-black/5',
      progressFill: 'bg-[#1C1917]',
    },
  }[highlightColor];

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 shadow-[0_2px_10px_rgba(28,25,23,0.02)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between ${colorMap.card}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`text-xs font-medium tracking-normal ${colorMap.title}`}>
          {title}
        </span>
        {icon && (
          <div className={`p-1.5 rounded-xl border shadow-2xs shrink-0 ${colorMap.icon}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className={`text-2xl sm:text-[26px] font-bold tracking-tight ${colorMap.value}`}>
          {value}
        </span>
        {trend && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/80 border border-black/5 shadow-2xs">
            {trend.value}
          </span>
        )}
      </div>

      {progress && (
        <div className="mt-2 w-full">
          <div className={`w-full rounded-full h-1.5 overflow-hidden ${colorMap.progressTrack}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${progress.color || colorMap.progressFill}`}
              style={{ width: `${Math.min(100, Math.max(0, progress.value))}%` }}
            />
          </div>
        </div>
      )}

      {subtitle && !progress && (
        <p className={`text-xs font-normal leading-normal truncate mt-0.5 ${colorMap.sub}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
};
