import React from 'react';
import { StudentOpportunity, OPPORTUNITY_CATEGORIES } from '../../types';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Sparkles,
  Building2,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

interface OpportunityCardProps {
  opportunity: StudentOpportunity;
  onViewDetails: (opp: StudentOpportunity) => void;
  isFeaturedSpotlight?: boolean;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  onViewDetails,
  isFeaturedSpotlight = false,
}) => {
  const categoryMeta = OPPORTUNITY_CATEGORIES.find((c) => c.id === opportunity.category);

  // Check if deadline has passed
  const now = new Date();
  const deadlineDate = opportunity.application_deadline
    ? new Date(opportunity.application_deadline)
    : null;
  const isDeadlinePassed = deadlineDate ? deadlineDate.getTime() < now.getTime() : false;

  // Calculate days remaining
  let daysRemaining: number | null = null;
  if (deadlineDate && !isDeadlinePassed) {
    const diffTime = deadlineDate.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  // Format dates
  const formatDate = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatPriceBadge = () => {
    switch (opportunity.price_status) {
      case 'free':
        return { label: 'Free', bg: 'bg-[#EEF7EF] text-[#2D451B] border-[#C8E8CD]' };
      case 'paid':
        return { label: 'Paid', bg: 'bg-[#FFF3E8] text-[#8C3A00] border-[#FBD8B8]' };
      case 'stipend':
        return { label: 'Stipend', bg: 'bg-[#F2EDFD] text-[#49228A] border-[#D9CEF7]' };
      default:
        return null;
    }
  };

  const formatModeBadge = () => {
    switch (opportunity.delivery_format) {
      case 'online':
        return { label: 'Online', bg: 'bg-[#EBF5FB] text-[#1B4D7E] border-[#CFE5F7]' };
      case 'in_person':
        return { label: 'In-Person', bg: 'bg-[#FFF8E7] text-[#7A5400] border-[#FCE6A8]' };
      case 'hybrid':
        return { label: 'Hybrid', bg: 'bg-[#F4EFFC] text-[#552787] border-[#E1D1F5]' };
      default:
        return null;
    }
  };

  const priceBadge = formatPriceBadge();
  const modeBadge = formatModeBadge();
  const formattedDeadline = formatDate(opportunity.application_deadline || opportunity.deadline);
  const formattedEventStart = formatDate(opportunity.event_start_date);

  return (
    <div
      onClick={() => onViewDetails(opportunity)}
      className={`group relative bg-white rounded-3xl p-5 sm:p-6 border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md ${
        isFeaturedSpotlight || opportunity.featured
          ? 'border-[#FBE69B] shadow-2xs hover:border-[#E8B647] bg-gradient-to-br from-white via-white to-[#FFFDF7]'
          : 'border-[#EFE8DC] hover:border-[#D6CEC1]'
      }`}
    >
      <div>
        {/* Top Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Category */}
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                categoryMeta
                  ? `${categoryMeta.badgeBg} ${categoryMeta.badgeText} ${categoryMeta.badgeBorder}`
                  : 'bg-[#FAF7F0] text-[#71695F] border-[#EFE8DC]'
              }`}
            >
              {categoryMeta?.name || opportunity.category}
            </span>

            {/* Delivery format */}
            {modeBadge && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${modeBadge.bg}`}>
                {modeBadge.label}
              </span>
            )}

            {/* Price */}
            {priceBadge && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${priceBadge.bg}`}>
                {priceBadge.label}
              </span>
            )}
          </div>

          {/* Featured pill */}
          {opportunity.featured && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF3D6] text-[#8C5E00] border border-[#FBD989] flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-[#C4841D]" />
              <span>Featured</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-[#1C1917] tracking-tight group-hover:text-[#8C5E00] transition-colors leading-snug mb-1.5">
          {opportunity.title}
        </h3>

        {/* Organizer */}
        <div className="flex items-center gap-1.5 text-xs text-[#71695F] mb-3">
          <Building2 className="w-3.5 h-3.5 text-[#9C9387] shrink-0" />
          <span className="font-medium text-[#44403C] truncate">
            {opportunity.organizer || opportunity.organization}
          </span>
          {opportunity.location && (
            <>
              <span className="text-[#D6CEC1]">&bull;</span>
              <span className="truncate flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#9C9387]" />
                {opportunity.location}
              </span>
            </>
          )}
        </div>

        {/* Short Summary */}
        <p className="text-xs text-[#57534E] leading-relaxed line-clamp-2 mb-4">
          {opportunity.short_summary || opportunity.description}
        </p>

        {/* Eligibility summary */}
        {opportunity.eligibility && (
          <div className="mb-4 text-[11px] text-[#71695F] bg-[#FAF7F0] px-3 py-1.5 rounded-xl border border-[#EFE8DC]/70 line-clamp-1">
            <span className="font-semibold text-[#44403C]">Eligibility:</span> {opportunity.eligibility}
          </div>
        )}
      </div>

      {/* Dates & Actions Bottom Bar */}
      <div className="pt-3 border-t border-[#EFE8DC]/80 mt-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Deadline vs Event Date display */}
          <div className="space-y-1">
            {formattedDeadline && (
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className={`w-3.5 h-3.5 shrink-0 ${isDeadlinePassed ? 'text-[#A62639]' : 'text-[#C4841D]'}`} />
                <span className="text-[#71695F] font-medium text-[11px]">Deadline:</span>
                <span className={`font-semibold text-[11px] ${isDeadlinePassed ? 'text-[#A62639]' : 'text-[#1C1917]'}`}>
                  {formattedDeadline}
                </span>
                {isDeadlinePassed ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FDF2F4] text-[#A62639] border border-[#F8CAD4] font-bold">
                    Closed
                  </span>
                ) : daysRemaining !== null && daysRemaining <= 7 ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FFF3E8] text-[#8C3A00] border border-[#FBD8B8] font-bold">
                    {daysRemaining === 0 ? 'Today' : `${daysRemaining}d left`}
                  </span>
                ) : null}
              </div>
            )}

            {formattedEventStart && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#71695F]">
                <Calendar className="w-3.5 h-3.5 text-[#2C6B9E] shrink-0" />
                <span>Event Date:</span>
                <span className="font-medium text-[#1C1917]">{formattedEventStart}</span>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(opportunity);
            }}
            className="self-end sm:self-center px-3.5 py-1.5 rounded-full bg-[#FAF7F0] group-hover:bg-[#1C1917] text-[#1C1917] group-hover:text-white border border-[#EFE8DC] group-hover:border-[#1C1917] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <span>View Details</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
