import { describe, it, expect, afterEach } from 'vitest';
import { renderPanel, destroyPanel, relativeDate, licenceStatus, isConfirmed, isSuggestion, isPhoneNotOnFile, type PanelState } from '../panel';
import type { CandidateMatch, LookupRequest, MatchResponse } from '@/lib/types';
import { normalisePhoneE164 } from '@/lib/phoneNormalise';
import { FIXTURES } from '@/lib/mockApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHost(): HTMLElement | null {
  return document.getElementById('sr-panel-host');
}

function shadow(): ShadowRoot {
  const host = getHost();
  if (!host?.shadowRoot) throw new Error('No shadow root');
  return host.shadowRoot;
}

function bar(): Element {
  const el = shadow().querySelector('.sr-bar');
  if (!el) throw new Error('.sr-bar not found');
  return el;
}

function barText(): string {
  return bar().textContent ?? '';
}

const DEFAULT_SCRAPED: LookupRequest = { phone: '07712 345678', email: null, name: null, location: null };

function matchState(matches: CandidateMatch[], scraped: LookupRequest = DEFAULT_SCRAPED, duration_ms = 38): PanelState {
  const resp: MatchResponse = { matches, metadata: { duration_ms } };
  return { status: 'match', data: { ok: true as const, data: resp }, scraped };
}

function noMatchState(scraped: LookupRequest = DEFAULT_SCRAPED): PanelState {
  return { status: 'no-match', scraped };
}

function fixtureMatch(name: string): CandidateMatch {
  return FIXTURES[name].matches[0];
}

// ---------------------------------------------------------------------------
// Shadow DOM isolation
// ---------------------------------------------------------------------------

