import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderPanel, destroyPanel, type PanelState } from '../panel';
import type { CandidateMatch, MatchResponse } from '@/lib/types';

function getHost(): HTMLElement | null {
  return document.getElementById('sr-panel-host');
}

function shadow(): ShadowRoot {
  const host = getHost();
  if (!host || !host.shadowRoot) throw new Error('Panel host or shadow root not found');
  return host.shadowRoot;
}

function panelEl(): Element {
  const el = shadow().querySelector('.sr-panel');
  if (!el) throw new Error('.sr-panel not found in shadow DOM');
  return el;
}

function panelText(): string {
  return panelEl().textContent ?? '';
}

// --- Fixtures ---

const MATCH_FIXTURE: CandidateMatch = {
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
};

const UNSUITABLE_FIXTURE: CandidateMatch = {
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
};

const DELETION_FIXTURE: CandidateMatch = {
  ...MATCH_FIXTURE,
  candidate_id: 50001,
  name: 'Alan Roberts',
  marked_for_deletion: true,
};

function matchState(matches: CandidateMatch[]): PanelState {
  const resp: MatchResponse = { matches, metadata: { duration_ms: 38 } };
  return { status: 'match', data: { ok: true as const, data: resp } };
}

// --- Tests ---

describe('Panel — Shadow DOM isolation', () => {
  afterEach(() => destroyPanel());

  it('creates a shadow root on the host element', () => {
    renderPanel({ status: 'idle' });
    const host = getHost();
    expect(host).not.toBeNull();
    expect(host!.shadowRoot).not.toBeNull();
  });

  it('does not leak styles into the main document', () => {
    renderPanel({ status: 'idle' });
    // .sr-panel should not exist in the main DOM
    expect(document.querySelector('.sr-panel')).toBeNull();
    // But should exist inside the shadow root
    expect(shadow().querySelector('.sr-panel')).not.toBeNull();
  });

  it('reuses the same host on repeated renders', () => {
    renderPanel({ status: 'idle' });
    const host1 = getHost();
    renderPanel({ status: 'searching' });
    const host2 = getHost();
    expect(host1).toBe(host2);
  });

  it('destroyPanel removes the host', () => {
    renderPanel({ status: 'idle' });
    expect(getHost()).not.toBeNull();
    destroyPanel();
    expect(getHost()).toBeNull();
  });
});

describe('Panel — state rendering', () => {
  afterEach(() => destroyPanel());

  it('renders idle state', () => {
    renderPanel({ status: 'idle' });
    expect(panelEl().getAttribute('data-status')).toBe('idle');
    expect(panelText()).toContain('No candidate detected');
  });

  it('renders searching state with spinner', () => {
    renderPanel({ status: 'searching' });
    expect(panelEl().getAttribute('data-status')).toBe('searching');
    expect(shadow().querySelector('.sr-spinner')).not.toBeNull();
    expect(panelText()).toContain('Looking up candidate');
  });

  it('renders no-match state', () => {
    renderPanel({ status: 'no-match' });
    expect(panelEl().getAttribute('data-status')).toBe('no-match');
    expect(panelText()).toContain('No matching candidate');
  });

  it('renders error state with message', () => {
    renderPanel({ status: 'error', error: 'Service worker timeout' });
    expect(panelEl().getAttribute('data-status')).toBe('error');
    expect(panelText()).toContain('Service worker timeout');
  });

  it('renders logged-out state', () => {
    renderPanel({ status: 'logged-out' });
    expect(panelEl().getAttribute('data-status')).toBe('logged-out');
    expect(panelText()).toContain('Log in');
  });
});

describe('Panel — match card', () => {
  afterEach(() => destroyPanel());

  it('renders single match card with candidate details', () => {
    renderPanel(matchState([MATCH_FIXTURE]));
    const text = panelText();
    expect(text).toContain('James Whitfield');
    expect(text).toContain('Phone match');
    expect(text).toContain('active');
    expect(text).toContain('Sarah Connor');
    expect(text).toContain('+447712345678');
    expect(text).toContain('M1 1AA');
  });

  it('renders licence categories', () => {
    renderPanel(matchState([MATCH_FIXTURE]));
    const tags = shadow().querySelectorAll('.sr-licence-tag');
    expect(tags.length).toBe(2);
    expect(tags[0].textContent).toContain('C');
    expect(tags[1].textContent).toContain('C+E');
  });

  it('renders licence points and last booking', () => {
    renderPanel(matchState([MATCH_FIXTURE]));
    const text = panelText();
    expect(text).toContain('3');
    expect(text).toContain('2026-06-10');
  });

  it('renders match count badge', () => {
    renderPanel(matchState([MATCH_FIXTURE]));
    const badge = shadow().querySelector('.sr-badge--match');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('1 match');
  });

  it('renders multiple match cards', () => {
    renderPanel(matchState([MATCH_FIXTURE, { ...MATCH_FIXTURE, candidate_id: 99, name: 'Second Candidate' }]));
    const cards = shadow().querySelectorAll('.sr-match-card');
    expect(cards.length).toBe(2);
    const badge = shadow().querySelector('.sr-badge--match');
    expect(badge!.textContent).toContain('2 matches');
  });

  it('shows unsuitable warning', () => {
    renderPanel(matchState([UNSUITABLE_FIXTURE]));
    const warning = shadow().querySelector('.sr-warning--unsuitable');
    expect(warning).not.toBeNull();
    expect(warning!.textContent).toContain('Marked unsuitable');
    expect(warning!.textContent).toContain('Failed drug test');
  });

  it('shows deletion flag warning', () => {
    renderPanel(matchState([DELETION_FIXTURE]));
    const warning = shadow().querySelector('.sr-warning--deletion');
    expect(warning).not.toBeNull();
    expect(warning!.textContent).toContain('Flagged for deletion');
  });

  it('shows "None on file" when candidate has no licences', () => {
    renderPanel(matchState([UNSUITABLE_FIXTURE]));
    expect(panelText()).toContain('None on file');
  });

  it('renders metadata with duration', () => {
    renderPanel(matchState([MATCH_FIXTURE]));
    expect(panelText()).toContain('38ms');
  });

  it('sets data-candidate-id on each card', () => {
    renderPanel(matchState([MATCH_FIXTURE]));
    const card = shadow().querySelector('.sr-match-card');
    expect(card!.getAttribute('data-candidate-id')).toBe('10421');
  });
});

describe('Panel — state transitions', () => {
  afterEach(() => destroyPanel());

  it('transitions from idle → searching → match', () => {
    renderPanel({ status: 'idle' });
    expect(panelEl().getAttribute('data-status')).toBe('idle');

    renderPanel({ status: 'searching' });
    expect(panelEl().getAttribute('data-status')).toBe('searching');

    renderPanel(matchState([MATCH_FIXTURE]));
    expect(panelEl().getAttribute('data-status')).toBe('match');
    expect(panelText()).toContain('James Whitfield');
  });

  it('transitions from searching → error', () => {
    renderPanel({ status: 'searching' });
    renderPanel({ status: 'error', error: 'Network failure' });
    expect(panelEl().getAttribute('data-status')).toBe('error');
    expect(panelText()).toContain('Network failure');
  });
});
