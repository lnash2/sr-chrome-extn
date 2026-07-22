import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderPanel, destroyPanel, relativeDate, licenceStatus, type PanelState } from '../panel';
import type { CandidateMatch, MatchResponse } from '@/lib/types';
import { FIXTURES } from '@/lib/mockApi';

// --- Helpers ---

function getHost(): HTMLElement | null {
  return document.getElementById('sr-panel-host');
}

function shadow(): ShadowRoot {
  const host = getHost();
  if (!host?.shadowRoot) throw new Error('No shadow root');
  return host.shadowRoot;
}

function panel(): Element {
  const el = shadow().querySelector('.sr-panel');
  if (!el) throw new Error('.sr-panel not found');
  return el;
}

function panelText(): string {
  return panel().textContent ?? '';
}

function matchState(matches: CandidateMatch[], duration_ms = 38): PanelState {
  const resp: MatchResponse = { matches, metadata: { duration_ms } };
  return { status: 'match', data: { ok: true as const, data: resp } };
}

// Convenience: pull a single match from a named fixture
function fixtureMatch(name: string): CandidateMatch {
  return FIXTURES[name].matches[0];
}

// --- Shadow DOM isolation ---

describe('Panel — Shadow DOM', () => {
  afterEach(() => destroyPanel());

  it('creates a shadow root', () => {
    renderPanel({ status: 'idle' });
    expect(getHost()).not.toBeNull();
    expect(getHost()!.shadowRoot).not.toBeNull();
  });

  it('does not leak selectors into main DOM', () => {
    renderPanel({ status: 'idle' });
    expect(document.querySelector('.sr-panel')).toBeNull();
    expect(shadow().querySelector('.sr-panel')).not.toBeNull();
  });

  it('reuses the host on re-render', () => {
    renderPanel({ status: 'idle' });
    const h1 = getHost();
    renderPanel({ status: 'searching' });
    expect(getHost()).toBe(h1);
  });

  it('destroyPanel removes host', () => {
    renderPanel({ status: 'idle' });
    destroyPanel();
    expect(getHost()).toBeNull();
  });
});

// --- All states ---

describe('Panel — state rendering', () => {
  afterEach(() => destroyPanel());

  it('idle: shows search icon and message', () => {
    renderPanel({ status: 'idle' });
    expect(panel().getAttribute('data-status')).toBe('idle');
    expect(panelText()).toContain('No candidate detected');
  });

  it('searching: shows spinner and badge', () => {
    renderPanel({ status: 'searching' });
    expect(panel().getAttribute('data-status')).toBe('searching');
    expect(shadow().querySelector('.sr-spinner')).not.toBeNull();
    expect(panelText()).toContain('Searching');
  });

  it('no-match: shows warning icon', () => {
    renderPanel({ status: 'no-match' });
    expect(panel().getAttribute('data-status')).toBe('no-match');
    expect(panelText()).toContain('No match found');
  });

  it('error: shows message text', () => {
    renderPanel({ status: 'error', error: 'Service worker timed out' });
    expect(panel().getAttribute('data-status')).toBe('error');
    expect(panelText()).toContain('Service worker timed out');
  });

  it('logged-out: shows login prompt', () => {
    renderPanel({ status: 'logged-out' });
    expect(panel().getAttribute('data-status')).toBe('logged-out');
    expect(panelText()).toContain('Not logged in');
  });
});

// --- Fully-populated match (single_phone fixture) ---

