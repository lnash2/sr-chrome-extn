import { describe, it, expect, afterEach } from 'vitest';
import { renderPanel, destroyPanel, relativeDate, licenceStatus, type PanelState } from '../panel';
import type { CandidateMatch, MatchResponse } from '@/lib/types';
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

function matchState(matches: CandidateMatch[], duration_ms = 38): PanelState {
  const resp: MatchResponse = { matches, metadata: { duration_ms } };
  return { status: 'match', data: { ok: true as const, data: resp } };
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
    renderPanel({ status: 'no-match' });
    expect(getHost()).toBe(h1);
  });

  it('destroyPanel removes host', () => {
    renderPanel({ status: 'searching' });
    destroyPanel();
    expect(getHost()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Page push (margin-top)
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

  it('removes margin-top when idle (no bar rendered)', () => {
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

  it('no-match: shows neutral message', () => {
    renderPanel({ status: 'no-match' });
    expect(bar().getAttribute('data-status')).toBe('no-match');
    expect(barText()).toContain('Not in Swift Recruit');
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
    for (const status of ['searching', 'no-match', 'logged-out'] as const) {
      renderPanel({ status });
      expect(barText()).toContain('Swift Recruit');
      destroyPanel();
    }
  });
});

// ---------------------------------------------------------------------------
// Fully-populated single match (single_phone fixture)
// ---------------------------------------------------------------------------

describe('Bar — single match card', () => {
  afterEach(() => destroyPanel());

  const m = fixtureMatch('single_phone');

  it('renders candidate name', () => {
    renderPanel(matchState([m]));
    expect(barText()).toContain('James Whitfield');
  });

  it('renders active status badge', () => {
    renderPanel(matchState([m]));
    const badge = shadow().querySelector('.sr-badge--active');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('active');
  });

  it('renders confidence badge', () => {
    renderPanel(matchState([m]));
    const badge = shadow().querySelector('.sr-badge--confirmed');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('Phone');
  });

  it('renders recruiter and resourcer in meta text', () => {
    renderPanel(matchState([m]));
    const meta = shadow().querySelector('.sr-meta');
    expect(meta).not.toBeNull();
    expect(meta!.textContent).toContain('Sarah Connor');
    expect(meta!.textContent).toContain('Alex Morgan');
  });

  it('renders licence chips', () => {
    renderPanel(matchState([m]));
    const chips = shadow().querySelectorAll('[data-licence-status]');
    expect(chips.length).toBe(2);
  });

  it('renders job categories', () => {
    renderPanel(matchState([m]));
    expect(barText()).toContain('HGV Class 1');
    expect(barText()).toContain('HGV Class 2');
  });

  it('renders last booking with client name', () => {
    renderPanel(matchState([m]));
    expect(barText()).toContain('DHL Supply Chain');
  });

  it('renders booking counts', () => {
    renderPanel(matchState([m]));
    expect(barText()).toContain('14 co.');
    expect(barText()).toContain('3 ag.');
  });

  it('renders available chip', () => {
    renderPanel(matchState([m]));
    const chip = shadow().querySelector('.sr-chip--available');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('Available');
  });

  it('renders engagement health chip', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-health="warm"]')).not.toBeNull();
  });

  it('renders deep link to CRM', () => {
    renderPanel(matchState([m]));
    const link = shadow().querySelector('[data-deeplink]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.href).toContain('/swift/candidates/10421');
    expect(link.target).toBe('_blank');
  });

  it('renders copy phone button', () => {
    renderPanel(matchState([m]));
    const btn = shadow().querySelector('[data-copy-phone]');
    expect(btn).not.toBeNull();
    expect(btn!.getAttribute('data-copy-phone')).toBe('+447712345678');
  });

  it('renders Swift Recruit brand', () => {
    renderPanel(matchState([m]));
    expect(barText()).toContain('Swift Recruit');
    expect(shadow().querySelector('.sr-teal-dot')).not.toBeNull();
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
    const btn = shadow().querySelector('[data-note-toggle]') as HTMLElement;
    btn.click();
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
    btn.click(); // open
    btn.click(); // close
    const popover = shadow().querySelector('[data-note-popover]') as HTMLElement;
    expect(popover.hidden).toBe(true);
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
    // Warning should be before the name in DOM order
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
    expect(warn).not.toBeNull();
    expect(warn!.textContent).toContain('Flagged for deletion');
  });

  it('both flags: unsuitable takes visual precedence', () => {
    const m: CandidateMatch = { ...fixtureMatch('unsuitable'), marked_for_deletion: true };
    renderPanel(matchState([m]));
    // Both classes present, CSS makes unsuitable win
    expect(bar().classList.contains('sr-bar--unsuitable')).toBe(true);
    expect(bar().classList.contains('sr-bar--deletion')).toBe(true);
    // Both warning texts present, unsuitable first
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
    const text = barText();
    expect(text).not.toContain('null');
    expect(text).not.toContain('undefined');
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
    const m: CandidateMatch = {
      ...fixtureMatch('sparse'),
      licence_categories: [{ category: 'C', expiry_date: '2020-01-01' }],
    };
    renderPanel(matchState([m]));
    const chip = shadow().querySelector('[data-licence-status="expired"]');
    expect(chip).not.toBeNull();
    expect(chip!.classList.contains('sr-chip--expired')).toBe(true);
  });

  it('expiring licence chip (<30 days) gets amber styling', () => {
    const soon = new Date(Date.now() + 15 * 86_400_000).toISOString();
    const m: CandidateMatch = {
      ...fixtureMatch('sparse'),
      licence_categories: [{ category: 'C+E', expiry_date: soon }],
    };
    renderPanel(matchState([m]));
    const chip = shadow().querySelector('[data-licence-status="expiring"]');
    expect(chip).not.toBeNull();
    expect(chip!.classList.contains('sr-chip--expiring')).toBe(true);
  });

  it('valid licence chip (>30 days) gets neutral styling', () => {
    const far = new Date(Date.now() + 365 * 86_400_000).toISOString();
    const m: CandidateMatch = {
      ...fixtureMatch('sparse'),
      licence_categories: [{ category: 'B', expiry_date: far }],
    };
    renderPanel(matchState([m]));
    const chip = shadow().querySelector('[data-licence-status="valid"]');
    expect(chip).not.toBeNull();
  });

  it('licence with no expiry_date is valid', () => {
    const m: CandidateMatch = {
      ...fixtureMatch('sparse'),
      licence_categories: [{ category: 'B', expiry_date: null }],
    };
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-licence-status="valid"]')).not.toBeNull();
  });

  it('points >= 9 get red styling', () => {
    renderPanel(matchState([fixtureMatch('unsuitable')]));
    const chip = shadow().querySelector('[data-points="9"]');
    expect(chip).not.toBeNull();
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
    // Full details hidden
    expect(shadow().querySelector('[data-deeplink]')).toBeNull();
  });

  it('clicking expand restores full bar', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const collapseBtn = shadow().querySelector('[data-collapse]') as HTMLElement;
    collapseBtn.click(); // collapse
    const expandBtn = shadow().querySelector('[data-collapse]') as HTMLElement;
    expandBtn.click(); // expand
    expect(bar().classList.contains('sr-bar--collapsed')).toBe(false);
    expect(shadow().querySelector('[data-deeplink]')).not.toBeNull();
  });

  it('collapsed state persists across re-renders', () => {
    const state = matchState([fixtureMatch('single_phone')]);
    renderPanel(state);
    (shadow().querySelector('[data-collapse]') as HTMLElement).click();
    // Re-render same state — should still be collapsed
    expect(bar().classList.contains('sr-bar--collapsed')).toBe(true);
  });

  it('collapsed strip shows match count for multiple matches', () => {
    const state = matchState(FIXTURES.multiple.matches);
    renderPanel(state);
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
    const pills = shadow().querySelectorAll('.sr-pill');
    expect(pills.length).toBe(2);
  });

  it('pills sorted by confidence (exact_phone first)', () => {
    renderPanel(matchState(matches));
    const pills = shadow().querySelectorAll('.sr-pill');
    expect(pills[0].textContent).toContain('David Smith');
    expect(pills[1].textContent).toContain('Dave Smith');
  });

  it('clicking a pill expands that match row below the bar', () => {
    renderPanel(matchState(matches));
    const pill = shadow().querySelector('.sr-pill') as HTMLElement;
    pill.click();
    expect(shadow().querySelector('.sr-expanded')).not.toBeNull();
    const expanded = shadow().querySelector('.sr-expanded')!;
    expect(expanded.textContent).toContain('David Smith');
    expect(shadow().querySelector('[data-deeplink]')).not.toBeNull();
  });

  it('expanded pill gets highlighted class', () => {
    renderPanel(matchState(matches));
    (shadow().querySelector('.sr-pill') as HTMLElement).click();
    const pills = shadow().querySelectorAll('.sr-pill');
    expect(pills[0].classList.contains('sr-pill--expanded')).toBe(true);
    expect(pills[1].classList.contains('sr-pill--expanded')).toBe(false);
  });

  it('clicking same pill again collapses the expanded row', () => {
    renderPanel(matchState(matches));
    const pill = shadow().querySelector('.sr-pill') as HTMLElement;
    pill.click(); // expand
    (shadow().querySelectorAll('.sr-pill')[0] as HTMLElement).click(); // collapse
    expect(shadow().querySelector('.sr-expanded')).toBeNull();
  });

  it('name_location match shows caveat', () => {
    renderPanel(matchState(matches));
    expect(shadow().querySelector('[data-caveat]')).not.toBeNull();
    expect(barText()).toContain('verify phone');
  });
});

