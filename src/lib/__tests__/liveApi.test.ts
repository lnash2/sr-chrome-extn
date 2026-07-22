import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { liveCandidateMatch } from '../liveApi';
import type { LookupRequest, MatchResponse } from '../types';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const PAYLOAD: LookupRequest = {
  phone: '+447712345678',
  email: null,
  name: null,
  location: null,
};

const TOKEN = 'test-access-token';

const MATCH_RESPONSE: MatchResponse = {
  matches: [
    {
      candidate_id: 10421,
      confidence: 'exact_phone',
      name: 'James Whitfield',
      active_status: 'active',
      registered_at: null,
      recruiter_name: 'Sarah Connor',
      resourcer_name: null,
      marked_unsuitable: false,
      unsuitable_reason: null,
      marked_for_deletion: false,
      licence_categories: [{ category: 'C+E', expiry_date: '2028-11-20' }],
      licence_points: 0,
      job_categories: ['HGV Class 1'],
      last_booking: null,
      company_booking_count: 5,
      agency_booking_count: 1,
      last_note: null,
      last_contact_date: null,
      available_this_week: true,
      next_availability_date: null,
      engagement: null,
      phone_number: '+447712345678',
      postcode: 'CB10 1SA',
    },
  ],
  metadata: { duration_ms: 42 },
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('liveCandidateMatch', () => {
  it('200 — maps successful response to { ok: true, data }', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(MATCH_RESPONSE), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const result = await liveCandidateMatch(PAYLOAD, TOKEN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.matches).toHaveLength(1);
      expect(result.data.matches[0].name).toBe('James Whitfield');
      expect(result.data.metadata.duration_ms).toBe(42);
    }
  });

  it('sends Authorization header with bearer token', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(MATCH_RESPONSE), { status: 200 }));

    await liveCandidateMatch(PAYLOAD, TOKEN);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer test-access-token');
  });

  it('sends payload as JSON body', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(MATCH_RESPONSE), { status: 200 }));

    await liveCandidateMatch(PAYLOAD, TOKEN);

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual(PAYLOAD);
  });

  it('401 — returns UNAUTHORIZED error', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));

    const result = await liveCandidateMatch(PAYLOAD, TOKEN);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('UNAUTHORIZED');
  });

  it('429 — returns RATE_LIMITED error', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 429 }));

    const result = await liveCandidateMatch(PAYLOAD, TOKEN);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('RATE_LIMITED');
  });

  it('500 — extracts error message from JSON body', async () => {
    fetchMock.mockResolvedValue(new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 },
    ));

    const result = await liveCandidateMatch(PAYLOAD, TOKEN);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Internal server error');
  });

  it('500 — falls back to generic message when body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('bad gateway', { status: 502 }));

    const result = await liveCandidateMatch(PAYLOAD, TOKEN);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('API error 502');
  });

  it('network error — returns error message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await liveCandidateMatch(PAYLOAD, TOKEN);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Failed to fetch');
  });

  it('timeout — returns timeout error via AbortController', async () => {
    fetchMock.mockImplementation(() =>
      new Promise((_, reject) => {
        // Simulate the abort signal firing
        const err = new DOMException('The operation was aborted', 'AbortError');
        setTimeout(() => reject(err), 10);
      }),
    );

    const result = await liveCandidateMatch(PAYLOAD, TOKEN);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('timed out');
  });

  it('200 with empty matches — returns ok with empty array', async () => {
    const emptyResponse: MatchResponse = { matches: [], metadata: { duration_ms: 15 } };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(emptyResponse), { status: 200 }));

    const result = await liveCandidateMatch(PAYLOAD, TOKEN);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.matches).toHaveLength(0);
  });
});
