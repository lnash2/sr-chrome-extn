import type { LookupRequest, MatchResponse, CandidateMatch } from './types';

const FIXTURES: Record<string, MatchResponse> = {
  single_phone: {
    matches: [
      {
        candidate_id: 10421,
        confidence: 'exact_phone',
        name: 'James Whitfield',
        active_status: 'active',
        registered_at: '2024-03-12T00:00:00Z',
        recruiter_name: 'Sarah Connor',
        resourcer_name: 'Alex Morgan',
        marked_unsuitable: false,
        unsuitable_reason: null,
        marked_for_deletion: false,
        licence_categories: [
          { category: 'C', expiry_date: '2028-11-20' },
          { category: 'C+E', expiry_date: '2026-08-15' },
        ],
        licence_points: 3,
        job_categories: ['HGV Class 1', 'HGV Class 2'],
        last_booking: {
          date: '2026-06-10T00:00:00Z',
          client_name: 'DHL Supply Chain',
          status: 'approved',
        },
        company_booking_count: 14,
        agency_booking_count: 3,
        last_note: {
          text: 'Spoke with James — available for night shifts from next week. Prefers temp-to-perm roles. Has own PPE and is ADR trained.',
          created_at: '2026-07-15T10:30:00Z',
          author: 'Sarah Connor',
        },
        last_contact_date: '2026-07-15T10:30:00Z',
        available_this_week: true,
        next_availability_date: null,
        engagement: {
          health: 'Warm',
          funnel_stage: 'Active placement',
          response_rate: 0.85,
        },
        phone_number: '+447712345678',
        postcode: 'CB10 1SA',
      },
    ],
    metadata: { duration_ms: 38 },
  },

  single_email: {
    matches: [
      {
        candidate_id: 20587,
        confidence: 'exact_email',
        name: 'Rebecca Thompson',
        active_status: 'inactive',
        registered_at: '2025-01-08T00:00:00Z',
        recruiter_name: null,
        resourcer_name: null,
        marked_unsuitable: false,
        unsuitable_reason: null,
        marked_for_deletion: false,
        licence_categories: [
          { category: 'B', expiry_date: '2029-08-01' },
        ],
        licence_points: 0,
        job_categories: ['Van Driver'],
        last_booking: null,
        company_booking_count: 0,
        agency_booking_count: 0,
        last_note: null,
        last_contact_date: null,
        available_this_week: false,
        next_availability_date: '2026-08-04T00:00:00Z',
        engagement: null,
        phone_number: '+447898765432',
        postcode: 'LS2 7HY',
      },
    ],
    metadata: { duration_ms: 25 },
  },

  multiple: {
    matches: [
      {
        candidate_id: 30112,
        confidence: 'exact_phone',
        name: 'David Smith',
        active_status: 'active',
        registered_at: '2023-09-14T00:00:00Z',
        recruiter_name: 'Tom Bradley',
        resourcer_name: 'Alex Morgan',
        marked_unsuitable: false,
        unsuitable_reason: null,
        marked_for_deletion: false,
        licence_categories: [
          { category: 'C', expiry_date: '2027-05-10' },
          { category: 'C+E', expiry_date: '2027-05-10' },
        ],
        licence_points: 0,
        job_categories: ['HGV Class 1', 'HGV Class 2', 'HIAB'],
        last_booking: {
          date: '2026-07-01T00:00:00Z',
          client_name: 'XPO Logistics',
          status: 'approved',
        },
        company_booking_count: 22,
        agency_booking_count: 5,
        last_note: {
          text: 'Reliable driver, always on time. Has HIAB ticket and is happy to do weekend work.',
          created_at: '2026-06-28T14:00:00Z',
          author: 'Tom Bradley',
        },
        last_contact_date: '2026-07-01T00:00:00Z',
        available_this_week: true,
        next_availability_date: null,
        engagement: {
          health: 'Hot',
          funnel_stage: 'Active placement',
          response_rate: 0.92,
        },
        phone_number: '+447555123456',
        postcode: 'B1 1BB',
      },
      {
        candidate_id: 30298,
        confidence: 'name_location',
        name: 'Dave Smith',
        active_status: 'active',
        registered_at: '2024-11-02T00:00:00Z',
        recruiter_name: 'Sarah Connor',
        resourcer_name: null,
        marked_unsuitable: false,
        unsuitable_reason: null,
        marked_for_deletion: false,
        licence_categories: [
          { category: 'C', expiry_date: '2026-01-15' },
        ],
        licence_points: 6,
        job_categories: ['HGV Class 2'],
        last_booking: {
          date: '2025-12-20T00:00:00Z',
          client_name: null,
          status: 'approved',
        },
        company_booking_count: 4,
        agency_booking_count: 0,
        last_note: null,
        last_contact_date: '2025-12-20T00:00:00Z',
        available_this_week: false,
        next_availability_date: '2026-08-11T00:00:00Z',
        engagement: {
          health: 'Cold',
          funnel_stage: 'Registered',
          response_rate: 0.3,
        },
        phone_number: '+447555654321',
        postcode: 'B1 3AD',
      },
    ],
    metadata: { duration_ms: 61 },
  },

  unsuitable: {
    matches: [
      {
        candidate_id: 40033,
        confidence: 'exact_email',
        name: 'Mark Jenkins',
        active_status: 'inactive',
        registered_at: '2022-06-01T00:00:00Z',
        recruiter_name: 'Tom Bradley',
        resourcer_name: null,
        marked_unsuitable: true,
        unsuitable_reason: 'Failed drug test — site banned 2024-11',
        marked_for_deletion: false,
        licence_categories: [
          { category: 'C', expiry_date: '2025-04-01' },
        ],
        licence_points: 9,
        job_categories: ['HGV Class 2'],
        last_booking: {
          date: '2024-11-05T00:00:00Z',
          client_name: 'Wincanton',
          status: 'approved',
        },
        company_booking_count: 8,
        agency_booking_count: 1,
        last_note: {
          text: 'Failed drug test on site at Wincanton depot. Banned from all Wincanton sites. Do not rebook.',
          created_at: '2024-11-06T09:15:00Z',
          author: 'Tom Bradley',
        },
        last_contact_date: '2024-11-06T09:15:00Z',
        available_this_week: false,
        next_availability_date: null,
        engagement: null,
        phone_number: '+447700900111',
        postcode: 'SW1A 1AA',
      },
    ],
    metadata: { duration_ms: 19 },
  },

  deletion_flagged: {
    matches: [
      {
        candidate_id: 50001,
        confidence: 'exact_phone',
        name: 'Alan Roberts',
        active_status: 'inactive',
        registered_at: null,
        recruiter_name: null,
        resourcer_name: null,
        marked_unsuitable: false,
        unsuitable_reason: null,
        marked_for_deletion: true,
        licence_categories: [
          { category: 'B', expiry_date: '2026-02-28' },
        ],
        licence_points: 0,
        job_categories: [],
        last_booking: null,
        company_booking_count: 0,
        agency_booking_count: 0,
        last_note: null,
        last_contact_date: null,
        available_this_week: false,
        next_availability_date: null,
        engagement: null,
        phone_number: '+447700900222',
        postcode: 'EH1 1YZ',
      },
    ],
    metadata: { duration_ms: 14 },
  },

  sparse: {
    matches: [
      {
        candidate_id: 60010,
        confidence: 'exact_phone',
        name: 'Sparse Record',
        active_status: 'active',
        registered_at: null,
        recruiter_name: null,
        resourcer_name: null,
        marked_unsuitable: false,
        unsuitable_reason: null,
        marked_for_deletion: false,
        licence_categories: [],
        licence_points: 0,
        job_categories: [],
        last_booking: null,
        company_booking_count: 0,
        agency_booking_count: 0,
        last_note: null,
        last_contact_date: null,
        available_this_week: false,
        next_availability_date: null,
        engagement: null,
        phone_number: '+447700900333',
        postcode: null,
      },
    ],
    metadata: { duration_ms: 10 },
  },

  suggestion: {
    matches: [
      {
        candidate_id: 70001,
        confidence: 'name_location',
        name: 'James Whitfield',
        active_status: 'active',
        registered_at: '2024-03-12T00:00:00Z',
        recruiter_name: 'Sarah Connor',
        resourcer_name: null,
        marked_unsuitable: false,
        unsuitable_reason: null,
        marked_for_deletion: false,
        licence_categories: [
          { category: 'C+E', expiry_date: '2028-11-20' },
        ],
        licence_points: 0,
        job_categories: ['HGV Class 1'],
        last_booking: {
          date: '2026-06-10T00:00:00Z',
          client_name: 'DHL Supply Chain',
          status: 'approved',
        },
        company_booking_count: 14,
        agency_booking_count: 3,
        last_note: null,
        last_contact_date: '2026-06-10T00:00:00Z',
        available_this_week: true,
        next_availability_date: null,
        engagement: { health: 'Warm', funnel_stage: 'Active placement', response_rate: 0.85 },
        phone_number: '+447712345678',
        postcode: 'CB10 1SA',
      },
    ],
    metadata: { duration_ms: 55 },
  },

  phone_not_on_file: {
    matches: [
      {
        candidate_id: 80001,
        confidence: 'exact_email',
        name: 'Tony Lynn',
        active_status: 'active',
        registered_at: '2025-05-20T00:00:00Z',
        recruiter_name: 'Tom Bradley',
        resourcer_name: null,
        marked_unsuitable: false,
        unsuitable_reason: null,
        marked_for_deletion: false,
        licence_categories: [
          { category: 'C', expiry_date: '2027-09-01' },
          { category: 'C+E', expiry_date: '2027-09-01' },
        ],
        licence_points: 0,
        job_categories: ['HGV Class 1', 'Container Work'],
        last_booking: {
          date: '2026-05-15T00:00:00Z',
          client_name: 'Maritime Transport',
          status: 'approved',
        },
        company_booking_count: 7,
        agency_booking_count: 2,
        last_note: {
          text: 'Good driver, prefers container port work. Available weekdays only.',
          created_at: '2026-05-16T09:00:00Z',
          author: 'Tom Bradley',
        },
        last_contact_date: '2026-05-16T09:00:00Z',
        available_this_week: true,
        next_availability_date: null,
        engagement: { health: 'Warm', funnel_stage: 'Active placement', response_rate: 0.78 },
        phone_number: '+447700900444',
        postcode: 'CO7 8PQ',
      },
    ],
    metadata: { duration_ms: 30 },
  },

  no_match: {
    matches: [],
    metadata: { duration_ms: 32 },
  },
};

function pickFixture(req: LookupRequest): MatchResponse {
  // Special-case fixtures (trigger via specific phone substrings)
  if (req.phone?.includes('900222')) return FIXTURES.deletion_flagged;
  if (req.phone?.includes('900111')) return FIXTURES.unsuitable;
  if (req.phone?.includes('900333')) return FIXTURES.sparse;
  if (req.email?.includes('notfound')) return FIXTURES.no_match;

  // Tiered precedence: phone → email → name+location
  // Phone first (highest confidence)
  if (req.phone) {
    // Simulate phone-not-on-file: phone sent but only email matched
    if (req.email?.includes('phonemissing')) return FIXTURES.phone_not_on_file;
    return FIXTURES.single_phone;
  }
  // Email second (only when no phone)
  if (req.email) return FIXTURES.single_email;
  // Name+location last (suggestion tier only)
  if (req.name && req.location) return FIXTURES.suggestion;

  return FIXTURES.no_match;
}

export async function mockCandidateMatch(req: LookupRequest): Promise<MatchResponse> {
  await new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 180));
  return pickFixture(req);
}

// Re-export fixtures for tests
export { FIXTURES };