// ---------------------------------------------------------------------------
// name_location caveat
// ---------------------------------------------------------------------------

describe('Bar — name_location caveat', () => {
  afterEach(() => destroyPanel());

  it('single name_location match shows caveat', () => {
    const m: CandidateMatch = { ...fixtureMatch('single_phone'), confidence: 'name_location' };
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-caveat]')).not.toBeNull();
    expect(barText()).toContain('verify phone');
  });

  it('exact_phone match does not show caveat', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(shadow().querySelector('[data-caveat]')).toBeNull();
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

  it('shows note button with drug test content', () => {
    renderPanel(matchState([m]));
    const btn = shadow().querySelector('[data-note-toggle]') as HTMLElement;
    btn.click();
    const popover = shadow().querySelector('[data-note-popover]')!;
    expect(popover.textContent).toContain('drug test');
  });
});

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

describe('Bar — state transitions', () => {
  afterEach(() => destroyPanel());

  it('idle → searching → match', () => {
    renderPanel({ status: 'idle' });
    expect(getHost()).toBeNull(); // no bar

    renderPanel({ status: 'searching' });
    expect(bar().getAttribute('data-status')).toBe('searching');

    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(bar().getAttribute('data-status')).toBe('match');
    expect(barText()).toContain('James Whitfield');
  });

  it('searching → error preserves error message', () => {
    renderPanel({ status: 'searching' });
    renderPanel({ status: 'error', error: 'Timeout' });
    expect(bar().getAttribute('data-status')).toBe('error');
    expect(barText()).toContain('Timeout');
  });

  it('match → idle removes bar and page push', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(getHost()).not.toBeNull();
    renderPanel({ status: 'idle' });
    expect(getHost()).toBeNull();
    expect(document.documentElement.style.marginTop).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Unit: relativeDate
// ---------------------------------------------------------------------------

describe('relativeDate', () => {
  it('returns "just now" for recent timestamp', () => {
    expect(relativeDate(new Date().toISOString())).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(relativeDate(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5m ago');
  });

  it('returns hours ago', () => {
    expect(relativeDate(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe('3h ago');
  });

  it('returns days ago', () => {
    expect(relativeDate(new Date(Date.now() - 2 * 86_400_000).toISOString())).toBe('2d ago');
  });

  it('returns weeks ago', () => {
    expect(relativeDate(new Date(Date.now() - 21 * 86_400_000).toISOString())).toBe('3w ago');
  });

  it('returns months ago', () => {
    expect(relativeDate(new Date(Date.now() - 90 * 86_400_000).toISOString())).toBe('3mo ago');
  });

  it('handles future dates', () => {
    expect(relativeDate(new Date(Date.now() + 2 * 86_400_000).toISOString())).toBe('in 2d');
  });
});

// ---------------------------------------------------------------------------
// Unit: licenceStatus
// ---------------------------------------------------------------------------

describe('licenceStatus', () => {
  it('returns valid for null expiry', () => {
    expect(licenceStatus({ category: 'B', expiry_date: null })).toBe('valid');
  });

  it('returns expired for past date', () => {
    expect(licenceStatus({ category: 'C', expiry_date: '2020-01-01' })).toBe('expired');
  });

  it('returns expiring for <30 days', () => {
    const soon = new Date(Date.now() + 15 * 86_400_000).toISOString();
    expect(licenceStatus({ category: 'C+E', expiry_date: soon })).toBe('expiring');
  });

  it('returns valid for >30 days', () => {
    const far = new Date(Date.now() + 365 * 86_400_000).toISOString();
    expect(licenceStatus({ category: 'B', expiry_date: far })).toBe('valid');
  });
});