describe('Panel — fully-populated match card', () => {
  afterEach(() => destroyPanel());

  const m = fixtureMatch('single_phone');

  it('renders candidate name', () => {
    renderPanel(matchState([m]));
    expect(panelText()).toContain('James Whitfield');
  });

  it('renders active badge in card header', () => {
    renderPanel(matchState([m]));
    const header = shadow().querySelector('.sr-card-header');
    const badge = header!.querySelector('.sr-badge--active');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('active');
  });

  it('renders confidence badge', () => {
    renderPanel(matchState([m]));
    const badge = shadow().querySelector('.sr-badge--phone');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('Phone');
  });

  it('renders recruiter and resourcer in meta line', () => {
    renderPanel(matchState([m]));
    const meta = shadow().querySelector('.sr-meta-line');
    expect(meta).not.toBeNull();
    expect(meta!.textContent).toContain('Sarah Connor');
    expect(meta!.textContent).toContain('Alex Morgan');
  });

  it('renders licence chips with shield icon', () => {
    renderPanel(matchState([m]));
    const chips = shadow().querySelectorAll('[data-licence-status]');
    expect(chips.length).toBe(2);
  });

  it('renders job category chips', () => {
    renderPanel(matchState([m]));
    const text = panelText();
    expect(text).toContain('HGV Class 1');
    expect(text).toContain('HGV Class 2');
  });

  it('renders last booking with client name', () => {
    renderPanel(matchState([m]));
    expect(panelText()).toContain('DHL Supply Chain');
  });

  it('renders booking counts', () => {
    renderPanel(matchState([m]));
    expect(panelText()).toContain('14 co.');
    expect(panelText()).toContain('3 ag.');
  });

  it('renders available chip', () => {
    renderPanel(matchState([m]));
    const chip = shadow().querySelector('.sr-chip--available');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('Available');
  });

  it('renders engagement health chip', () => {
    renderPanel(matchState([m]));
    const chip = shadow().querySelector('[data-health="warm"]');
    expect(chip).not.toBeNull();
  });

  it('renders last note in collapsible section', () => {
    renderPanel(matchState([m]));
    const section = shadow().querySelector('[data-section="note"]');
    expect(section).not.toBeNull();
    // Body is hidden by default
    const body = shadow().querySelector('[data-body="note"]') as HTMLElement;
    expect(body.hidden).toBe(true);
    expect(body.textContent).toContain('night shifts');
  });

  it('renders activity collapsible section', () => {
    renderPanel(matchState([m]));
    const section = shadow().querySelector('[data-section="activity"]');
    expect(section).not.toBeNull();
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

  it('renders result metadata', () => {
    renderPanel(matchState([m], 38));
    expect(panelText()).toContain('38ms');
    expect(panelText()).toContain('1 match');
  });
});

// --- Warning precedence ---

describe('Panel — warning banners', () => {
  afterEach(() => destroyPanel());

  it('unsuitable warning appears above card header', () => {
    renderPanel(matchState([fixtureMatch('unsuitable')]));
    const warning = shadow().querySelector('[data-warning="unsuitable"]');
    expect(warning).not.toBeNull();
    expect(warning!.textContent).toContain('Marked unsuitable');
    expect(warning!.textContent).toContain('Failed drug test');
    // Warning is before the card header in DOM order
    const header = shadow().querySelector('.sr-card-header');
    expect(warning!.compareDocumentPosition(header!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('deletion warning appears', () => {
    renderPanel(matchState([fixtureMatch('deletion_flagged')]));
    const warning = shadow().querySelector('[data-warning="deletion"]');
    expect(warning).not.toBeNull();
    expect(warning!.textContent).toContain('Flagged for deletion');
  });

  it('both warnings shown when both flags set', () => {
    const m: CandidateMatch = {
      ...fixtureMatch('unsuitable'),
      marked_for_deletion: true,
    };
    renderPanel(matchState([m]));
    const unsuitable = shadow().querySelector('[data-warning="unsuitable"]');
    const deletion = shadow().querySelector('[data-warning="deletion"]');
    expect(unsuitable).not.toBeNull();
    expect(deletion).not.toBeNull();
    // Unsuitable comes first
    expect(unsuitable!.compareDocumentPosition(deletion!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

// --- Sparse record ---

describe('Panel — sparse record rendering', () => {
  afterEach(() => destroyPanel());

  const sparse = fixtureMatch('sparse');

  it('renders without errors', () => {
    expect(() => renderPanel(matchState([sparse]))).not.toThrow();
  });

  it('does not show "null" or "undefined" anywhere', () => {
    renderPanel(matchState([sparse]));
    const text = panelText();
    expect(text).not.toContain('null');
    expect(text).not.toContain('undefined');
  });

  it('omits meta line when no recruiter/resourcer/registered_at', () => {
    renderPanel(matchState([sparse]));
    expect(shadow().querySelector('.sr-meta-line')).toBeNull();
  });

  it('omits summary strip when no data', () => {
    renderPanel(matchState([sparse]));
    expect(shadow().querySelector('.sr-summary')).toBeNull();
  });

  it('omits collapsible sections when no note/activity', () => {
    renderPanel(matchState([sparse]));
    expect(shadow().querySelector('.sr-section')).toBeNull();
  });

  it('still renders name and footer', () => {
    renderPanel(matchState([sparse]));
    expect(panelText()).toContain('Sparse Record');
    expect(shadow().querySelector('[data-deeplink]')).not.toBeNull();
  });
});

// --- Expired / expiring licence colour logic ---

describe('Panel — licence status colours', () => {
  afterEach(() => destroyPanel());

  it('marks expired licence chip', () => {
    const m: CandidateMatch = {
      ...fixtureMatch('sparse'),
      licence_categories: [{ category: 'C', expiry_date: '2020-01-01' }],
    };
    renderPanel(matchState([m]));
    const chip = shadow().querySelector('[data-licence-status="expired"]');
    expect(chip).not.toBeNull();
    expect(chip!.classList.contains('sr-chip--expired')).toBe(true);
  });

  it('marks expiring licence chip (<30 days)', () => {
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

  it('marks valid licence chip (>30 days)', () => {
    const far = new Date(Date.now() + 365 * 86_400_000).toISOString();
    const m: CandidateMatch = {
      ...fixtureMatch('sparse'),
      licence_categories: [{ category: 'B', expiry_date: far }],
    };
    renderPanel(matchState([m]));
    const chip = shadow().querySelector('[data-licence-status="valid"]');
    expect(chip).not.toBeNull();
    expect(chip!.classList.contains('sr-chip--valid')).toBe(true);
  });

  it('licence with no expiry_date is valid', () => {
    const m: CandidateMatch = {
      ...fixtureMatch('sparse'),
      licence_categories: [{ category: 'B', expiry_date: null }],
    };
    renderPanel(matchState([m]));
    const chip = shadow().querySelector('[data-licence-status="valid"]');
    expect(chip).not.toBeNull();
  });
});

// --- Multi-match ---

describe('Panel — multiple matches', () => {
  afterEach(() => destroyPanel());

  const matches = FIXTURES.multiple.matches;

  it('renders match list with rows', () => {
    renderPanel(matchState(matches));
    const rows = shadow().querySelectorAll('.sr-match-row');
    expect(rows.length).toBe(2);
  });

  it('rows sorted by confidence (exact_phone before name_location)', () => {
    renderPanel(matchState(matches));
    const rows = shadow().querySelectorAll('.sr-match-row');
    expect(rows[0].textContent).toContain('David Smith');
    expect(rows[1].textContent).toContain('Dave Smith');
  });

  it('each row shows name, status badge, confidence badge', () => {
    renderPanel(matchState(matches));
    const firstRow = shadow().querySelectorAll('.sr-match-row')[0];
    expect(firstRow.querySelector('.sr-badge--active')).not.toBeNull();
    expect(firstRow.querySelector('.sr-badge--phone')).not.toBeNull();
  });

  it('shows last booking date on row if present', () => {
    renderPanel(matchState(matches));
    const dateEl = shadow().querySelector('.sr-match-row-date');
    expect(dateEl).not.toBeNull();
  });

  it('badge shows "2 matches"', () => {
    renderPanel(matchState(matches));
    expect(panelText()).toContain('2 matches');
  });

  it('clicking a row expands to full card', () => {
    renderPanel(matchState(matches));
    const row = shadow().querySelector('.sr-match-row') as HTMLElement;
    row.click();
    // After expansion, the single-match card should render
    expect(shadow().querySelector('.sr-candidate-name')).not.toBeNull();
    expect(shadow().querySelector('[data-back]')).not.toBeNull();
  });

  it('clicking back returns to match list', () => {
    renderPanel(matchState(matches));
    // Expand first
    (shadow().querySelector('.sr-match-row') as HTMLElement).click();
    // Click back
    (shadow().querySelector('[data-back]') as HTMLElement).click();
    // List should be visible again
    expect(shadow().querySelectorAll('.sr-match-row').length).toBe(2);
  });
});

// --- Unsuitable fixture (combined: inactive + expired + high points) ---

describe('Panel — unsuitable/inactive fixture', () => {
  afterEach(() => destroyPanel());

  const m = fixtureMatch('unsuitable');

  it('shows inactive badge', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelector('.sr-badge--inactive')).not.toBeNull();
  });

  it('shows licence points >=9 with expired styling', () => {
    renderPanel(matchState([m]));
    const chip = shadow().querySelector('[data-points="9"]');
    expect(chip).not.toBeNull();
    expect(chip!.classList.contains('sr-chip--expired')).toBe(true);
  });

  it('shows expired licence', () => {
    renderPanel(matchState([m]));
    const expired = shadow().querySelector('[data-licence-status="expired"]');
    expect(expired).not.toBeNull();
  });

  it('shows note about drug test', () => {
    renderPanel(matchState([m]));
    const noteBody = shadow().querySelector('[data-body="note"]');
    expect(noteBody!.textContent).toContain('drug test');
  });
});

// --- name_location caveat ---

describe('Panel — name_location caveat', () => {
  afterEach(() => destroyPanel());

  it('shows loose match caveat for name_location confidence', () => {
    const m: CandidateMatch = { ...fixtureMatch('single_phone'), confidence: 'name_location' };
    renderPanel(matchState([m]));
    const caveat = shadow().querySelector('.sr-caveat');
    expect(caveat).not.toBeNull();
    expect(caveat!.textContent).toContain('verify phone');
  });

  it('does not show caveat for exact_phone', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(shadow().querySelector('.sr-caveat')).toBeNull();
  });
});

// --- Collapsible section toggle ---

describe('Panel — collapsible sections', () => {
  afterEach(() => destroyPanel());

  it('note section body hidden by default', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const body = shadow().querySelector('[data-body="note"]') as HTMLElement;
    expect(body.hidden).toBe(true);
  });

  it('clicking trigger reveals body', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const trigger = shadow().querySelector('[data-toggle="note"]') as HTMLElement;
    trigger.click();
    const body = shadow().querySelector('[data-body="note"]') as HTMLElement;
    expect(body.hidden).toBe(false);
  });

  it('clicking trigger again hides body', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const trigger = shadow().querySelector('[data-toggle="note"]') as HTMLElement;
    trigger.click(); // open
    trigger.click(); // close
    const body = shadow().querySelector('[data-body="note"]') as HTMLElement;
    expect(body.hidden).toBe(true);
  });
});

// --- State transitions ---

describe('Panel — state transitions', () => {
  afterEach(() => destroyPanel());

  it('idle → searching → match', () => {
    renderPanel({ status: 'idle' });
    expect(panel().getAttribute('data-status')).toBe('idle');
    renderPanel({ status: 'searching' });
    expect(panel().getAttribute('data-status')).toBe('searching');
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(panel().getAttribute('data-status')).toBe('match');
    expect(panelText()).toContain('James Whitfield');
  });

  it('searching → error preserves error message', () => {
    renderPanel({ status: 'searching' });
    renderPanel({ status: 'error', error: 'Timeout' });
    expect(panel().getAttribute('data-status')).toBe('error');
    expect(panelText()).toContain('Timeout');
  });
});

// --- Unit: relativeDate ---

describe('relativeDate', () => {
  it('returns "just now" for recent timestamp', () => {
    expect(relativeDate(new Date().toISOString())).toBe('just now');
  });

  it('returns minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(relativeDate(fiveMinAgo)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const threeHrsAgo = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(relativeDate(threeHrsAgo)).toBe('3h ago');
  });

  it('returns days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(relativeDate(twoDaysAgo)).toBe('2d ago');
  });

  it('returns weeks ago', () => {
    const threeWeeksAgo = new Date(Date.now() - 21 * 86_400_000).toISOString();
    expect(relativeDate(threeWeeksAgo)).toBe('3w ago');
  });

  it('returns months ago', () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();
    expect(relativeDate(ninetyDaysAgo)).toBe('3mo ago');
  });

  it('handles future dates', () => {
    const inTwoDays = new Date(Date.now() + 2 * 86_400_000).toISOString();
    expect(relativeDate(inTwoDays)).toBe('in 2d');
  });
});

// --- Unit: licenceStatus ---

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
