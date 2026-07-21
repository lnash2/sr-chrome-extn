import type { LookupRequest, MatchResponse } from './types';

const FIXTURES: Record<string, MatchResponse> = {
  single_phone: {
    matches: [
      {
        candidate_id: 10421,
        confidence: 'exact_phone',
        name: 'James Whitfield',
        active_status: 'active',
        recruiter_name: 'Sarah Connor',
        licence_categories: [
          { category: 'C', expiry_date: '2028-11-20' },
          { category: 'C+E', expiry_date: '2025-03-15' },
        ],
        licence_points: 3,
        last_booking_date: '2026-06-10T00:00:00Z',
        phone_number: '+447712345678',
        postcode: 'M1 1AA',
        marked_unsuitable: false,
        unsuitable_reason: null,
        marked_for_deletion: false,
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
        recruiter_name: null,
        licence_categories: [
          { category: 'B', expiry_date: '2029-08-01' },
        ],
        licence_points: 0,
        last_booking_date: null,
        phone_number: '+447898765432',
        postcode: 'LS2 7HY',
        marked_unsuitable: false,
        unsuitable_reason: null,
        marked_for_deletion: false,
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
        recruiter_name: 'Tom Bradley',
        licence_categories: [
          { category: 'C', expiry_date: '2027-05-10' },
          { category: 'C+E', expiry_date: '2027-05-10' },
        ],
        licence_points: 0,
        last_booking_date: '2026-07-01T00:00:00Z',
        phone_number: '+447555123456',
        postcode: 'B1 1BB',
        marked_unsuitable: false,
        unsuitable_reason: null,
        marked_for_deletion: false,
      },
      {
        candidate_id: 30298,
        confidence: 'fuzzy_name_postcode',
        name: 'Dave Smith',
        active_status: 'active',
        recruiter_name: 'Sarah Connor',
        licence_categories: [
          { category: 'C', expiry_date: '2026-01-15' },
        ],
        licence_points: 6,
        last_booking_date: '2025-12-20T00:00:00Z',
        phone_number: '+447555654321',
        postcode: 'B1 3AD',
        marked_unsuitable: false,
        unsuitable_reason: null,
        marked_for_deletion: false,
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
        recruiter_name: 'Tom Bradley',
        licence_categories: [],
        licence_points: 9,
        last_booking_date: '2024-11-05T00:00:00Z',
        phone_number: '+447700900111',
        postcode: 'SW1A 1AA',
        marked_unsuitable: true,
        unsuitable_reason: 'Failed drug test — site banned 2024-11',
        marked_for_deletion: false,
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
        recruiter_name: null,
        licence_categories: [
          { category: 'B', expiry_date: '2026-02-28' },
        ],
        licence_points: 0,
        last_booking_date: null,
        phone_number: '+447700900222',
        postcode: 'EH1 1YZ',
        marked_unsuitable: false,
        unsuitable_reason: null,
        marked_for_deletion: true,
      },
    ],
    metadata: { duration_ms: 14 },
  },

  no_match: {
    matches: [],
    metadata: { duration_ms: 32 },
  },
};

function pickFixture(req: LookupRequest): MatchResponse {
  // Deterministic fixture selection based on input so developers can test each state
  if (req.phone?.includes('900222')) return FIXTURES.deletion_flagged;
  if (req.phone?.includes('900111')) return FIXTURES.unsuitable;
  if (req.email?.includes('notfound')) return FIXTURES.no_match;
  if (req.name && req.postcode && !req.phone && !req.email) return FIXTURES.multiple;
  if (req.email) return FIXTURES.single_email;
  if (req.phone) return FIXTURES.single_phone;
  return FIXTURES.no_match;
}

export async function mockCandidateMatch(req: LookupRequest): Promise<MatchResponse> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 180));
  return pickFixture(req);
}
