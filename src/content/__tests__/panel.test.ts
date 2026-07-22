import { describe, it, expect, afterEach } from 'vitest';
import { renderPanel, destroyPanel, relativeDate, licenceStatus, isConfirmed, isSuggestion, isPhoneNotOnFile, isFreshNote, type PanelState } from '../panel';
import type { CandidateMatch, LookupRequest, MatchResponse, LastNote } from '@/lib/types';
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

  it('creates a shadow root', () => {
    renderPanel({ status: 'searching' });
    expect(getHost()!.shadowRoot).not.toBeNull();
  });

  it('does not leak selectors', () => {
    renderPanel({ status: 'searching' });
    expect(document.querySelector('.sr-bar')).toBeNull();
    expect(shadow().querySelector('.sr-bar')).not.toBeNull();
  });

  it('reuses host on re-render', () => {
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

  it('applies margin-top', () => {
    renderPanel({ status: 'searching' });
    expect(parseInt(document.documentElement.style.marginTop)).toBeGreaterThan(0);
  });

  it('removes margin-top on destroy', () => {
    renderPanel({ status: 'searching' });
    destroyPanel();
    expect(document.documentElement.style.marginTop).toBe('');
  });

  it('removes margin-top on idle', () => {
    renderPanel({ status: 'searching' });
    renderPanel({ status: 'idle' });
    expect(document.documentElement.style.marginTop).toBe('');
  });
});

// ---------------------------------------------------------------------------
// State rendering
// ---------------------------------------------------------------------------

describe('Bar — state rendering', () => {
  afterEach(() => destroyPanel());

  it('idle: renders nothing', () => {
    renderPanel({ status: 'idle' });
    expect(getHost()).toBeNull();
  });

  it('searching: spinner', () => {
    renderPanel({ status: 'searching' });
    expect(shadow().querySelector('.sr-spinner')).not.toBeNull();
    expect(barText()).toContain('Searching Swift Recruit');
  });

  it('error: red tint', () => {
    renderPanel({ status: 'error', error: 'Timeout' });
    expect(barText()).toContain('Timeout');
    expect(shadow().querySelector('.sr-state-row--error')).not.toBeNull();
  });

  it('logged-out: teal prompt', () => {
    renderPanel({ status: 'logged-out' });
    expect(barText()).toContain('Log in via the extension popup');
  });
});

// ---------------------------------------------------------------------------
// .co.uk domain in all deep links
// ---------------------------------------------------------------------------

describe('Bar — .co.uk domain', () => {
  afterEach(() => destroyPanel());

  it('deep link uses .co.uk', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const link = shadow().querySelector('[data-deeplink]') as HTMLAnchorElement;
    expect(link.href).toContain('swift-recruit.co.uk');
    expect(link.href).not.toContain('swift-recruit.com');
  });

  it('notes popover view-all link uses .co.uk', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const footer = shadow().querySelector('.sr-note-popover-footer a') as HTMLAnchorElement;
    expect(footer.href).toContain('swift-recruit.co.uk');
  });

  it('suggestion CRM button uses .co.uk', () => {
    renderPanel(matchState([fixtureMatch('suggestion')], { phone: null, email: null, name: 'J', location: 'X' }));
    const link = shadow().querySelector('[data-deeplink]') as HTMLAnchorElement;
    expect(link.href).toContain('swift-recruit.co.uk');
  });
});

// ---------------------------------------------------------------------------
// CONFIRMED tier
// ---------------------------------------------------------------------------

