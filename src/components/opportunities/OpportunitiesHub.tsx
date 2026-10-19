import React, { useState, useMemo } from 'react';
import { useAuth } from '../../services/authContext';
import { getOpportunitiesForUser } from '../../services/storage';
import {
  StudentOpportunity,
  OpportunityCategory,
  OPPORTUNITY_CATEGORIES,
} from '../../types';
import { OpportunityCard } from './OpportunityCard';
import { OpportunityDetailModal } from './OpportunityDetailModal';
import {
  Sparkles,
  Search,
  Filter,
  SlidersHorizontal,
  Calendar,
  Clock,
  Compass,
  AlertCircle,
  X,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export const OpportunitiesHub: React.FC = () => {
  const { currentUser } = useAuth();

  // Load audience-filtered opportunities for this user
  const opportunities = useMemo(() => {
    return getOpportunitiesForUser(currentUser);
  }, [currentUser]);

  // Search & Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedPrice, setSelectedPrice] = useState<string>('all');
  const [hideExpired, setHideExpired] = useState(false);
  const [sortBy, setSortBy] = useState<'deadline' | 'event_date' | 'recent' | 'title'>('deadline');

  // Selected opportunity for detail modal
  const [selectedOpportunity, setSelectedOpportunity] = useState<StudentOpportunity | null>(null);

  const now = new Date();

  // Upcoming deadlines in the next 14 days
  const upcomingDeadlines = useMemo(() => {
    return opportunities.filter((o) => {
      if (!o.application_deadline) return false;
      const d = new Date(o.application_deadline);
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 14;
    }).sort((a, b) => {
      const da = new Date(a.application_deadline!).getTime();
      const db = new Date(b.application_deadline!).getTime();
      return da - db;
    });
  }, [opportunities, now]);

  // Featured opportunities
  const featuredOpportunities = useMemo(() => {
    return opportunities.filter((o) => o.featured);
  }, [opportunities]);

  // Filtered & sorted opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities
      .filter((opp) => {
        // Category filter
        if (selectedCategory !== 'all' && opp.category !== selectedCategory) {
          return false;
        }

        // Format filter
        if (selectedFormat !== 'all' && opp.delivery_format !== selectedFormat) {
          return false;
        }

        // Price filter
        if (selectedPrice !== 'all' && opp.price_status !== selectedPrice) {
          return false;
        }

        // Expired deadline filter
        if (hideExpired && opp.application_deadline) {
          const d = new Date(opp.application_deadline);
          if (d.getTime() < now.getTime()) {
            return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = opp.title.toLowerCase().includes(q);
          const matchOrg = (opp.organizer || opp.organization || '').toLowerCase().includes(q);
          const matchSummary = (opp.short_summary || opp.description || '').toLowerCase().includes(q);
          const matchCategory = opp.category.toLowerCase().includes(q);
          const matchLocation = (opp.location || '').toLowerCase().includes(q);
          return matchTitle || matchOrg || matchSummary || matchCategory || matchLocation;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          if (!a.application_deadline) return 1;
          if (!b.application_deadline) return -1;
          return new Date(a.application_deadline).getTime() - new Date(b.application_deadline).getTime();
        }
        if (sortBy === 'event_date') {
          if (!a.event_start_date) return 1;
          if (!b.event_start_date) return -1;
          return new Date(a.event_start_date).getTime() - new Date(b.event_start_date).getTime();
        }
        if (sortBy === 'recent') {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [opportunities, selectedCategory, selectedFormat, selectedPrice, hideExpired, searchQuery, sortBy, now]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: opportunities.length };
    OPPORTUNITY_CATEGORIES.forEach((cat) => {
      counts[cat.id] = opportunities.filter((o) => o.category === cat.id).length;
    });
    return counts;
  }, [opportunities]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedFormat('all');
    setSelectedPrice('all');
    setHideExpired(false);
    setSortBy('deadline');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCategory !== 'all' ||
    selectedFormat !== 'all' ||
    selectedPrice !== 'all' ||
    hideExpired;

  return (
    <div className="space-y-7 pb-10">
      {/* Editorial Welcoming Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-[#FAF7F0] to-[#F7EFE1] rounded-[32px] p-6 sm:p-8 lg:p-10 border border-[#EFE8DC] shadow-xs">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#EFE8DC] shadow-2xs mb-3 text-xs font-semibold text-[#8C5E00]">
            <Sparkles className="w-3.5 h-3.5 text-[#C4841D]" />
            <span>Curated Opportunities Hub</span>
            <span className="text-[#C4841D] font-bold">&bull;</span>
            <span className="text-[#71695F]">Admin Verified</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1C1917] tracking-tight leading-tight">
            Discover Opportunities
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-[#57534E] leading-relaxed max-w-2xl font-normal">
            Explore curated hackathons, research fellowships, industry summits, open-source projects, and scholarships. Learn, build, publish, and connect with premier academic and professional communities.
          </p>

          {/* Quick Metrics Strip */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-6 pt-5 border-t border-[#EFE8DC]/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-[#1C1917]">{opportunities.length}</span>
              <span className="text-[#71695F]">Active Curated Listings</span>
            </div>
            <div className="h-4 w-px bg-[#D6CEC1]/60 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-[#557B2F]">{upcomingDeadlines.length}</span>
              <span className="text-[#71695F]">Upcoming Deadlines (Next 14d)</span>
            </div>
            <div className="h-4 w-px bg-[#D6CEC1]/60 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-[#8C5E00]">{featuredOpportunities.length}</span>
              <span className="text-[#71695F]">Featured Spotlights</span>
            </div>
          </div>
        </div>

        {/* Ambient Pastel Background Glow */}
        <div className="absolute -top-12 -right-12 w-80 h-80 rounded-full bg-gradient-to-br from-[#FBE69B]/40 to-[#F8CAD4]/20 blur-3xl pointer-events-none" />
      </div>

      {/* Upcoming Deadlines Strip (Alert Banner) */}
      {upcomingDeadlines.length > 0 && (
        <div className="bg-[#FFF9E6] border border-[#FBE69B] rounded-2xl p-4 sm:p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-white text-[#C4841D] shadow-2xs shrink-0 border border-[#FBE69B]/60">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#1C1917]">
                Approaching Deadlines This Week
              </h4>
              <p className="text-xs text-[#7A5400]">
                {upcomingDeadlines.length} {upcomingDeadlines.length === 1 ? 'opportunity requires' : 'opportunities require'} submission soon. Review eligibility and apply early.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {upcomingDeadlines.slice(0, 3).map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedOpportunity(item)}
                className="px-3 py-1 rounded-full bg-white hover:bg-[#FAF7F0] text-[#1C1917] border border-[#FBE69B] text-xs font-semibold transition-colors cursor-pointer truncate max-w-[200px]"
                title={item.title}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search & Comprehensive Filters Bar */}
      <div className="bg-white rounded-3xl p-5 border border-[#EFE8DC] shadow-2xs space-y-4">
        {/* Top Search & Primary Dropdowns */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9C9387] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, organizer (e.g. AWS, SIH, ACM), keywords or location..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#1C1917] placeholder-[#9C9387] focus:outline-none focus:border-[#C4841D] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-[#9C9387] hover:text-[#1C1917]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Format Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="px-3.5 py-2.5 rounded-full bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#1C1917] font-medium focus:outline-none focus:border-[#C4841D] cursor-pointer"
            >
              <option value="all">Format: All Delivery Modes</option>
              <option value="online">Online / Virtual</option>
              <option value="in_person">In-Person</option>
              <option value="hybrid">Hybrid</option>
            </select>

            {/* Price Dropdown */}
            <select
              value={selectedPrice}
              onChange={(e) => setSelectedPrice(e.target.value)}
              className="px-3.5 py-2.5 rounded-full bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#1C1917] font-medium focus:outline-none focus:border-[#C4841D] cursor-pointer"
            >
              <option value="all">Cost: All Types</option>
              <option value="free">Free / Zero Cost</option>
              <option value="stipend">Stipend / Paid Internship</option>
              <option value="paid">Fee Required</option>
            </select>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FAF7F0] border border-[#EFE8DC]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#71695F]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-[#1C1917] font-medium focus:outline-none cursor-pointer"
              >
                <option value="deadline">Sort: Application Deadline</option>
                <option value="event_date">Sort: Event Date</option>
                <option value="recent">Sort: Recently Published</option>
                <option value="title">Sort: Title (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills Strip */}
        <div className="pt-2 border-t border-[#EFE8DC]/80">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-[#1C1917] text-white shadow-xs'
                  : 'bg-[#FAF7F0] text-[#71695F] hover:text-[#1C1917] hover:bg-white border border-[#EFE8DC]'
              }`}
            >
              <span>All Categories</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-[#EFE8DC] text-[#71695F]'
                }`}
              >
                {categoryCounts.all || 0}
              </span>
            </button>

            {OPPORTUNITY_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? `${cat.badgeBg} ${cat.badgeText} border ${cat.badgeBorder} shadow-xs ring-1 ring-[#1C1917]/20`
                      : 'bg-[#FAF7F0] text-[#71695F] hover:text-[#1C1917] hover:bg-white border border-[#EFE8DC]'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-black/10 text-current' : 'bg-[#EFE8DC] text-[#71695F]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Toggles & Clear Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-[#71695F]">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideExpired}
              onChange={(e) => setHideExpired(e.target.checked)}
              className="rounded border-[#D6CEC1] text-[#1C1917] focus:ring-[#C4841D] cursor-pointer"
            />
            <span className="font-medium">Hide opportunities with past deadlines</span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#8C5E00] hover:text-[#1C1917] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Featured Spotlight Section (when viewing 'all' categories or when featured exist) */}
      {selectedCategory === 'all' && !searchQuery && featuredOpportunities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C4841D]" />
              <h3 className="text-sm font-bold text-[#1C1917] tracking-tight uppercase tracking-wider">
                Featured Highlights
              </h3>
            </div>
            <span className="text-xs text-[#71695F]">Handpicked flagship programs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredOpportunities.map((opp) => (
              <OpportunityCard
                key={`featured-${opp.id}`}
                opportunity={opp}
                onViewDetails={setSelectedOpportunity}
                isFeaturedSpotlight={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Opportunities Grid Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#1C1917]" />
            <h3 className="text-sm font-bold text-[#1C1917] tracking-tight uppercase tracking-wider">
              {selectedCategory === 'all'
                ? 'All Opportunities Catalogue'
                : OPPORTUNITY_CATEGORIES.find((c) => c.id === selectedCategory)?.name || 'Filtered Opportunities'}
            </h3>
          </div>
          <span className="text-xs text-[#71695F]">
            Showing <span className="font-bold text-[#1C1917]">{filteredOpportunities.length}</span> listings
          </span>
        </div>

        {/* Cards Grid */}
        {filteredOpportunities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOpportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                onViewDetails={setSelectedOpportunity}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-3xl p-10 sm:p-12 border border-[#EFE8DC] text-center space-y-4 shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF7F0] border border-[#EFE8DC] text-[#9C9387] flex items-center justify-center mx-auto shadow-2xs">
              <Search className="w-7 h-7 stroke-[1.5]" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h4 className="text-base font-bold text-[#1C1917]">No opportunities match your filters</h4>
              <p className="text-xs text-[#71695F] leading-relaxed">
                We couldn't find any opportunities matching your current search or category criteria. Try broadening your filters or resetting search keywords.
              </p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-full bg-[#1C1917] hover:bg-[#292524] text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
              >
                Reset Filters & Show All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Student Opportunity Detail Modal */}
      <OpportunityDetailModal
        opportunity={selectedOpportunity}
        isOpen={Boolean(selectedOpportunity)}
        onClose={() => setSelectedOpportunity(null)}
      />
    </div>
  );
};