describe('Bar — Shadow DOM', () => {
  afterEach(() => destroyPanel());

  it('creates a shadow root on the host', () => {
    renderPanel({ status: 'searching' });
    expect(getHost()).not.toBeNull();
    expect(getHost()!.shadowRoot).not.toBeNull();
  });

  it('does not leak selectors into the main DOM', () => {
    renderPanel({ status: 'searching' });
    expect(document.querySelector('.sr-bar')).toBeNull();
    expect(shadow().querySelector('.sr-bar')).not.toBeNull();
  });

  it('reuses the host on re-render', () => {
    renderPanel({ status: 'searching' });
    const h1 = getHost();
    renderPanel(noMatchState());
    expect(getHost()).toBe(h1);
  });

  it('destroyPanel removes host', () => {
    renderPanel({ status: 'searching' });
    destroyPanel();
    expect(getHost()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Page push
// ---------------------------------------------------------------------------

describe('Bar — page push', () => {
  afterEach(() => destroyPanel());

  it('applies margin-top to documentElement when bar renders', () => {
    renderPanel({ status: 'searching' });
    const mt = document.documentElement.style.marginTop;
    expect(mt).toBeTruthy();
    expect(parseInt(mt)).toBeGreaterThan(0);
  });

  it('removes margin-top on destroyPanel', () => {
    renderPanel({ status: 'searching' });
    destroyPanel();
    expect(document.documentElement.style.marginTop).toBe('');
  });

  it('removes margin-top when idle', () => {
    renderPanel({ status: 'searching' });
    renderPanel({ status: 'idle' });
    expect(document.documentElement.style.marginTop).toBe('');
    expect(getHost()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// State rendering
// ---------------------------------------------------------------------------

describe('Bar — state rendering', () => {
  afterEach(() => destroyPanel());

  it('idle: renders nothing at all', () => {
    renderPanel({ status: 'idle' });
    expect(getHost()).toBeNull();
  });

  it('searching: shows spinner and message', () => {
    renderPanel({ status: 'searching' });
    expect(bar().getAttribute('data-status')).toBe('searching');
    expect(shadow().querySelector('.sr-spinner')).not.toBeNull();
    expect(barText()).toContain('Searching Swift Recruit');
  });

  it('error: shows red tint and message', () => {
    renderPanel({ status: 'error', error: 'Service worker timed out' });
    expect(bar().getAttribute('data-status')).toBe('error');
    expect(barText()).toContain('Service worker timed out');
    expect(shadow().querySelector('.sr-state-row--error')).not.toBeNull();
  });

  it('logged-out: shows teal login prompt', () => {
    renderPanel({ status: 'logged-out' });
    expect(bar().getAttribute('data-status')).toBe('logged-out');
    expect(barText()).toContain('Log in via the extension popup');
  });

  it('all non-idle states show Swift Recruit brand', () => {
    for (const state of [
      { status: 'searching' } as PanelState,
      noMatchState(),
      { status: 'logged-out' } as PanelState,
    ]) {
      renderPanel(state);
      expect(barText()).toContain('Swift Recruit');
      destroyPanel();
    }
  });
});

// ---------------------------------------------------------------------------
// CONFIRMED tier (exact_phone / exact_email)
// ---------------------------------------------------------------------------

describe('Bar — CONFIRMED tier', () => {
  afterEach(() => destroyPanel());

  const m = fixtureMatch('single_phone');

  it('shows "In CRM ✓" badge', () => {
    renderPanel(matchState([m]));
    const badge = shadow().querySelector('[data-conf-tier="confirmed"]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('In CRM');
  });

  it('shows "phone verified" detail badge for exact_phone', () => {
    renderPanel(matchState([m]));
    const detail = shadow().querySelector('[data-conf-detail]');
    expect(detail).not.toBeNull();
    expect(detail!.textContent).toContain('phone verified');
  });

  it('shows "email verified" detail badge for exact_email', () => {
    const em = fixtureMatch('single_email');
    renderPanel(matchState([em], { phone: null, email: 'test@test.com', name: null, location: null }));
    const detail = shadow().querySelector('[data-conf-detail]');
    expect(detail!.textContent).toContain('email verified');
  });

  it('"In CRM ✓" badge uses green styling', () => {
    renderPanel(matchState([m]));
    const badge = shadow().querySelector('[data-conf-tier="confirmed"]');
    expect(badge!.classList.contains('sr-badge--in-crm')).toBe(true);
  });

  it('CRM button is primary teal', () => {
    renderPanel(matchState([m]));
    const link = shadow().querySelector('[data-deeplink]') as HTMLElement;
    expect(link.classList.contains('sr-btn--primary')).toBe(true);
    expect(link.textContent).toContain('Open in CRM');
  });

  it('bar does NOT have suggestion tint', () => {
    renderPanel(matchState([m]));
    expect(bar().classList.contains('sr-bar--suggestion')).toBe(false);
  });

  it('renders candidate name', () => {
    renderPanel(matchState([m]));
    expect(barText()).toContain('James Whitfield');
  });

  it('renders active status badge', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelector('.sr-badge--active')).not.toBeNull();
  });

  it('renders recruiter and resourcer', () => {
    renderPanel(matchState([m]));
    const meta = shadow().querySelector('.sr-meta');
    expect(meta!.textContent).toContain('Sarah Connor');
    expect(meta!.textContent).toContain('Alex Morgan');
  });

  it('renders licence chips', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelectorAll('[data-licence-status]').length).toBe(2);
  });

  it('renders job categories', () => {
    renderPanel(matchState([m]));
    expect(barText()).toContain('HGV Class 1');
  });

  it('renders last booking', () => {
    renderPanel(matchState([m]));
    expect(barText()).toContain('DHL Supply Chain');
  });

  it('renders booking counts', () => {
    renderPanel(matchState([m]));
    expect(barText()).toContain('14 co.');
  });

  it('renders available chip', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelector('.sr-chip--available')).not.toBeNull();
  });

  it('renders engagement health', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-health="warm"]')).not.toBeNull();
  });

  it('renders deep link', () => {
    renderPanel(matchState([m]));
    const link = shadow().querySelector('[data-deeplink]') as HTMLAnchorElement;
    expect(link.href).toContain('/swift/candidates/10421');
  });

  it('renders copy phone button', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-copy-phone]')!.getAttribute('data-copy-phone')).toBe('+447712345678');
  });
});

// ---------------------------------------------------------------------------
// UNCONFIRMED SUGGESTION tier (name_location / fuzzy)
// ---------------------------------------------------------------------------

describe('Bar — UNCONFIRMED SUGGESTION tier', () => {
  afterEach(() => destroyPanel());

  const m = fixtureMatch('suggestion');

  it('bar has amber suggestion tint', () => {
    renderPanel(matchState([m], { phone: null, email: null, name: 'James', location: 'Saffron Walden' }));
    expect(bar().classList.contains('sr-bar--suggestion')).toBe(true);
  });

  it('shows "Possible match — NOT confirmed" badge', () => {
    renderPanel(matchState([m], { phone: null, email: null, name: 'James', location: 'Saffron Walden' }));
    const badge = shadow().querySelector('[data-conf-tier="suggestion"]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('Possible match');
    expect(badge!.textContent).toContain('NOT confirmed');
  });

  it('does NOT show "In CRM ✓" badge', () => {
    renderPanel(matchState([m], { phone: null, email: null, name: 'James', location: 'Saffron Walden' }));
    expect(shadow().querySelector('[data-conf-tier="confirmed"]')).toBeNull();
  });

  it('CRM button is amber with "Review possible match" label', () => {
    renderPanel(matchState([m], { phone: null, email: null, name: 'James', location: 'Saffron Walden' }));
    const link = shadow().querySelector('[data-deeplink]') as HTMLElement;
    expect(link.classList.contains('sr-btn--amber')).toBe(true);
    expect(link.textContent).toContain('Review possible match');
  });

  it('shows verify phone caveat', () => {
    renderPanel(matchState([m], { phone: null, email: null, name: 'James', location: 'Saffron Walden' }));
    expect(shadow().querySelector('[data-caveat]')).not.toBeNull();
    expect(barText()).toContain('verify phone');
  });

  it('exact_phone match does not show caveat or suggestion tint', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(shadow().querySelector('[data-caveat]')).toBeNull();
    expect(bar().classList.contains('sr-bar--suggestion')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NOT IN CRM
// ---------------------------------------------------------------------------

describe('Bar — NOT IN CRM', () => {
  afterEach(() => destroyPanel());

  it('shows prominent "Not in Swift Recruit" message', () => {
    renderPanel(noMatchState());
    expect(bar().getAttribute('data-status')).toBe('no-match');
    expect(barText()).toContain('Not in Swift Recruit');
  });

  it('bar has slate treatment class', () => {
    renderPanel(noMatchState());
    expect(bar().classList.contains('sr-bar--not-in-crm')).toBe(true);
  });

  it('shows person-plus icon', () => {
    renderPanel(noMatchState());
    // The userPlus icon SVG is rendered inline
    const icons = shadow().querySelectorAll('.sr-icon');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('displays normalised scraped phone', () => {
    renderPanel(noMatchState({ phone: '07712 345678', email: null, name: null, location: null }));
    const phoneEl = shadow().querySelector('[data-scraped-phone]');
    expect(phoneEl).not.toBeNull();
    expect(phoneEl!.textContent).toContain('+447712345678');
  });

  it('omits phone display when no phone was scraped', () => {
    renderPanel(noMatchState({ phone: null, email: 'test@test.com', name: null, location: null }));
    expect(shadow().querySelector('[data-scraped-phone]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Phone not on file
// ---------------------------------------------------------------------------

describe('Bar — phone not on file', () => {
  afterEach(() => destroyPanel());

  it('shows amber note when phone scraped but matched by email only', () => {
    const m = fixtureMatch('phone_not_on_file'); // exact_email confidence
    const scraped: LookupRequest = { phone: '07742 613765', email: 'tony@test.com', name: null, location: null };
    renderPanel(matchState([m], scraped));
    const note = shadow().querySelector('[data-phone-note]');
    expect(note).not.toBeNull();
    expect(note!.textContent).toContain('Phone not on file');
    expect(note!.textContent).toContain('matched by email');
  });

  it('does NOT show note when phone matched (exact_phone)', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(shadow().querySelector('[data-phone-note]')).toBeNull();
  });

  it('does NOT show note when no phone was scraped', () => {
    const m = fixtureMatch('single_email');
    const scraped: LookupRequest = { phone: null, email: 'test@test.com', name: null, location: null };
    renderPanel(matchState([m], scraped));
    expect(shadow().querySelector('[data-phone-note]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Note popover
// ---------------------------------------------------------------------------

describe('Bar — note popover', () => {
  afterEach(() => destroyPanel());

  const m = fixtureMatch('single_phone');

  it('renders note button when last_note present', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-note-toggle]')).not.toBeNull();
  });

  it('note popover hidden by default', () => {
    renderPanel(matchState([m]));
    const popover = shadow().querySelector('[data-note-popover]') as HTMLElement;
    expect(popover.hidden).toBe(true);
  });

  it('clicking note button opens popover', () => {
    renderPanel(matchState([m]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    const popover = shadow().querySelector('[data-note-popover]') as HTMLElement;
    expect(popover.hidden).toBe(false);
  });

  it('popover contains note text and author', () => {
    renderPanel(matchState([m]));
    const popover = shadow().querySelector('[data-note-popover]')!;
    expect(popover.textContent).toContain('night shifts');
    expect(popover.textContent).toContain('Sarah Connor');
  });

  it('clicking note button again closes popover', () => {
    renderPanel(matchState([m]));
    const btn = shadow().querySelector('[data-note-toggle]') as HTMLElement;
    btn.click();
    btn.click();
    expect((shadow().querySelector('[data-note-popover]') as HTMLElement).hidden).toBe(true);
  });

  it('no note button when last_note is null', () => {
    renderPanel(matchState([fixtureMatch('sparse')]));
    expect(shadow().querySelector('[data-note-toggle]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Warning tint
// ---------------------------------------------------------------------------

describe('Bar — warning tint', () => {
  afterEach(() => destroyPanel());

  it('unsuitable: bar has red tint class', () => {
    renderPanel(matchState([fixtureMatch('unsuitable')]));
    expect(bar().classList.contains('sr-bar--unsuitable')).toBe(true);
  });

  it('unsuitable: warning text with reason leads the row', () => {
    renderPanel(matchState([fixtureMatch('unsuitable')]));
    const warn = shadow().querySelector('[data-warning="unsuitable"]');
    expect(warn).not.toBeNull();
    expect(warn!.textContent).toContain('Marked unsuitable');
    expect(warn!.textContent).toContain('Failed drug test');
    const name = shadow().querySelector('.sr-name')!;
    expect(warn!.compareDocumentPosition(name)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('deletion: bar has amber tint class', () => {
    renderPanel(matchState([fixtureMatch('deletion_flagged')]));
    expect(bar().classList.contains('sr-bar--deletion')).toBe(true);
  });

  it('deletion: warning text in row', () => {
    renderPanel(matchState([fixtureMatch('deletion_flagged')]));
    const warn = shadow().querySelector('[data-warning="deletion"]');
    expect(warn!.textContent).toContain('Flagged for deletion');
  });

  it('both flags: unsuitable takes visual precedence', () => {
    const m: CandidateMatch = { ...fixtureMatch('unsuitable'), marked_for_deletion: true };
    renderPanel(matchState([m]));
    expect(bar().classList.contains('sr-bar--unsuitable')).toBe(true);
    expect(bar().classList.contains('sr-bar--deletion')).toBe(true);
    const unsuitable = shadow().querySelector('[data-warning="unsuitable"]')!;
    const deletion = shadow().querySelector('[data-warning="deletion"]')!;
    expect(unsuitable.compareDocumentPosition(deletion)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

// ---------------------------------------------------------------------------
// Sparse record
// ---------------------------------------------------------------------------

describe('Bar — sparse record', () => {
  afterEach(() => destroyPanel());

  const sparse = fixtureMatch('sparse');

  it('renders without errors', () => {
    expect(() => renderPanel(matchState([sparse]))).not.toThrow();
  });

  it('does not show "null" or "undefined"', () => {
    renderPanel(matchState([sparse]));
    expect(barText()).not.toContain('null');
    expect(barText()).not.toContain('undefined');
  });

  it('omits meta text when no recruiter/resourcer/registered_at', () => {
    renderPanel(matchState([sparse]));
    expect(shadow().querySelector('.sr-meta')).toBeNull();
  });

  it('still renders name and CRM link', () => {
    renderPanel(matchState([sparse]));
    expect(barText()).toContain('Sparse Record');
    expect(shadow().querySelector('[data-deeplink]')).not.toBeNull();
  });

  it('no note button', () => {
    renderPanel(matchState([sparse]));
    expect(shadow().querySelector('[data-note-toggle]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Licence status colours
// ---------------------------------------------------------------------------

describe('Bar — licence status colours', () => {
  afterEach(() => destroyPanel());

  it('expired licence chip gets red styling', () => {
    const m: CandidateMatch = { ...fixtureMatch('sparse'), licence_categories: [{ category: 'C', expiry_date: '2020-01-01' }] };
    renderPanel(matchState([m]));
    const chip = shadow().querySelector('[data-licence-status="expired"]');
    expect(chip!.classList.contains('sr-chip--expired')).toBe(true);
  });

  it('expiring licence chip (<30 days) gets amber styling', () => {
    const soon = new Date(Date.now() + 15 * 86_400_000).toISOString();
    const m: CandidateMatch = { ...fixtureMatch('sparse'), licence_categories: [{ category: 'C+E', expiry_date: soon }] };
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-licence-status="expiring"]')!.classList.contains('sr-chip--expiring')).toBe(true);
  });

  it('valid licence chip (>30 days) gets neutral styling', () => {
    const far = new Date(Date.now() + 365 * 86_400_000).toISOString();
    const m: CandidateMatch = { ...fixtureMatch('sparse'), licence_categories: [{ category: 'B', expiry_date: far }] };
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-licence-status="valid"]')).not.toBeNull();
  });

  it('licence with no expiry_date is valid', () => {
    const m: CandidateMatch = { ...fixtureMatch('sparse'), licence_categories: [{ category: 'B', expiry_date: null }] };
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-licence-status="valid"]')).not.toBeNull();
  });

  it('points >= 9 get red styling', () => {
    renderPanel(matchState([fixtureMatch('unsuitable')]));
    const chip = shadow().querySelector('[data-points="9"]');
    expect(chip!.classList.contains('sr-chip--expired')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Collapse toggle
// ---------------------------------------------------------------------------

describe('Bar — collapse', () => {
  afterEach(() => destroyPanel());

  it('collapse button renders', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(shadow().querySelector('[data-collapse]')).not.toBeNull();
  });

  it('clicking collapse shows slim strip with name and match count', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-collapse]') as HTMLElement).click();
    expect(bar().classList.contains('sr-bar--collapsed')).toBe(true);
    expect(barText()).toContain('James Whitfield');
    expect(barText()).toContain('1 match');
    expect(shadow().querySelector('[data-deeplink]')).toBeNull();
  });

  it('clicking expand restores full bar', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-collapse]') as HTMLElement).click();
    (shadow().querySelector('[data-collapse]') as HTMLElement).click();
    expect(bar().classList.contains('sr-bar--collapsed')).toBe(false);
    expect(shadow().querySelector('[data-deeplink]')).not.toBeNull();
  });

  it('collapsed state persists across re-renders', () => {
    const state = matchState([fixtureMatch('single_phone')]);
    renderPanel(state);
    (shadow().querySelector('[data-collapse]') as HTMLElement).click();
    expect(bar().classList.contains('sr-bar--collapsed')).toBe(true);
  });

  it('collapsed strip shows match count for multiple matches', () => {
    renderPanel(matchState(FIXTURES.multiple.matches));
    (shadow().querySelector('[data-collapse]') as HTMLElement).click();
    expect(barText()).toContain('2 matches');
  });
});

// ---------------------------------------------------------------------------
// Multi-match pills
// ---------------------------------------------------------------------------

describe('Bar — multiple matches', () => {
  afterEach(() => destroyPanel());

  const matches = FIXTURES.multiple.matches;

  it('shows "[N] possible matches" label', () => {
    renderPanel(matchState(matches));
    expect(shadow().querySelector('[data-multi-label]')).not.toBeNull();
    expect(barText()).toContain('2 possible matches');
  });

  it('renders one pill per match', () => {
    renderPanel(matchState(matches));
    expect(shadow().querySelectorAll('.sr-pill').length).toBe(2);
  });

  it('pills sorted by confidence (exact_phone first)', () => {
    renderPanel(matchState(matches));
    const pills = shadow().querySelectorAll('.sr-pill');
    expect(pills[0].textContent).toContain('David Smith');
    expect(pills[1].textContent).toContain('Dave Smith');
  });

  it('clicking a pill expands that match row', () => {
    renderPanel(matchState(matches));
    (shadow().querySelector('.sr-pill') as HTMLElement).click();
    expect(shadow().querySelector('.sr-expanded')).not.toBeNull();
    expect(shadow().querySelector('[data-deeplink]')).not.toBeNull();
  });

  it('expanded pill gets highlighted class', () => {
    renderPanel(matchState(matches));
    (shadow().querySelector('.sr-pill') as HTMLElement).click();
    expect(shadow().querySelectorAll('.sr-pill')[0].classList.contains('sr-pill--expanded')).toBe(true);
  });

  it('clicking same pill again collapses', () => {
    renderPanel(matchState(matches));
    (shadow().querySelector('.sr-pill') as HTMLElement).click();
    (shadow().querySelectorAll('.sr-pill')[0] as HTMLElement).click();
    expect(shadow().querySelector('.sr-expanded')).toBeNull();
  });

  it('shows caveat when suggestion-tier match present', () => {
    renderPanel(matchState(matches));
    expect(shadow().querySelector('[data-caveat]')).not.toBeNull();
    expect(barText()).toContain('verify phone');
  });
});

// ---------------------------------------------------------------------------
// Unsuitable / inactive fixture
// ---------------------------------------------------------------------------

describe('Bar — unsuitable/inactive fixture', () => {
  afterEach(() => destroyPanel());

  const m = fixtureMatch('unsuitable');

  it('shows inactive badge', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelector('.sr-badge--inactive')).not.toBeNull();
  });

  it('shows expired licence', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-licence-status="expired"]')).not.toBeNull();
  });

  it('shows note with drug test content', () => {
    renderPanel(matchState([m]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    expect(shadow().querySelector('[data-note-popover]')!.textContent).toContain('drug test');
  });
});

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

describe('Bar — state transitions', () => {
  afterEach(() => destroyPanel());

  it('idle → searching → match', () => {
    renderPanel({ status: 'idle' });
    expect(getHost()).toBeNull();
    renderPanel({ status: 'searching' });
    expect(bar().getAttribute('data-status')).toBe('searching');
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(bar().getAttribute('data-status')).toBe('match');
    expect(barText()).toContain('James Whitfield');
  });

  it('searching → error', () => {
    renderPanel({ status: 'searching' });
    renderPanel({ status: 'error', error: 'Timeout' });
    expect(barText()).toContain('Timeout');
  });

  it('match → idle removes bar and page push', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    renderPanel({ status: 'idle' });
    expect(getHost()).toBeNull();
    expect(document.documentElement.style.marginTop).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Unit: relativeDate
// ---------------------------------------------------------------------------

describe('relativeDate', () => {
  it('"just now"', () => expect(relativeDate(new Date().toISOString())).toBe('just now'));
  it('minutes', () => expect(relativeDate(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5m ago'));
  it('hours', () => expect(relativeDate(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe('3h ago'));
  it('days', () => expect(relativeDate(new Date(Date.now() - 2 * 86_400_000).toISOString())).toBe('2d ago'));
  it('weeks', () => expect(relativeDate(new Date(Date.now() - 21 * 86_400_000).toISOString())).toBe('3w ago'));
  it('months', () => expect(relativeDate(new Date(Date.now() - 90 * 86_400_000).toISOString())).toBe('3mo ago'));
  it('future', () => expect(relativeDate(new Date(Date.now() + 2 * 86_400_000).toISOString())).toBe('in 2d'));
});

// ---------------------------------------------------------------------------
// Unit: licenceStatus
// ---------------------------------------------------------------------------

describe('licenceStatus', () => {
  it('valid for null expiry', () => expect(licenceStatus({ category: 'B', expiry_date: null })).toBe('valid'));
  it('expired for past', () => expect(licenceStatus({ category: 'C', expiry_date: '2020-01-01' })).toBe('expired'));
  it('expiring <30d', () => expect(licenceStatus({ category: 'C+E', expiry_date: new Date(Date.now() + 15 * 86_400_000).toISOString() })).toBe('expiring'));
  it('valid >30d', () => expect(licenceStatus({ category: 'B', expiry_date: new Date(Date.now() + 365 * 86_400_000).toISOString() })).toBe('valid'));
});

// ---------------------------------------------------------------------------
// Unit: tier helpers
// ---------------------------------------------------------------------------

describe('tier helpers', () => {
  it('isConfirmed for exact_phone', () => expect(isConfirmed('exact_phone')).toBe(true));
  it('isConfirmed for exact_email', () => expect(isConfirmed('exact_email')).toBe(true));
  it('!isConfirmed for name_location', () => expect(isConfirmed('name_location')).toBe(false));
  it('isSuggestion for name_location', () => expect(isSuggestion('name_location')).toBe(true));
  it('isSuggestion for fuzzy_name_postcode', () => expect(isSuggestion('fuzzy_name_postcode')).toBe(true));
  it('!isSuggestion for exact_phone', () => expect(isSuggestion('exact_phone')).toBe(false));

  it('isPhoneNotOnFile: phone scraped, email match only', () => {
    const scraped: LookupRequest = { phone: '07712345678', email: 'a@b.com', name: null, location: null };
    const matches: CandidateMatch[] = [{ ...fixtureMatch('single_email') }];
    expect(isPhoneNotOnFile(scraped, matches)).toBe(true);
  });

  it('isPhoneNotOnFile: false when phone matched', () => {
    const scraped: LookupRequest = { phone: '07712345678', email: null, name: null, location: null };
    const matches: CandidateMatch[] = [fixtureMatch('single_phone')];
    expect(isPhoneNotOnFile(scraped, matches)).toBe(false);
  });

  it('isPhoneNotOnFile: false when no phone scraped', () => {
    const scraped: LookupRequest = { phone: null, email: 'a@b.com', name: null, location: null };
    const matches: CandidateMatch[] = [fixtureMatch('single_email')];
    expect(isPhoneNotOnFile(scraped, matches)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Unit: normalisePhoneE164
// ---------------------------------------------------------------------------

describe('normalisePhoneE164', () => {
  it('07... → +44...', () => expect(normalisePhoneE164('07712 345678')).toBe('+447712345678'));
  it('already +44', () => expect(normalisePhoneE164('+447712345678')).toBe('+447712345678'));
  it('+44 with spaces', () => expect(normalisePhoneE164('+44 7712 345678')).toBe('+447712345678'));
  it('44 without +', () => expect(normalisePhoneE164('447712345678')).toBe('+447712345678'));
  it('returns original if unparseable', () => expect(normalisePhoneE164('short')).toBe('short'));
});
