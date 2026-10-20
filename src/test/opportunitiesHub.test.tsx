import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import {
  getOpportunities,
  getOpportunitiesForUser,
  createOrUpdateOpportunity,
  archiveOpportunity,
  toggleOpportunityStatus,
  toggleOpportunityFeatured,
  isValidOpportunityUrl,
  resetToDemoData,
  getUsers,
} from '../services/storage';
import { AuthProvider } from '../services/authContext';
import { setRawSessionForTesting, clearActiveSession, AuthSession } from '../services/authService';
import { OpportunitiesHub } from '../components/opportunities/OpportunitiesHub';
import { OpportunityDetailModal } from '../components/opportunities/OpportunityDetailModal';
import { OpportunityCard } from '../components/opportunities/OpportunityCard';
import { AdminOpportunitiesManager } from '../components/admin/AdminOpportunitiesManager';
import { StudentOpportunity, UserProfile } from '../types';

function mockAuthSession(user: UserProfile): void {
  const session: AuthSession = {
    token: `mock-token-${user.id}`,
    userId: user.id,
    role: user.role,
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400000,
  };
  setRawSessionForTesting(session);
}

describe('Opportunities Hub Feature Verification', () => {
  let adminUser: UserProfile;
  let studentUser: UserProfile;
  let facultyUser: UserProfile;
  let campusManagerUser: UserProfile;

  beforeEach(() => {
    resetToDemoData();
    clearActiveSession();
    const users = getUsers();
    adminUser = users.find((u) => u.role === 'admin')!;
    studentUser = users.find((u) => u.role === 'student' && (u.branch_id === 'Ghaziabad' || u.campus_id === 'Ghaziabad')) || users.find((u) => u.role === 'student')!;
    facultyUser = users.find((u) => u.role === 'faculty')!;
    campusManagerUser = users.find((u) => u.role === 'campus_manager')!;
  });

  describe('1. Role Authorization and Permissions', () => {
    it('allows Central Admin to create opportunities', () => {
      const res = createOrUpdateOpportunity(
        {
          title: 'Quantum Computing Hackathon 2026',
          category: 'hackathons',
          organizer: 'National Quantum Mission',
          short_summary: 'Build quantum algorithms on cloud simulators.',
          full_description: 'A 48-hour buildathon open to engineering students across India.',
          official_url: 'https://quantummission.gov.in/hackathon',
          apply_url: 'https://quantummission.gov.in/apply',
          application_deadline: '2026-12-15',
          delivery_format: 'hybrid',
          price_status: 'free',
          target_audience_scope: 'all_students',
          status: 'published',
        },
        adminUser
      );

      expect(res.success).toBe(true);
      expect(res.opportunity).toBeDefined();
      expect(res.opportunity?.title).toBe('Quantum Computing Hackathon 2026');
      expect(res.opportunity?.created_by_name).toBe(adminUser.name);
    });

    it('strictly forbids Faculty and Campus Managers from creating or editing opportunities', () => {
      const facultyRes = createOrUpdateOpportunity(
        {
          title: 'Unauthorized Faculty Opportunity',
          category: 'workshops',
          organizer: 'Faculty Dept',
          short_summary: 'Test',
          full_description: 'Test',
          official_url: 'https://example.org',
        },
        facultyUser
      );
      expect(facultyRes.success).toBe(false);
      expect(facultyRes.error).toContain('Unauthorized');

      const cmRes = createOrUpdateOpportunity(
        {
          title: 'Unauthorized Campus Manager Opportunity',
          category: 'workshops',
          organizer: 'Campus Office',
          short_summary: 'Test',
          full_description: 'Test',
          official_url: 'https://example.org',
        },
        campusManagerUser
      );
      expect(cmRes.success).toBe(false);
      expect(cmRes.error).toContain('Unauthorized');
    });

    it('strictly forbids Faculty and Campus Managers from archiving opportunities', () => {
      const allOpps = getOpportunities();
      const firstId = allOpps[0].id;

      const facultyRes = archiveOpportunity(firstId, facultyUser);
      expect(facultyRes.success).toBe(false);
      expect(facultyRes.error).toContain('Unauthorized');

      const cmRes = archiveOpportunity(firstId, campusManagerUser);
      expect(cmRes.success).toBe(false);
      expect(cmRes.error).toContain('Unauthorized');
    });
  });

  describe('2. URL Validation and Security', () => {
    it('accepts legitimate http:// and https:// URLs', () => {
      expect(isValidOpportunityUrl('https://sih.gov.in')).toBe(true);
      expect(isValidOpportunityUrl('http://in.technology.org/event/2026')).toBe(true);
      expect(isValidOpportunityUrl('https://amazon.jobs/university')).toBe(true);
    });

    it('rejects unsafe, non-web, or malformed URLs', () => {
      expect(isValidOpportunityUrl('javascript:alert(1)')).toBe(false);
      expect(isValidOpportunityUrl('ftp://files.example.com')).toBe(false);
      expect(isValidOpportunityUrl('data:text/html,hack')).toBe(false);
      expect(isValidOpportunityUrl('not-a-valid-url')).toBe(false);
      expect(isValidOpportunityUrl('')).toBe(false);
    });

    it('rejects opportunity creation if official_url is invalid', () => {
      const res = createOrUpdateOpportunity(
        {
          title: 'Malicious Hackathon Link',
          category: 'hackathons',
          organizer: 'Unknown Host',
          short_summary: 'Short summary here',
          full_description: 'Full description here',
          official_url: 'javascript:alert(1)',
        },
        adminUser
      );
      expect(res.success).toBe(false);
      expect(res.error).toContain('Official URL must be a valid http:// or https://');
    });
  });

  describe('3. Admin Status Toggles and Archiving', () => {
    it('toggles publication status and archives without permanent deletion', () => {
      const allOpps = getOpportunities();
      const testOpp = allOpps[0];

      // Unpublish
      const unpubRes = toggleOpportunityStatus(testOpp.id, 'unpublished', adminUser);
      expect(unpubRes.success).toBe(true);
      expect(getOpportunities().find((o) => o.id === testOpp.id)?.status).toBe('unpublished');

      // Archive
      const archiveRes = archiveOpportunity(testOpp.id, adminUser);
      expect(archiveRes.success).toBe(true);
      expect(getOpportunities().find((o) => o.id === testOpp.id)?.status).toBe('archived');

      // Check that history is preserved (still exists in admin database)
      expect(getOpportunities().some((o) => o.id === testOpp.id)).toBe(true);
    });

    it('toggles featured spotlight status', () => {
      const allOpps = getOpportunities();
      const testOpp = allOpps[0];
      const initialFeatured = Boolean(testOpp.featured);

      const toggleRes = toggleOpportunityFeatured(testOpp.id, adminUser);
      expect(toggleRes.success).toBe(true);
      expect(toggleRes.featured).toBe(!initialFeatured);
      expect(getOpportunities().find((o) => o.id === testOpp.id)?.featured).toBe(!initialFeatured);
    });
  });

  describe('4. Student Visibility and Audience Filtering', () => {
    it('only returns published opportunities to students (drafts and archived are hidden)', () => {
      // Create a draft opportunity
      createOrUpdateOpportunity(
        {
          title: 'Draft Secret Hackathon',
          category: 'hackathons',
          organizer: 'Secret Org',
          short_summary: 'Not yet public.',
          full_description: 'Hidden from student view.',
          official_url: 'https://example.org/secret',
          target_audience_scope: 'all_students',
          status: 'draft',
        },
        adminUser
      );

      // Create an archived opportunity
      createOrUpdateOpportunity(
        {
          title: 'Old Archived Hackathon',
          category: 'hackathons',
          organizer: 'Old Org',
          short_summary: 'Historical only.',
          full_description: 'Should not appear to students.',
          official_url: 'https://example.org/old',
          target_audience_scope: 'all_students',
          status: 'archived',
        },
        adminUser
      );

      const studentOpps = getOpportunitiesForUser(studentUser);
      expect(studentOpps.some((o) => o.title === 'Draft Secret Hackathon')).toBe(false);
      expect(studentOpps.some((o) => o.title === 'Old Archived Hackathon')).toBe(false);
      expect(studentOpps.every((o) => o.status === 'published' || o.status === 'open')).toBe(true);
    });

    it('respects targeted campus restrictions', () => {
      // Create Bangalore-only opportunity
      createOrUpdateOpportunity(
        {
          title: 'Bangalore Tech Summit Student Pass',
          category: 'conferences',
          organizer: 'Karnataka Innovation Council',
          short_summary: 'In-person passes for Bangalore campus only.',
          full_description: 'Requires student ID from Bangalore campus.',
          official_url: 'https://bts.karnataka.gov.in',
          target_audience_scope: 'targeted',
          eligible_branches: ['Bangalore'],
          status: 'published',
        },
        adminUser
      );

      // Student from Ghaziabad
      const ghaziabadStudent: UserProfile = {
        ...studentUser,
        branch_id: 'Ghaziabad',
        campus_id: 'Ghaziabad',
      };
      const ghaziabadOpps = getOpportunitiesForUser(ghaziabadStudent);
      expect(ghaziabadOpps.some((o) => o.title === 'Bangalore Tech Summit Student Pass')).toBe(false);

      // Student from Bangalore
      const bangaloreStudent: UserProfile = {
        ...studentUser,
        branch_id: 'Bangalore',
        campus_id: 'Bangalore',
      };
      const bangaloreOpps = getOpportunitiesForUser(bangaloreStudent);
      expect(bangaloreOpps.some((o) => o.title === 'Bangalore Tech Summit Student Pass')).toBe(true);
    });
  });

  describe('5. UI Components & Student Experience', () => {
    it('renders the OpportunitiesHub discovery page with welcoming header', () => {
      // Mock authenticated session
      mockAuthSession(studentUser);

      render(
        <MemoryRouter>
          <AuthProvider>
            <OpportunitiesHub />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Discover Opportunities')).toBeInTheDocument();
      expect(screen.getByText(/Explore curated hackathons, research fellowships/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search by title, organizer/i)).toBeInTheDocument();
      expect(screen.getByText('All Categories')).toBeInTheDocument();
      expect(screen.getAllByText('Hackathons & Innovation').length).toBeGreaterThan(0);
    });

    it('renders OpportunityCard with distinct deadline vs event date labels', () => {
      const mockOpp: StudentOpportunity = {
        id: 'test-card-1',
        title: 'Smart India Hackathon 2026',
        category: 'hackathons',
        organizer: 'Ministry of Education',
        short_summary: 'Premier nationwide hardware and software hackathon.',
        full_description: 'Complete hackathon overview...',
        official_url: 'https://sih.gov.in',
        apply_url: 'https://sih.gov.in/apply',
        application_deadline: '2026-11-20',
        event_start_date: '2026-12-10',
        event_end_date: '2026-12-12',
        delivery_format: 'hybrid',
        price_status: 'free',
        eligibility_requirements: ['Undergraduate students'],
        target_audience_scope: 'all_students',
        eligible_branches: ['Ghaziabad', 'Bangalore', 'Jaipur'],
        featured: true,
        status: 'published',
        created_at: new Date().toISOString(),
      };

      const onViewDetails = vi.fn();

      render(
        <OpportunityCard
          opportunity={mockOpp}
          onViewDetails={onViewDetails}
        />
      );

      expect(screen.getByText('Smart India Hackathon 2026')).toBeInTheDocument();
      expect(screen.getByText('Ministry of Education')).toBeInTheDocument();
      expect(screen.getByText(/Deadline:/i)).toBeInTheDocument();
      expect(screen.getByText(/Event Date:/i)).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();

      fireEvent.click(screen.getByText('View Details'));
      expect(onViewDetails).toHaveBeenCalledWith(mockOpp);
    });

    it('renders OpportunityDetailModal with full description and safe external links', () => {
      const mockOpp: StudentOpportunity = {
        id: 'test-modal-1',
        title: 'Google Summer of Code 2027',
        category: 'open_source',
        organizer: 'Google Open Source',
        short_summary: 'Global program focused on bringing new contributors into open source software development.',
        full_description: 'Full GSoC guidelines and details for students across all universities.',
        official_url: 'https://summerofcode.withgoogle.com',
        apply_url: 'https://summerofcode.withgoogle.com/apply',
        source_url: 'https://opensource.googleblog.com',
        last_verified_at: '2026-10-15',
        application_deadline: '2027-04-02',
        event_start_date: '2027-05-25',
        delivery_format: 'online',
        price_status: 'stipend',
        eligibility: 'Must be 18+ and a university student or open source beginner',
        eligibility_requirements: ['Enrolled university student', 'GitHub account with demo code'],
        target_audience_scope: 'all_students',
        eligible_branches: ['Ghaziabad', 'Bangalore', 'Jaipur'],
        featured: true,
        status: 'published',
        created_at: new Date().toISOString(),
      };

      const onClose = vi.fn();

      render(
        <OpportunityDetailModal
          opportunity={mockOpp}
          isOpen={true}
          onClose={onClose}
        />
      );

      expect(screen.getByText('Google Summer of Code 2027')).toBeInTheDocument();
      expect(screen.getByText('Full GSoC guidelines and details for students across all universities.')).toBeInTheDocument();
      expect(screen.getByText(/Enrolled university student/i)).toBeInTheDocument();
      expect(screen.getByText(/Last verified on:/i)).toBeInTheDocument();

      // Check safe external link
      const applyBtn = screen.getByText('Apply on Official Site').closest('a');
      expect(applyBtn).toHaveAttribute('href', 'https://summerofcode.withgoogle.com/apply');
      expect(applyBtn).toHaveAttribute('target', '_blank');
      expect(applyBtn).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('displays expired warning when application deadline has passed', () => {
      const expiredOpp: StudentOpportunity = {
        id: 'test-expired-1',
        title: 'Past Summer Fellowship 2025',
        category: 'research',
        organizer: 'Old Research Lab',
        short_summary: 'Fellowship that concluded last year.',
        full_description: 'Applications closed long ago.',
        official_url: 'https://example.org/fellowship',
        application_deadline: '2025-01-01', // definitely in the past
        delivery_format: 'in_person',
        price_status: 'stipend',
        eligibility_requirements: ['UG'],
        target_audience_scope: 'all_students',
        eligible_branches: ['Ghaziabad'],
        featured: false,
        status: 'published',
        created_at: new Date().toISOString(),
      };

      render(
        <OpportunityDetailModal
          opportunity={expiredOpp}
          isOpen={true}
          onClose={() => {}}
        />
      );

      expect(screen.getByText(/Deadline Passed \(Applications Closed\)/i)).toBeInTheDocument();
      expect(screen.getByText(/The application deadline for this cohort has passed/i)).toBeInTheDocument();
    });
  });

  describe('6. Admin Management UI', () => {
    it('renders the admin opportunities table and metrics', () => {
      mockAuthSession(adminUser);

      render(
        <MemoryRouter>
          <AuthProvider>
            <AdminOpportunitiesManager />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Opportunities Hub Management')).toBeInTheDocument();
      expect(screen.getByText('Publish New Opportunity')).toBeInTheDocument();
      expect(screen.getByText('Total Listings')).toBeInTheDocument();
      expect(screen.getAllByText('Published').length).toBeGreaterThan(0);
    });
  });

  describe('7. End-to-End Admin Opportunity Posting Lifecycle', () => {
    it('completes the draft -> preview -> publish -> unpublish -> archive lifecycle reactively', () => {
      mockAuthSession(adminUser);

      // 1. Admin creates a new draft opportunity
      const createRes = createOrUpdateOpportunity(
        {
          title: 'ISRO Space Robotics Challenge 2026',
          category: 'hackathons',
          organizer: 'ISRO URSC',
          short_summary: 'Design navigation algorithms for lunar terrain.',
          full_description: 'Comprehensive rover simulation contest for engineering students.',
          official_url: 'https://isro.gov.in/challenge',
          apply_url: 'https://isro.gov.in/challenge/apply',
          application_deadline: '2026-11-30',
          event_start_date: '2026-12-15',
          event_end_date: '2026-12-18',
          delivery_format: 'hybrid',
          price_status: 'free',
          eligibility_requirements: ['Enrolled B.Tech students', 'Good academic standing'],
          target_audience_scope: 'all_students',
          status: 'draft',
        },
        adminUser
      );

      expect(createRes.success).toBe(true);
      const createdId = createRes.opportunity?.id!;
      expect(createdId).toBeDefined();

      // 2. Verify draft is in admin storage but hidden from student portal
      const allOppsAdmin = getOpportunities();
      expect(allOppsAdmin.some((o) => o.id === createdId && o.status === 'draft')).toBe(true);

      const studentVisibleInitial = getOpportunitiesForUser(studentUser);
      expect(studentVisibleInitial.some((o) => o.id === createdId)).toBe(false);

      // 3. Admin publishes the opportunity
      const pubRes = toggleOpportunityStatus(createdId, 'published', adminUser);
      expect(pubRes.success).toBe(true);

      // 4. Now the opportunity is immediately visible in student portal
      const studentVisibleAfterPublish = getOpportunitiesForUser(studentUser);
      const studentFound = studentVisibleAfterPublish.find((o) => o.id === createdId);
      expect(studentFound).toBeDefined();
      expect(studentFound?.title).toBe('ISRO Space Robotics Challenge 2026');

      // 5. Admin updates/edits opportunity details
      const updateRes = createOrUpdateOpportunity(
        {
          id: createdId,
          title: 'ISRO Space Robotics Challenge 2026 (Updated Cohort)',
          short_summary: 'Updated summary for lunar and martian terrain.',
        },
        adminUser
      );
      expect(updateRes.success).toBe(true);

      // Student portal immediately sees the updated title
      const studentVisibleAfterUpdate = getOpportunitiesForUser(studentUser);
      expect(studentVisibleAfterUpdate.find((o) => o.id === createdId)?.title).toBe(
        'ISRO Space Robotics Challenge 2026 (Updated Cohort)'
      );

      // 6. Admin unpublishes the opportunity
      const unpubRes = toggleOpportunityStatus(createdId, 'unpublished', adminUser);
      expect(unpubRes.success).toBe(true);

      const studentVisibleAfterUnpublish = getOpportunitiesForUser(studentUser);
      expect(studentVisibleAfterUnpublish.some((o) => o.id === createdId)).toBe(false);

      // 7. Admin archives the opportunity
      const archiveRes = archiveOpportunity(createdId, adminUser);
      expect(archiveRes.success).toBe(true);

      // Preserved in admin database with status 'archived'
      const archivedOpp = getOpportunities().find((o) => o.id === createdId);
      expect(archivedOpp).toBeDefined();
      expect(archivedOpp?.status).toBe('archived');

      // Still completely hidden from student portal
      expect(getOpportunitiesForUser(studentUser).some((o) => o.id === createdId)).toBe(false);
    });
  });
});
