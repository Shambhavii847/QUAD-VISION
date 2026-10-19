import React, { useState, useMemo } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getOpportunities,
  createOrUpdateOpportunity,
  archiveOpportunity,
  toggleOpportunityStatus,
  toggleOpportunityFeatured,
  isValidOpportunityUrl,
  getCampuses,
  getBatches,
} from '../../services/storage';
import {
  StudentOpportunity,
  OpportunityCategory,
  OpportunityPublicationStatus,
  OpportunityDeliveryFormat,
  OpportunityPriceStatus,
  OPPORTUNITY_CATEGORIES,
} from '../../types';
import { OpportunityDetailModal } from '../opportunities/OpportunityDetailModal';
import { Modal } from '../common/Modal';
import {
  Sparkles,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Archive,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Building2,
  Globe,
  Tag,
  DollarSign,
  Users,
  Shield,
  Layers,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

export const AdminOpportunitiesManager: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();

  // Load all opportunities for admin view
  const [opportunities, setOpportunities] = useState<StudentOpportunity[]>(() => getOpportunities());

  const refreshList = () => {
    setOpportunities(getOpportunities());
  };

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Preview Modal state
  const [previewOpportunity, setPreviewOpportunity] = useState<StudentOpportunity | null>(null);

  // Editor Modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Notifications feedback
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    slug: string;
    category: OpportunityCategory;
    organizer: string;
    short_summary: string;
    full_description: string;
    official_url: string;
    apply_url: string;
    source_url: string;
    last_verified_at: string;
    application_deadline: string;
    event_start_date: string;
    event_end_date: string;
    publication_start_date: string;
    publication_end_date: string;
    delivery_format: OpportunityDeliveryFormat;
    price_status: OpportunityPriceStatus;
    eligibility: string;
    eligibility_requirements: string; // newline separated
    target_audience_scope: 'all_students' | 'targeted';
    target_campuses: string[];
    target_tracks: string[];
    target_batches: string[];
    location: string;
    cover_image_url: string;
    featured: boolean;
    status: OpportunityPublicationStatus;
  }>({
    title: '',
    slug: '',
    category: 'hackathons_innovation',
    organizer: '',
    short_summary: '',
    full_description: '',
    official_url: '',
    apply_url: '',
    source_url: '',
    last_verified_at: new Date().toISOString().split('T')[0],
    application_deadline: '',
    event_start_date: '',
    event_end_date: '',
    publication_start_date: new Date().toISOString().split('T')[0],
    publication_end_date: '',
    delivery_format: 'online',
    price_status: 'free',
    eligibility: '',
    eligibility_requirements: '',
    target_audience_scope: 'all_students',
    target_campuses: [],
    target_tracks: [],
    target_batches: [],
    location: '',
    cover_image_url: '',
    featured: false,
    status: 'published',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const campuses = getCampuses();
  const batches = getBatches();

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: '',
      slug: '',
      category: 'hackathons_innovation',
      organizer: '',
      short_summary: '',
      full_description: '',
      official_url: '',
      apply_url: '',
      source_url: '',
      last_verified_at: new Date().toISOString().split('T')[0],
      application_deadline: '',
      event_start_date: '',
      event_end_date: '',
      publication_start_date: new Date().toISOString().split('T')[0],
      publication_end_date: '',
      delivery_format: 'online',
      price_status: 'free',
      eligibility: '',
      eligibility_requirements: '',
      target_audience_scope: 'all_students',
      target_campuses: [],
      target_tracks: [],
      target_batches: [],
      location: '',
      cover_image_url: '',
      featured: false,
      status: 'published',
    });
    setFormErrors({});
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (opp: StudentOpportunity) => {
    setEditingId(opp.id);
    setFormData({
      title: opp.title,
      slug: opp.slug || '',
      category: opp.category,
      organizer: opp.organizer || opp.organization || '',
      short_summary: opp.short_summary || '',
      full_description: opp.full_description || opp.description || '',
      official_url: opp.official_url || '',
      apply_url: opp.apply_url || '',
      source_url: opp.source_url || '',
      last_verified_at: opp.last_verified_at || '',
      application_deadline: opp.application_deadline || opp.deadline || '',
      event_start_date: opp.event_start_date || '',
      event_end_date: opp.event_end_date || '',
      publication_start_date: opp.publication_start_date || '',
      publication_end_date: opp.publication_end_date || '',
      delivery_format: opp.delivery_format || 'online',
      price_status: opp.price_status || 'free',
      eligibility: opp.eligibility || '',
      eligibility_requirements: (opp.eligibility_requirements || []).join('\n'),
      target_audience_scope: opp.target_audience_scope || 'all_students',
      target_campuses: opp.target_campuses || [],
      target_tracks: opp.target_tracks || [],
      target_batches: opp.target_batches || [],
      location: opp.location || '',
      cover_image_url: opp.cover_image_url || '',
      featured: Boolean(opp.featured),
      status: opp.status || 'published',
    });
    setFormErrors({});
    setIsEditorOpen(true);
  };

  const handleToggleStatus = (oppId: string, newStatus: OpportunityPublicationStatus) => {
    try {
      toggleOpportunityStatus(oppId, newStatus, currentUser);
      refreshList();
      showNotice('success', `Status updated to ${newStatus}`);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to update status');
    }
  };

  const handleToggleFeatured = (oppId: string) => {
    try {
      const opp = toggleOpportunityFeatured(oppId, currentUser);
      refreshList();
      showNotice('success', opp.featured ? 'Marked as featured' : 'Removed from featured');
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to update featured flag');
    }
  };

  const handleArchive = (oppId: string) => {
    if (!window.confirm('Are you sure you want to archive this opportunity? It will be hidden from students while preserving administrative records.')) {
      return;
    }
    try {
      archiveOpportunity(oppId, currentUser);
      refreshList();
      showNotice('success', 'Opportunity archived successfully');
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to archive opportunity');
    }
  };

  const handleSaveOpportunity = (asStatus?: OpportunityPublicationStatus) => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.organizer.trim()) errors.organizer = 'Organizer is required';
    if (!formData.short_summary.trim()) errors.short_summary = 'Short summary is required';
    if (!formData.full_description.trim()) errors.full_description = 'Full description is required';

    if (formData.official_url.trim() && !isValidOpportunityUrl(formData.official_url.trim())) {
      errors.official_url = 'Official URL must be a valid http:// or https:// URL';
    }
    if (formData.apply_url.trim() && !isValidOpportunityUrl(formData.apply_url.trim())) {
      errors.apply_url = 'Application URL must be a valid http:// or https:// URL';
    }
    if (formData.source_url.trim() && !isValidOpportunityUrl(formData.source_url.trim())) {
      errors.source_url = 'Source URL must be a valid http:// or https:// URL';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showNotice('error', 'Please resolve form errors before saving.');
      return;
    }

    try {
      const parsedRequirements = formData.eligibility_requirements
        .split('\n')
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      const payload: Partial<StudentOpportunity> = {
        ...(editingId ? { id: editingId } : {}),
        title: formData.title.trim(),
        slug: formData.slug.trim() || undefined,
        category: formData.category,
        organizer: formData.organizer.trim(),
        short_summary: formData.short_summary.trim(),
        full_description: formData.full_description.trim(),
        official_url: formData.official_url.trim() || undefined,
        apply_url: formData.apply_url.trim() || undefined,
        source_url: formData.source_url.trim() || undefined,
        last_verified_at: formData.last_verified_at.trim() || undefined,
        application_deadline: formData.application_deadline.trim() || undefined,
        event_start_date: formData.event_start_date.trim() || undefined,
        event_end_date: formData.event_end_date.trim() || undefined,
        publication_start_date: formData.publication_start_date.trim() || undefined,
        publication_end_date: formData.publication_end_date.trim() || undefined,
        delivery_format: formData.delivery_format,
        price_status: formData.price_status,
        eligibility: formData.eligibility.trim() || undefined,
        eligibility_requirements: parsedRequirements,
        target_audience_scope: formData.target_audience_scope,
        target_campuses: formData.target_campuses,
        target_tracks: formData.target_tracks,
        target_batches: formData.target_batches,
        location: formData.location.trim() || undefined,
        cover_image_url: formData.cover_image_url.trim() || undefined,
        featured: formData.featured,
        status: asStatus || formData.status,
      };

      createOrUpdateOpportunity(payload, currentUser);
      refreshList();
      setIsEditorOpen(false);
      showNotice('success', editingId ? 'Opportunity updated successfully' : 'Opportunity created successfully');
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to save opportunity');
    }
  };

  // Filtered administrative list
  const filteredList = useMemo(() => {
    return opportunities.filter((opp) => {
      if (filterCategory !== 'all' && opp.category !== filterCategory) return false;
      if (filterStatus !== 'all' && opp.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = opp.title.toLowerCase().includes(q);
        const matchOrg = (opp.organizer || opp.organization || '').toLowerCase().includes(q);
        const matchCat = opp.category.toLowerCase().includes(q);
        return matchTitle || matchOrg || matchCat;
      }
      return true;
    });
  }, [opportunities, filterCategory, filterStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: opportunities.length,
      published: opportunities.filter((o) => o.status === 'published').length,
      draft: opportunities.filter((o) => o.status === 'draft').length,
      scheduled: opportunities.filter((o) => o.status === 'scheduled').length,
      archived: opportunities.filter((o) => o.status === 'archived').length,
      featured: opportunities.filter((o) => o.featured).length,
    };
  }, [opportunities]);

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-2xs transition-all ${
            notification.type === 'success'
              ? 'bg-[#EEF7EF] border-[#C8E8CD] text-[#2D451B]'
              : 'bg-[#FDF2F4] border-[#F8CAD4] text-[#701A4A]'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#557B2F]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#A62639]" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded-md hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="bg-white rounded-3xl p-6 border border-[#EFE8DC] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] px-3 py-0.5 rounded-full bg-[#FAF7F0] text-[#78716C] border border-[#EFE8DC] font-semibold">
              Admin Exclusive Portal
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#EEF7EF] text-[#2D451B] border border-[#C8E8CD] font-semibold flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Central Control
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C1917] tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#C4841D]" />
            <span>Opportunities Hub Management</span>
          </h2>
          <p className="text-xs text-[#78716C] mt-1 max-w-2xl leading-relaxed">
            Publish, curate, schedule, and archive opportunities across all 10 academic and career categories. Campus managers and faculty are restricted from modifying this central directory.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-full bg-[#1C1917] hover:bg-[#292524] text-white text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all cursor-pointer self-start md:self-center whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Publish New Opportunity</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#EFE8DC] shadow-2xs">
          <div className="text-[11px] text-[#78716C] font-medium">Total Listings</div>
          <div className="text-xl font-extrabold text-[#1C1917] mt-0.5">{stats.total}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#EFE8DC] shadow-2xs">
          <div className="text-[11px] text-[#2D451B] font-medium">Published</div>
          <div className="text-xl font-extrabold text-[#557B2F] mt-0.5">{stats.published}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#EFE8DC] shadow-2xs">
          <div className="text-[11px] text-[#8C5E00] font-medium">Featured</div>
          <div className="text-xl font-extrabold text-[#C4841D] mt-0.5">{stats.featured}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#EFE8DC] shadow-2xs">
          <div className="text-[11px] text-[#78716C] font-medium">Drafts</div>
          <div className="text-xl font-extrabold text-[#78716C] mt-0.5">{stats.draft}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#EFE8DC] shadow-2xs">
          <div className="text-[11px] text-[#1B4D7E] font-medium">Scheduled</div>
          <div className="text-xl font-extrabold text-[#1B4D7E] mt-0.5">{stats.scheduled}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#EFE8DC] shadow-2xs">
          <div className="text-[11px] text-[#701A4A] font-medium">Archived</div>
          <div className="text-xl font-extrabold text-[#701A4A] mt-0.5">{stats.archived}</div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EFE8DC] shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9C9387] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, organizer, or category..."
              className="w-full pl-10 pr-4 py-2 rounded-full bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#1C1917] placeholder-[#9C9387] focus:outline-none focus:border-[#C4841D]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-full bg-[#FAF7F0] border border-[#EFE8DC] text-xs font-medium text-[#1C1917] focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {OPPORTUNITY_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-full bg-[#FAF7F0] border border-[#EFE8DC] text-xs font-medium text-[#1C1917] focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="unpublished">Unpublished</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table / Cards View */}
      <div className="bg-white rounded-3xl border border-[#EFE8DC] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1C1917]">
            <thead className="bg-[#FAF7F0] border-b border-[#EFE8DC] text-[#71695F] font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Opportunity</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Format & Cost</th>
                <th className="px-4 py-3.5">Key Dates</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-center">Featured</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DC]/80">
              {filteredList.length > 0 ? (
                filteredList.map((opp) => {
                  const catMeta = OPPORTUNITY_CATEGORIES.find((c) => c.id === opp.category);
                  const isDeadlinePassed = opp.application_deadline
                    ? new Date(opp.application_deadline).getTime() < new Date().getTime()
                    : false;

                  return (
                    <tr key={opp.id} className="hover:bg-[#FAF7F0]/40 transition-colors">
                      {/* Title & Organizer */}
                      <td className="px-5 py-4 max-w-[280px]">
                        <div className="font-bold text-sm text-[#1C1917] line-clamp-1">
                          {opp.title}
                        </div>
                        <div className="text-xs text-[#71695F] flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-[#9C9387]" />
                          <span className="truncate">{opp.organizer || opp.organization}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            catMeta
                              ? `${catMeta.badgeBg} ${catMeta.badgeText} ${catMeta.badgeBorder}`
                              : 'bg-[#FAF7F0] text-[#71695F] border-[#EFE8DC]'
                          }`}
                        >
                          {catMeta?.name || opp.category}
                        </span>
                      </td>

                      {/* Format & Cost */}
                      <td className="px-4 py-4 whitespace-nowrap space-y-1">
                        <div className="text-[11px] font-medium capitalize text-[#44403C]">
                          {opp.delivery_format?.replace('_', ' ')}
                        </div>
                        <div className="text-[10px] text-[#71695F] capitalize">
                          {opp.price_status}
                        </div>
                      </td>

                      {/* Key Dates */}
                      <td className="px-4 py-4 whitespace-nowrap space-y-1">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className={`w-3 h-3 ${isDeadlinePassed ? 'text-[#A62639]' : 'text-[#C4841D]'}`} />
                          <span className={isDeadlinePassed ? 'text-[#A62639] font-semibold' : 'text-[#44403C]'}>
                            {opp.application_deadline ? opp.application_deadline.split('T')[0] : 'Rolling'}
                          </span>
                        </div>
                        {opp.event_start_date && (
                          <div className="flex items-center gap-1 text-[10px] text-[#71695F]">
                            <Calendar className="w-3 h-3 text-[#2C6B9E]" />
                            <span>Event: {opp.event_start_date.split('T')[0]}</span>
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <select
                          value={opp.status}
                          onChange={(e) => handleToggleStatus(opp.id, e.target.value as any)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${
                            opp.status === 'published'
                              ? 'bg-[#EEF7EF] text-[#2D451B] border-[#C8E8CD]'
                              : opp.status === 'draft'
                              ? 'bg-[#FAF7F0] text-[#71695F] border-[#EFE8DC]'
                              : opp.status === 'scheduled'
                              ? 'bg-[#EBF5FB] text-[#1B4D7E] border-[#CFE5F7]'
                              : 'bg-[#FDF2F4] text-[#701A4A] border-[#F8CAD4]'
                          }`}
                        >
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="unpublished">Unpublished</option>
                          <option value="archived">Archived</option>
                        </select>
                      </td>

                      {/* Featured Toggle */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleToggleFeatured(opp.id)}
                          className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                            opp.featured
                              ? 'bg-[#FFF3D6] text-[#8C5E00] border-[#FBD989]'
                              : 'bg-[#FAF7F0] text-[#9C9387] border-[#EFE8DC] hover:text-[#1C1917]'
                          }`}
                          title={opp.featured ? 'Featured on student page' : 'Click to feature'}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewOpportunity(opp)}
                            className="p-1.5 rounded-lg text-[#71695F] hover:text-[#1C1917] hover:bg-[#FAF7F0] border border-transparent hover:border-[#EFE8DC] cursor-pointer"
                            title="Preview Student View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(opp)}
                            className="p-1.5 rounded-lg text-[#71695F] hover:text-[#1C1917] hover:bg-[#FAF7F0] border border-transparent hover:border-[#EFE8DC] cursor-pointer"
                            title="Edit Opportunity"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleArchive(opp.id)}
                            className="p-1.5 rounded-lg text-[#701A4A] hover:bg-[#FDF2F4] border border-transparent hover:border-[#F8CAD4] cursor-pointer"
                            title="Archive Opportunity"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs text-[#71695F]">
                    No opportunities match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal for Create / Edit */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingId ? 'Edit Opportunity' : 'Publish New Opportunity'}
        description="Fill out official details. All links and deadlines will be validated before publication."
        maxWidth="3xl"
      >
        <div className="space-y-5 -mt-2">
          {/* General Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#71695F]">
              Basic Opportunity Details
            </h4>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                Opportunity Title <span className="text-[#A62639]">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Smart India Hackathon 2026"
                className={`w-full px-3.5 py-2 rounded-xl bg-[#FAF7F0] border text-xs text-[#1C1917] focus:outline-none focus:bg-white ${
                  formErrors.title ? 'border-[#A62639]' : 'border-[#EFE8DC] focus:border-[#C4841D]'
                }`}
              />
              {formErrors.title && (
                <p className="text-[11px] text-[#A62639] mt-0.5">{formErrors.title}</p>
              )}
            </div>

            {/* Category & Organizer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Category <span className="text-[#A62639]">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as OpportunityCategory })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#1C1917] focus:outline-none focus:border-[#C4841D] cursor-pointer"
                >
                  {OPPORTUNITY_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Organizer / Host <span className="text-[#A62639]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.organizer}
                  onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                  placeholder="e.g. Ministry of Education & AICTE"
                  className={`w-full px-3.5 py-2 rounded-xl bg-[#FAF7F0] border text-xs text-[#1C1917] focus:outline-none focus:bg-white ${
                    formErrors.organizer ? 'border-[#A62639]' : 'border-[#EFE8DC] focus:border-[#C4841D]'
                  }`}
                />
                {formErrors.organizer && (
                  <p className="text-[11px] text-[#A62639] mt-0.5">{formErrors.organizer}</p>
                )}
              </div>
            </div>

            {/* Short Summary */}
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                Short Summary (Card Synopsis) <span className="text-[#A62639]">*</span>
              </label>
              <textarea
                rows={2}
                value={formData.short_summary}
                onChange={(e) => setFormData({ ...formData, short_summary: e.target.value })}
                placeholder="A concise 1-2 sentence overview shown on the discovery card..."
                className={`w-full px-3.5 py-2 rounded-xl bg-[#FAF7F0] border text-xs text-[#1C1917] focus:outline-none focus:bg-white ${
                  formErrors.short_summary ? 'border-[#A62639]' : 'border-[#EFE8DC] focus:border-[#C4841D]'
                }`}
              />
              {formErrors.short_summary && (
                <p className="text-[11px] text-[#A62639] mt-0.5">{formErrors.short_summary}</p>
              )}
            </div>

            {/* Full Description */}
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                Full Description <span className="text-[#A62639]">*</span>
              </label>
              <textarea
                rows={4}
                value={formData.full_description}
                onChange={(e) => setFormData({ ...formData, full_description: e.target.value })}
                placeholder="Comprehensive details, rounds, tracks, incentives, and instructions..."
                className={`w-full px-3.5 py-2 rounded-xl bg-[#FAF7F0] border text-xs text-[#1C1917] focus:outline-none focus:bg-white ${
                  formErrors.full_description ? 'border-[#A62639]' : 'border-[#EFE8DC] focus:border-[#C4841D]'
                }`}
              />
              {formErrors.full_description && (
                <p className="text-[11px] text-[#A62639] mt-0.5">{formErrors.full_description}</p>
              )}
            </div>
          </div>

          {/* Dates & Timeline */}
          <div className="space-y-4 pt-3 border-t border-[#EFE8DC]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#71695F]">
              Dates & Timeline (Deadlines vs Events)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Application Deadline
                </label>
                <input
                  type="date"
                  value={formData.application_deadline}
                  onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#1C1917] focus:outline-none focus:border-[#C4841D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Event Start Date
                </label>
                <input
                  type="date"
                  value={formData.event_start_date}
                  onChange={(e) => setFormData({ ...formData, event_start_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#1C1917] focus:outline-none focus:border-[#C4841D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Event End Date
                </label>
                <input
                  type="date"
                  value={formData.event_end_date}
                  onChange={(e) => setFormData({ ...formData, event_end_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#1C1917] focus:outline-none focus:border-[#C4841D]"
                />
              </div>
            </div>
          </div>

          {/* Delivery Format & Pricing */}
          <div className="space-y-4 pt-3 border-t border-[#EFE8DC]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#71695F]">
              Delivery, Pricing & Location
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Delivery Format
                </label>
                <select
                  value={formData.delivery_format}
                  onChange={(e) => setFormData({ ...formData, delivery_format: e.target.value as OpportunityDeliveryFormat })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#1C1917] focus:outline-none focus:border-[#C4841D] cursor-pointer"
                >
                  <option value="online">Online / Virtual</option>
                  <option value="in_person">In-Person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Cost / Price Status
                </label>
                <select
                  value={formData.price_status}
                  onChange={(e) => setFormData({ ...formData, price_status: e.target.value as OpportunityPriceStatus })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#1C1917] focus:outline-none focus:border-[#C4841D] cursor-pointer"
                >
                  <option value="free">Free</option>
                  <option value="stipend">Stipend Offered</option>
                  <option value="paid">Fee Required</option>
                  <option value="unknown">Unknown / Not Specified</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Location (Venue / City)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Pragati Maidan, New Delhi"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#1C1917] focus:outline-none focus:border-[#C4841D]"
                />
              </div>
            </div>
          </div>

          {/* Eligibility & Audience Scope */}
          <div className="space-y-4 pt-3 border-t border-[#EFE8DC]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#71695F]">
              Eligibility & Audience Targeting
            </h4>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                Eligibility Summary
              </label>
              <input
                type="text"
                value={formData.eligibility}
                onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                placeholder="e.g. Open to all B.Tech / BCA undergraduate students"
                className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#1C1917] focus:outline-none focus:border-[#C4841D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                Eligibility Checklist (one per line)
              </label>
              <textarea
                rows={3}
                value={formData.eligibility_requirements}
                onChange={(e) => setFormData({ ...formData, eligibility_requirements: e.target.value })}
                placeholder="Valid college ID card&#10;Teams of 3 to 6 students&#10;At least one female member recommended"
                className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#1C1917] focus:outline-none focus:border-[#C4841D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                Target Audience Scope
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#1C1917]">
                  <input
                    type="radio"
                    name="target_scope"
                    checked={formData.target_audience_scope === 'all_students'}
                    onChange={() => setFormData({ ...formData, target_audience_scope: 'all_students' })}
                    className="text-[#1C1917] focus:ring-[#C4841D]"
                  />
                  <span>All Students (Open across all campuses, tracks and batches)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#1C1917]">
                  <input
                    type="radio"
                    name="target_scope"
                    checked={formData.target_audience_scope === 'targeted'}
                    onChange={() => setFormData({ ...formData, target_audience_scope: 'targeted' })}
                    className="text-[#1C1917] focus:ring-[#C4841D]"
                  />
                  <span>Targeted (Specific campuses / tracks)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Official URLs & Verification */}
          <div className="space-y-4 pt-3 border-t border-[#EFE8DC]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#71695F]">
              Verified Official Links & Audit Trail
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Official Event / Program Website
                </label>
                <input
                  type="url"
                  value={formData.official_url}
                  onChange={(e) => setFormData({ ...formData, official_url: e.target.value })}
                  placeholder="https://example.org/event"
                  className={`w-full px-3.5 py-2 rounded-xl bg-[#FAF7F0] border text-xs text-[#1C1917] focus:outline-none focus:bg-white ${
                    formErrors.official_url ? 'border-[#A62639]' : 'border-[#EFE8DC] focus:border-[#C4841D]'
                  }`}
                />
                {formErrors.official_url && (
                  <p className="text-[11px] text-[#A62639] mt-0.5">{formErrors.official_url}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Application / Registration Link
                </label>
                <input
                  type="url"
                  value={formData.apply_url}
                  onChange={(e) => setFormData({ ...formData, apply_url: e.target.value })}
                  placeholder="https://example.org/apply"
                  className={`w-full px-3.5 py-2 rounded-xl bg-[#FAF7F0] border text-xs text-[#1C1917] focus:outline-none focus:bg-white ${
                    formErrors.apply_url ? 'border-[#A62639]' : 'border-[#EFE8DC] focus:border-[#C4841D]'
                  }`}
                />
                {formErrors.apply_url && (
                  <p className="text-[11px] text-[#A62639] mt-0.5">{formErrors.apply_url}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Source / Verification Reference URL
                </label>
                <input
                  type="url"
                  value={formData.source_url}
                  onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                  placeholder="https://pib.gov.in/press-release"
                  className={`w-full px-3.5 py-2 rounded-xl bg-[#FAF7F0] border text-xs text-[#1C1917] focus:outline-none focus:bg-white ${
                    formErrors.source_url ? 'border-[#A62639]' : 'border-[#EFE8DC] focus:border-[#C4841D]'
                  }`}
                />
                {formErrors.source_url && (
                  <p className="text-[11px] text-[#A62639] mt-0.5">{formErrors.source_url}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Last Verified Date
                </label>
                <input
                  type="date"
                  value={formData.last_verified_at}
                  onChange={(e) => setFormData({ ...formData, last_verified_at: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs text-[#1C1917] focus:outline-none focus:border-[#C4841D]"
                />
              </div>
            </div>
          </div>

          {/* Publishing Controls */}
          <div className="space-y-3 pt-3 border-t border-[#EFE8DC]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#71695F]">
              Publication Status & Spotlight
            </h4>

            <div className="flex flex-wrap items-center gap-6">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Publication Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as OpportunityPublicationStatus })}
                  className="px-3.5 py-2 rounded-xl bg-[#FAF7F0] border border-[#EFE8DC] text-xs font-medium text-[#1C1917] focus:outline-none cursor-pointer"
                >
                  <option value="published">Published (Visible to students immediately)</option>
                  <option value="draft">Draft (Private admin preview only)</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="unpublished">Unpublished</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="pt-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="rounded border-[#D6CEC1] text-[#1C1917] focus:ring-[#C4841D]"
                  />
                  <span className="text-xs font-bold text-[#8C5E00] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#C4841D]" />
                    Featured Spotlight on Student Page
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-[#EFE8DC] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="px-4 py-2 rounded-full bg-[#FAF7F0] hover:bg-white text-[#71695F] hover:text-[#1C1917] border border-[#EFE8DC] text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleSaveOpportunity('draft')}
                className="px-4 py-2 rounded-full bg-white hover:bg-[#FAF7F0] text-[#71695F] hover:text-[#1C1917] border border-[#EFE8DC] text-xs font-semibold transition-colors cursor-pointer"
              >
                Save as Draft
              </button>

              <button
                type="button"
                onClick={() => handleSaveOpportunity('published')}
                className="px-5 py-2 rounded-full bg-[#1C1917] hover:bg-[#292524] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {editingId ? 'Update & Publish' : 'Publish Opportunity'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Admin Preview Modal */}
      <OpportunityDetailModal
        opportunity={previewOpportunity}
        isOpen={Boolean(previewOpportunity)}
        onClose={() => setPreviewOpportunity(null)}
        isPreview={true}
      />
    </div>
  );
};
