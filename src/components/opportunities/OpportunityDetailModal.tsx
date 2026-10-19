import React from 'react';
import { StudentOpportunity, OPPORTUNITY_CATEGORIES } from '../../types';
import { Modal } from '../common/Modal';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Building2,
  Users,
  Tag,
  DollarSign,
  Info,
} from 'lucide-react';

interface OpportunityDetailModalProps {
  opportunity: StudentOpportunity | null;
  isOpen: boolean;
  onClose: () => void;
  isPreview?: boolean;
}

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  opportunity,
  isOpen,
  onClose,
  isPreview = false,
}) => {
  if (!opportunity) return null;

  const categoryMeta = OPPORTUNITY_CATEGORIES.find((c) => c.id === opportunity.category);

  // Check if deadline has passed
  const now = new Date();
  const deadlineDate = opportunity.application_deadline
    ? new Date(opportunity.application_deadline)
    : null;
  const isDeadlinePassed = deadlineDate ? deadlineDate.getTime() < now.getTime() : false;

  // Calculate days remaining if upcoming
  let daysRemaining: number | null = null;
  if (deadlineDate && !isDeadlinePassed) {
    const diffTime = deadlineDate.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  // Formatting helpers
  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Not specified';
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
        return { label: 'Paid / Fee Required', bg: 'bg-[#FFF3E8] text-[#8C3A00] border-[#FBD8B8]' };
      case 'stipend':
        return { label: 'Stipend Offered', bg: 'bg-[#F2EDFD] text-[#49228A] border-[#D9CEF7]' };
      default:
        return { label: 'Unspecified Fee', bg: 'bg-[#FAF7F0] text-[#71695F] border-[#EFE8DC]' };
    }
  };

  const formatModeBadge = () => {
    switch (opportunity.delivery_format) {
      case 'online':
        return { label: 'Online / Virtual', bg: 'bg-[#EBF5FB] text-[#1B4D7E] border-[#CFE5F7]' };
      case 'in_person':
        return { label: 'In-Person', bg: 'bg-[#FFF8E7] text-[#7A5400] border-[#FCE6A8]' };
      case 'hybrid':
        return { label: 'Hybrid', bg: 'bg-[#F4EFFC] text-[#552787] border-[#E1D1F5]' };
      default:
        return { label: 'Flexible', bg: 'bg-[#FAF7F0] text-[#71695F] border-[#EFE8DC]' };
    }
  };

  const priceBadge = formatPriceBadge();
  const modeBadge = formatModeBadge();
  const applyLink = opportunity.apply_url || opportunity.official_url;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="2xl"
    >
      <div className="space-y-6 -mt-2">
        {/* Preview Banner for Admins */}
        {isPreview && (
          <div className="px-4 py-2.5 rounded-2xl bg-[#FFF9E6] border border-[#FBE69B] text-[#7A5400] text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C4841D]" />
              <span>Admin Preview Mode — Student Perspective</span>
            </div>
            <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-[#FBE69B]/60">
              {opportunity.status}
            </span>
          </div>
        )}

        {/* Hero Header */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* Category */}
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                categoryMeta
                  ? `${categoryMeta.badgeBg} ${categoryMeta.badgeText} ${categoryMeta.badgeBorder}`
                  : 'bg-[#FAF7F0] text-[#71695F] border-[#EFE8DC]'
              }`}
            >
              {categoryMeta?.name || opportunity.category}
            </span>

            {/* Delivery Format */}
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${modeBadge.bg}`}
            >
              {modeBadge.label}
            </span>

            {/* Price Status */}
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${priceBadge.bg}`}
            >
              {priceBadge.label}
            </span>

            {/* Featured Badge */}
            {opportunity.featured && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FFF3D6] text-[#8C5E00] border border-[#FBD989] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Featured
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
            {opportunity.title}
          </h2>

          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-[#71695F]">
            <div className="flex items-center gap-1.5 font-medium text-[#1C1917]">
              <Building2 className="w-4 h-4 text-[#9C9387]" />
              <span>{opportunity.organizer || opportunity.organization}</span>
            </div>
            {opportunity.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#9C9387]" />
                <span>{opportunity.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Critical Dates & Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC]">
          {/* Application Deadline */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-[#71695F] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#C4841D]" />
              <span>Application Deadline</span>
            </div>
            <div className="text-sm font-bold text-[#1C1917]">
              {formatDate(opportunity.application_deadline || opportunity.deadline)}
            </div>
            {isDeadlinePassed ? (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FDF2F4] text-[#A62639] border border-[#F8CAD4] text-[11px] font-semibold">
                <AlertTriangle className="w-3 h-3" />
                <span>Deadline Passed (Applications Closed)</span>
              </div>
            ) : daysRemaining !== null ? (
              <div className="text-[11px] text-[#557B2F] font-semibold">
                ⏳ Closes in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
              </div>
            ) : (
              <div className="text-[11px] text-[#71695F]">Rolling / open submissions</div>
            )}
          </div>

          {/* Event or Commencement Date */}
          <div className="space-y-1 sm:border-l sm:border-[#EFE8DC] sm:pl-4">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-[#71695F] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#2C6B9E]" />
              <span>Event / Program Timeline</span>
            </div>
            <div className="text-sm font-bold text-[#1C1917]">
              {opportunity.event_start_date ? (
                <>
                  {formatDate(opportunity.event_start_date)}
                  {opportunity.event_end_date &&
                    opportunity.event_end_date !== opportunity.event_start_date && (
                      <span> &ndash; {formatDate(opportunity.event_end_date)}</span>
                    )}
                </>
              ) : (
                <span className="text-[#71695F] font-normal">Check official timeline</span>
              )}
            </div>
            <div className="text-[11px] text-[#71695F]">
              Note: Event dates are separate from application deadlines.
            </div>
          </div>
        </div>

        {/* Short Summary */}
        <div className="text-sm text-[#44403C] leading-relaxed bg-[#FDFBF7] p-3.5 rounded-2xl border border-[#EFE8DC]/80">
          <p className="font-medium text-[#1C1917] mb-1">Executive Summary</p>
          <p>{opportunity.short_summary}</p>
        </div>

        {/* Full Detailed Description */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#71695F]">
            Full Details & Overview
          </h3>
          <div className="text-xs sm:text-sm text-[#44403C] leading-relaxed whitespace-pre-line bg-white p-4 rounded-2xl border border-[#EFE8DC]">
            {opportunity.full_description || opportunity.description}
          </div>
        </div>

        {/* Eligibility & Requirements */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#71695F] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#557B2F]" />
            <span>Eligibility Requirements</span>
          </h3>
          <div className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#EFE8DC] space-y-2.5">
            {opportunity.eligibility ? (
              <p className="text-xs sm:text-sm text-[#1C1917] font-medium leading-relaxed">
                {opportunity.eligibility}
              </p>
            ) : null}

            {opportunity.eligibility_requirements &&
            opportunity.eligibility_requirements.length > 0 ? (
              <ul className="space-y-1.5 text-xs text-[#44403C] pt-1">
                {opportunity.eligibility_requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C4841D] mt-1.5 shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* Target Audience Scope */}
            <div className="pt-2 border-t border-[#EFE8DC] flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#71695F] font-semibold flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Target Audience:
              </span>
              {opportunity.target_audience_scope === 'all_students' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-[#EEF7EF] text-[#2D451B] border border-[#C8E8CD] font-medium">
                  All CourseTracker Students (All Campuses & Batches)
                </span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {opportunity.target_campuses?.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded-full bg-white text-[#1C1917] border border-[#EFE8DC] text-[11px]"
                    >
                      Campus: {c}
                    </span>
                  ))}
                  {opportunity.target_tracks?.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full bg-white text-[#1C1917] border border-[#EFE8DC] text-[11px]"
                    >
                      Track: {t}
                    </span>
                  ))}
                  {opportunity.target_batches?.map((b) => (
                    <span
                      key={b}
                      className="px-2 py-0.5 rounded-full bg-white text-[#1C1917] border border-[#EFE8DC] text-[11px]"
                    >
                      Batch: {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Verification & Trust Disclaimer */}
        <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#71695F] space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-[#1C1917]">
            <ShieldCheck className="w-4 h-4 text-[#557B2F]" />
            <span>Admin-Curated & Verified Listing</span>
          </div>
          <p className="leading-relaxed">
            This opportunity is reviewed and published by authorized CourseTracker administrators.
            {opportunity.last_verified_at && (
              <> Last verified on: <span className="font-medium text-[#1C1917]">{opportunity.last_verified_at}</span>.</>
            )}
          </p>
          {opportunity.source_url && (
            <div className="pt-1">
              <a
                href={opportunity.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2C6B9E] hover:underline inline-flex items-center gap-1 text-[11px] font-medium"
              >
                <span>View original primary source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Passed Deadline Warning Banner before CTA */}
        {isDeadlinePassed && (
          <div className="p-3.5 rounded-2xl bg-[#FDF2F4] border border-[#F8CAD4] text-[#A62639] text-xs flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              The application deadline for this cohort has passed. You may still browse the official website for reference or future cycles.
            </span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-2 border-t border-[#EFE8DC] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#71695F]">
            Opportunity ID: <span className="font-mono text-[11px]">{opportunity.id}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-full bg-[#FAF7F0] hover:bg-white text-[#71695F] hover:text-[#1C1917] border border-[#EFE8DC] text-xs font-semibold cursor-pointer transition-colors"
            >
              Close
            </button>

            {opportunity.official_url && opportunity.apply_url && opportunity.official_url !== opportunity.apply_url && (
              <a
                href={opportunity.official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-full bg-white hover:bg-[#FAF7F0] text-[#1C1917] border border-[#EFE8DC] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <span>Official Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {applyLink ? (
              <a
                href={applyLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                  isDeadlinePassed
                    ? 'bg-[#78716C] hover:bg-[#57534E] text-white opacity-85'
                    : 'bg-[#1C1917] hover:bg-[#292524] text-white'
                }`}
              >
                <span>{isDeadlinePassed ? 'View Archive / Official Site' : 'Apply on Official Site'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
};