describe('Bar — CONFIRMED tier', () => {
  afterEach(() => destroyPanel());
  const m = fixtureMatch('single_phone');

  it('"In CRM ✓" badge', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-conf-tier="confirmed"]')!.textContent).toContain('In CRM');
  });

  it('"phone verified" detail', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-conf-detail]')!.textContent).toContain('phone verified');
  });

  it('primary CRM button', () => {
    renderPanel(matchState([m]));
    const link = shadow().querySelector('[data-deeplink]') as HTMLElement;
    expect(link.classList.contains('sr-btn--primary')).toBe(true);
    expect(link.textContent).toContain('Open in CRM');
  });

  it('no suggestion tint', () => {
    renderPanel(matchState([m]));
    expect(bar().classList.contains('sr-bar--suggestion')).toBe(false);
  });

  it('renders candidate details', () => {
    renderPanel(matchState([m]));
    expect(barText()).toContain('James Whitfield');
    expect(shadow().querySelector('.sr-badge--active')).not.toBeNull();
    expect(shadow().querySelector('.sr-meta')!.textContent).toContain('Sarah Connor');
  });
});

// ---------------------------------------------------------------------------
// UNCONFIRMED SUGGESTION tier
// ---------------------------------------------------------------------------

describe('Bar — UNCONFIRMED tier', () => {
  afterEach(() => destroyPanel());
  const m = fixtureMatch('suggestion');
  const scraped: LookupRequest = { phone: null, email: null, name: 'J', location: 'X' };

  it('amber tint', () => {
    renderPanel(matchState([m], scraped));
    expect(bar().classList.contains('sr-bar--suggestion')).toBe(true);
  });

  it('"Possible match — NOT confirmed" badge', () => {
    renderPanel(matchState([m], scraped));
    expect(shadow().querySelector('[data-conf-tier="suggestion"]')!.textContent).toContain('NOT confirmed');
  });

  it('amber CRM button "Review possible match"', () => {
    renderPanel(matchState([m], scraped));
    const link = shadow().querySelector('[data-deeplink]') as HTMLElement;
    expect(link.classList.contains('sr-btn--amber')).toBe(true);
    expect(link.textContent).toContain('Review possible match');
  });

  it('verify phone caveat', () => {
    renderPanel(matchState([m], scraped));
    expect(shadow().querySelector('[data-caveat]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// NOT IN CRM
// ---------------------------------------------------------------------------

describe('Bar — NOT IN CRM', () => {
  afterEach(() => destroyPanel());

  it('prominent message and slate tint', () => {
    renderPanel(noMatchState());
    expect(barText()).toContain('Not in Swift Recruit');
    expect(bar().classList.contains('sr-bar--not-in-crm')).toBe(true);
  });

  it('shows normalised scraped phone', () => {
    renderPanel(noMatchState({ phone: '07712 345678', email: null, name: null, location: null }));
    expect(shadow().querySelector('[data-scraped-phone]')!.textContent).toContain('+447712345678');
  });
});

// ---------------------------------------------------------------------------
// Notes popover — recent_notes
// ---------------------------------------------------------------------------

describe('Bar — notes popover', () => {
  afterEach(() => destroyPanel());
  const m = fixtureMatch('single_phone');

  it('shows multiple recent_notes entries', () => {
    renderPanel(matchState([m]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    const entries = shadow().querySelectorAll('.sr-note-popover-entry');
    expect(entries.length).toBe(3);
  });

  it('newest note first', () => {
    renderPanel(matchState([m]));
    const entries = shadow().querySelectorAll('.sr-note-popover-entry');
    expect(entries[0].textContent).toContain('night shifts');
  });

  it('shows author and relative time per note', () => {
    renderPanel(matchState([m]));
    const meta = shadow().querySelectorAll('.sr-note-popover-meta');
    expect(meta[0].textContent).toContain('Sarah Connor');
  });

  it('shows "View all notes in CRM" footer link', () => {
    renderPanel(matchState([m]));
    const footer = shadow().querySelector('.sr-note-popover-footer a') as HTMLAnchorElement;
    expect(footer).not.toBeNull();
    expect(footer.textContent).toContain('View all notes');
    expect(footer.href).toContain('/swift/candidates/10421');
  });

  it('falls back to last_note when recent_notes absent', () => {
    const sparse = { ...fixtureMatch('sparse'), last_note: { text: 'Fallback note', created_at: '2026-01-01T00:00:00Z', author: 'Test' } };
    renderPanel(matchState([sparse]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    const entries = shadow().querySelectorAll('.sr-note-popover-entry');
    expect(entries.length).toBe(1);
    expect(entries[0].textContent).toContain('Fallback note');
  });

  it('no note button when both absent', () => {
    renderPanel(matchState([fixtureMatch('sparse')]));
    expect(shadow().querySelector('[data-note-toggle]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fresh-note indicator
// ---------------------------------------------------------------------------

describe('Bar — fresh-note dot', () => {
  afterEach(() => destroyPanel());

  it('shows teal dot when newest note < 24h old', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const dot = shadow().querySelector('[data-fresh-dot]');
    expect(dot).not.toBeNull();
    expect(dot!.getAttribute('title')).toContain('Note added');
  });

  it('no dot when newest note > 24h old', () => {
    const m: CandidateMatch = {
      ...fixtureMatch('sparse'),
      recent_notes: [{ text: 'Old note', created_at: '2025-01-01T00:00:00Z', author: 'X' }],
    };
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-fresh-dot]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Next-booking chip
// ---------------------------------------------------------------------------

describe('Bar — next-booking chip', () => {
  afterEach(() => destroyPanel());

  it('renders teal "Booked" chip when next_booking present', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const chip = shadow().querySelector('[data-next-booking]');
    expect(chip).not.toBeNull();
    expect(chip!.classList.contains('sr-chip--booked')).toBe(true);
    expect(chip!.textContent).toContain('Booked');
    expect(chip!.textContent).toContain('XPO Logistics');
  });

  it('no chip when next_booking absent', () => {
    renderPanel(matchState([fixtureMatch('sparse')]));
    expect(shadow().querySelector('[data-next-booking]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 90d booking count
// ---------------------------------------------------------------------------

describe('Bar — 90d booking count', () => {
  afterEach(() => destroyPanel());

  it('shows "N shifts · 90d" when recent_booking_count_90d present', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const chip = shadow().querySelector('[data-booking-90d]');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('8 shifts');
    expect(chip!.textContent).toContain('90d');
  });

  it('falls back to lifetime counts when absent', () => {
    const m: CandidateMatch = { ...fixtureMatch('single_phone') };
    delete (m as Record<string, unknown>).recent_booking_count_90d;
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-booking-90d]')).toBeNull();
    expect(barText()).toContain('14 co.');
  });
});

// ---------------------------------------------------------------------------
// Open tasks chip + popover
// ---------------------------------------------------------------------------

describe('Bar — open tasks', () => {
  afterEach(() => destroyPanel());

  it('renders task chip with count', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const chip = shadow().querySelector('[data-task-toggle]');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('2 open tasks');
  });

  it('amber styling when overdue task present', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const chip = shadow().querySelector('[data-task-toggle]');
    expect(chip!.classList.contains('sr-chip--tasks-overdue')).toBe(true);
  });

  it('neutral styling when no overdue', () => {
    const m: CandidateMatch = {
      ...fixtureMatch('sparse'),
      open_tasks: [{ title: 'Do thing', due_date: new Date(Date.now() + 86_400_000).toISOString(), owner: 'X', overdue: false }],
    };
    renderPanel(matchState([m]));
    const chip = shadow().querySelector('[data-task-toggle]');
    expect(chip!.classList.contains('sr-chip--tasks-overdue')).toBe(false);
    expect(chip!.classList.contains('sr-chip--tasks')).toBe(true);
  });

  it('clicking chip opens task popover', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-task-toggle]') as HTMLElement).click();
    const popover = shadow().querySelector('[data-task-popover]') as HTMLElement;
    expect(popover.hidden).toBe(false);
  });

  it('popover lists each task with title', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-task-toggle]') as HTMLElement).click();
    const items = shadow().querySelectorAll('[data-task]');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Chase CPC renewal');
    expect(items[1].textContent).toContain('Update emergency contact');
  });

  it('overdue task shows "overdue" in red', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-task-toggle]') as HTMLElement).click();
    const overdue = shadow().querySelector('.sr-task-overdue');
    expect(overdue).not.toBeNull();
    expect(overdue!.textContent).toContain('overdue');
  });

  it('no chip when open_tasks absent', () => {
    renderPanel(matchState([fixtureMatch('sparse')]));
    expect(shadow().querySelector('[data-task-toggle]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Phone not on file
// ---------------------------------------------------------------------------

describe('Bar — phone not on file', () => {
  afterEach(() => destroyPanel());

  it('shows note when phone scraped but matched by email', () => {
    const m = fixtureMatch('phone_not_on_file');
    renderPanel(matchState([m], { phone: '07742613765', email: 'x@y.com', name: null, location: null }));
    expect(shadow().querySelector('[data-phone-note]')!.textContent).toContain('Phone not on file');
  });

  it('no note for exact_phone', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(shadow().querySelector('[data-phone-note]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Warning tint
// ---------------------------------------------------------------------------

describe('Bar — warning tint', () => {
  afterEach(() => destroyPanel());

  it('unsuitable: red tint + warning text', () => {
    renderPanel(matchState([fixtureMatch('unsuitable')]));
    expect(bar().classList.contains('sr-bar--unsuitable')).toBe(true);
    expect(shadow().querySelector('[data-warning="unsuitable"]')!.textContent).toContain('Failed drug test');
  });

  it('deletion: amber tint', () => {
    renderPanel(matchState([fixtureMatch('deletion_flagged')]));
    expect(bar().classList.contains('sr-bar--deletion')).toBe(true);
  });

  it('both: unsuitable precedence', () => {
    const m: CandidateMatch = { ...fixtureMatch('unsuitable'), marked_for_deletion: true };
    renderPanel(matchState([m]));
    expect(bar().classList.contains('sr-bar--unsuitable')).toBe(true);
    expect(bar().classList.contains('sr-bar--deletion')).toBe(true);
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

  it('no "null"/"undefined"', () => {
    renderPanel(matchState([sparse]));
    expect(barText()).not.toContain('null');
    expect(barText()).not.toContain('undefined');
  });

  it('no note button, no task chip, no next-booking, no 90d chip', () => {
    renderPanel(matchState([sparse]));
    expect(shadow().querySelector('[data-note-toggle]')).toBeNull();
    expect(shadow().querySelector('[data-task-toggle]')).toBeNull();
    expect(shadow().querySelector('[data-next-booking]')).toBeNull();
    expect(shadow().querySelector('[data-booking-90d]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Licence status colours
// ---------------------------------------------------------------------------

describe('Bar — licence colours', () => {
  afterEach(() => destroyPanel());

  it('expired → red', () => {
    const m: CandidateMatch = { ...fixtureMatch('sparse'), licence_categories: [{ category: 'C', expiry_date: '2020-01-01' }] };
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-licence-status="expired"]')!.classList.contains('sr-chip--expired')).toBe(true);
  });

  it('expiring → amber', () => {
    const m: CandidateMatch = { ...fixtureMatch('sparse'), licence_categories: [{ category: 'C', expiry_date: new Date(Date.now() + 15 * 86_400_000).toISOString() }] };
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-licence-status="expiring"]')!.classList.contains('sr-chip--expiring')).toBe(true);
  });

  it('valid → neutral', () => {
    const m: CandidateMatch = { ...fixtureMatch('sparse'), licence_categories: [{ category: 'B', expiry_date: new Date(Date.now() + 365 * 86_400_000).toISOString() }] };
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-licence-status="valid"]')).not.toBeNull();
  });

  it('points >= 9 → red', () => {
    renderPanel(matchState([fixtureMatch('unsuitable')]));
    expect(shadow().querySelector('[data-points="9"]')!.classList.contains('sr-chip--expired')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Collapse
// ---------------------------------------------------------------------------

describe('Bar — collapse', () => {
  afterEach(() => destroyPanel());

  it('collapses to slim strip', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-collapse]') as HTMLElement).click();
    expect(bar().classList.contains('sr-bar--collapsed')).toBe(true);
    expect(barText()).toContain('1 match');
  });

  it('expands back', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-collapse]') as HTMLElement).click();
    (shadow().querySelector('[data-collapse]') as HTMLElement).click();
    expect(bar().classList.contains('sr-bar--collapsed')).toBe(false);
    expect(shadow().querySelector('[data-deeplink]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Multi-match pills
// ---------------------------------------------------------------------------

describe('Bar — multi-match', () => {
  afterEach(() => destroyPanel());
  const matches = FIXTURES.multiple.matches;

  it('renders pills sorted by confidence', () => {
    renderPanel(matchState(matches));
    const pills = shadow().querySelectorAll('.sr-pill');
    expect(pills.length).toBe(2);
    expect(pills[0].textContent).toContain('David Smith');
  });

  it('clicking pill expands row', () => {
    renderPanel(matchState(matches));
    (shadow().querySelector('.sr-pill') as HTMLElement).click();
    expect(shadow().querySelector('.sr-expanded')).not.toBeNull();
  });

  it('caveat when suggestion present', () => {
    renderPanel(matchState(matches));
    expect(shadow().querySelector('[data-caveat]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

describe('Bar — transitions', () => {
  afterEach(() => destroyPanel());

  it('idle → searching → match', () => {
    renderPanel({ status: 'idle' });
    expect(getHost()).toBeNull();
    renderPanel({ status: 'searching' });
    expect(bar().getAttribute('data-status')).toBe('searching');
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(barText()).toContain('James Whitfield');
  });

  it('match → idle cleans up', () => {
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
  it('valid for null', () => expect(licenceStatus({ category: 'B', expiry_date: null })).toBe('valid'));
  it('expired', () => expect(licenceStatus({ category: 'C', expiry_date: '2020-01-01' })).toBe('expired'));
  it('expiring', () => expect(licenceStatus({ category: 'C', expiry_date: new Date(Date.now() + 15 * 86_400_000).toISOString() })).toBe('expiring'));
  it('valid', () => expect(licenceStatus({ category: 'B', expiry_date: new Date(Date.now() + 365 * 86_400_000).toISOString() })).toBe('valid'));
});

// ---------------------------------------------------------------------------
// Unit: tier helpers
// ---------------------------------------------------------------------------

describe('tier helpers', () => {
  it('isConfirmed', () => {
    expect(isConfirmed('exact_phone')).toBe(true);
    expect(isConfirmed('exact_email')).toBe(true);
    expect(isConfirmed('name_location')).toBe(false);
  });
  it('isSuggestion', () => {
    expect(isSuggestion('name_location')).toBe(true);
    expect(isSuggestion('exact_phone')).toBe(false);
  });
  it('isPhoneNotOnFile', () => {
    expect(isPhoneNotOnFile({ phone: '07712345678', email: 'a@b.com', name: null, location: null }, [fixtureMatch('single_email')])).toBe(true);
    expect(isPhoneNotOnFile({ phone: '07712345678', email: null, name: null, location: null }, [fixtureMatch('single_phone')])).toBe(false);
    expect(isPhoneNotOnFile({ phone: null, email: 'a@b.com', name: null, location: null }, [fixtureMatch('single_email')])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Unit: isFreshNote
// ---------------------------------------------------------------------------

describe('isFreshNote', () => {
  it('true for note < 24h old', () => {
    expect(isFreshNote({ text: 'x', created_at: new Date(Date.now() - 3_600_000).toISOString(), author: null })).toBe(true);
  });
  it('false for note > 24h old', () => {
    expect(isFreshNote({ text: 'x', created_at: '2025-01-01T00:00:00Z', author: null })).toBe(false);
  });
  it('false for invalid date', () => {
    expect(isFreshNote({ text: 'x', created_at: 'not-a-date', author: null })).toBe(false);
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
  it('unparseable', () => expect(normalisePhoneE164('short')).toBe('short'));
});
