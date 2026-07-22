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
// Shadow DOM
// ---------------------------------------------------------------------------

describe('Bar — Shadow DOM', () => {
  afterEach(() => destroyPanel());

  it('creates shadow root', () => {
    renderPanel({ status: 'searching' });
    expect(getHost()!.shadowRoot).not.toBeNull();
  });

  it('does not leak', () => {
    renderPanel({ status: 'searching' });
    expect(document.querySelector('.sr-bar')).toBeNull();
    expect(shadow().querySelector('.sr-bar')).not.toBeNull();
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

  it('removes on destroy', () => {
    renderPanel({ status: 'searching' });
    destroyPanel();
    expect(document.documentElement.style.marginTop).toBe('');
  });

  it('removes on idle', () => {
    renderPanel({ status: 'searching' });
    renderPanel({ status: 'idle' });
    expect(document.documentElement.style.marginTop).toBe('');
  });
});

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

describe('Bar — states', () => {
  afterEach(() => destroyPanel());

  it('idle: nothing', () => { renderPanel({ status: 'idle' }); expect(getHost()).toBeNull(); });
  it('searching: spinner', () => { renderPanel({ status: 'searching' }); expect(shadow().querySelector('.sr-spinner')).not.toBeNull(); });
  it('error: red tint', () => { renderPanel({ status: 'error', error: 'Timeout' }); expect(barText()).toContain('Timeout'); });
  it('logged-out: prompt', () => { renderPanel({ status: 'logged-out' }); expect(barText()).toContain('Log in'); });
});

// ---------------------------------------------------------------------------
// Three-row layout
// ---------------------------------------------------------------------------

describe('Bar — three-row layout', () => {
  afterEach(() => destroyPanel());
  const m = fixtureMatch('single_phone');

  it('renders Row 1 with name, badges, actions', () => {
    renderPanel(matchState([m]));
    const row1 = shadow().querySelector('.sr-row-1');
    expect(row1).not.toBeNull();
    expect(row1!.textContent).toContain('James Whitfield');
    expect(row1!.querySelector('.sr-badge--active')).not.toBeNull();
    expect(row1!.querySelector('[data-conf-tier="confirmed"]')).not.toBeNull();
    expect(row1!.querySelector('[data-deeplink]')).not.toBeNull();
    expect(row1!.querySelector('[data-collapse]')).not.toBeNull();
  });

  it('renders Row 2 with chips', () => {
    renderPanel(matchState([m]));
    const row2 = shadow().querySelector('.sr-row-2');
    expect(row2).not.toBeNull();
    expect(row2!.querySelectorAll('[data-licence-status]').length).toBe(2);
    expect(row2!.textContent).toContain('HGV Class 1');
  });

  it('renders Row 3 with meta', () => {
    renderPanel(matchState([m]));
    const row3 = shadow().querySelector('.sr-row-3');
    expect(row3).not.toBeNull();
    expect(row3!.querySelector('[data-meta-row]')!.textContent).toContain('Sarah Connor');
    expect(row3!.querySelector('[data-meta-row]')!.textContent).toContain('Alex Morgan');
  });

  it('Row 3 includes last contact', () => {
    renderPanel(matchState([m]));
    const meta = shadow().querySelector('[data-meta-row]')!;
    expect(meta.textContent).toContain('Last contact');
  });

  it('Row 3 omitted when no meta', () => {
    renderPanel(matchState([fixtureMatch('sparse')]));
    expect(shadow().querySelector('.sr-row-3')).toBeNull();
  });

  it('Row 2 omitted when no chips', () => {
    const sparse = { ...fixtureMatch('sparse'), licence_categories: [], job_categories: [], licence_points: 0 };
    renderPanel(matchState([sparse]));
    expect(shadow().querySelector('.sr-row-2')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// .co.uk domain
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
    const a = shadow().querySelector('.sr-note-popover-footer a') as HTMLAnchorElement;
    expect(a.href).toContain('swift-recruit.co.uk');
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

  it('"phone verified"', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-conf-detail]')!.textContent).toContain('phone verified');
  });

  it('primary CRM button', () => {
    renderPanel(matchState([m]));
    const link = shadow().querySelector('[data-deeplink]') as HTMLElement;
    expect(link.classList.contains('sr-btn--primary')).toBe(true);
    expect(link.textContent).toContain('Open in CRM');
  });
});

// ---------------------------------------------------------------------------
// UNCONFIRMED tier
// ---------------------------------------------------------------------------

describe('Bar — UNCONFIRMED tier', () => {
  afterEach(() => destroyPanel());
  const m = fixtureMatch('suggestion');
  const scraped: LookupRequest = { phone: null, email: null, name: 'J', location: 'X' };

  it('amber tint', () => {
    renderPanel(matchState([m], scraped));
    expect(bar().classList.contains('sr-bar--suggestion')).toBe(true);
  });

  it('"NOT confirmed" badge', () => {
    renderPanel(matchState([m], scraped));
    expect(shadow().querySelector('[data-conf-tier="suggestion"]')!.textContent).toContain('NOT confirmed');
  });

  it('amber CRM button', () => {
    renderPanel(matchState([m], scraped));
    const link = shadow().querySelector('[data-deeplink]') as HTMLElement;
    expect(link.classList.contains('sr-btn--amber')).toBe(true);
    expect(link.textContent).toContain('Review possible match');
  });
});

// ---------------------------------------------------------------------------
// NOT IN CRM
// ---------------------------------------------------------------------------

describe('Bar — NOT IN CRM', () => {
  afterEach(() => destroyPanel());

  it('prominent message', () => {
    renderPanel(noMatchState());
    expect(barText()).toContain('Not in Swift Recruit');
    expect(bar().classList.contains('sr-bar--not-in-crm')).toBe(true);
  });

  it('shows scraped phone', () => {
    renderPanel(noMatchState());
    expect(shadow().querySelector('[data-scraped-phone]')!.textContent).toContain('+447712345678');
  });
});

// ---------------------------------------------------------------------------
// Note popover — REGRESSION: clicking button opens popover
// ---------------------------------------------------------------------------

describe('Bar — note popover (regression)', () => {
  afterEach(() => destroyPanel());

  it('clicking Note button opens popover with recent_notes content', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const btn = shadow().querySelector('[data-note-toggle]') as HTMLElement;
    expect(btn).not.toBeNull();
    btn.click();
    const popover = shadow().querySelector('[data-note-popover]') as HTMLElement;
    expect(popover.hidden).toBe(false);
    const entries = popover.querySelectorAll('.sr-note-popover-entry');
    expect(entries.length).toBe(3);
    expect(entries[0].textContent).toContain('night shifts');
  });

  it('clicking Note button opens popover with legacy last_note-only', () => {
    const m: CandidateMatch = {
      ...fixtureMatch('sparse'),
      last_note: { text: 'Legacy note content', created_at: '2026-01-01T00:00:00Z', author: 'Test User' },
    };
    renderPanel(matchState([m]));
    const btn = shadow().querySelector('[data-note-toggle]') as HTMLElement;
    expect(btn).not.toBeNull();
    btn.click();
    const popover = shadow().querySelector('[data-note-popover]') as HTMLElement;
    expect(popover.hidden).toBe(false);
    expect(popover.querySelectorAll('.sr-note-popover-entry').length).toBe(1);
    expect(popover.textContent).toContain('Legacy note content');
    expect(popover.textContent).toContain('Test User');
  });

  it('clicking button again closes popover', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const btn = shadow().querySelector('[data-note-toggle]') as HTMLElement;
    btn.click();
    btn.click();
    expect((shadow().querySelector('[data-note-popover]') as HTMLElement).hidden).toBe(true);
  });

  it('popover has "View all notes" link', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const a = shadow().querySelector('.sr-note-popover-footer a') as HTMLAnchorElement;
    expect(a.textContent).toContain('View all notes');
    expect(a.href).toContain('/swift/candidates/10421');
  });

  it('no button when no notes', () => {
    renderPanel(matchState([fixtureMatch('sparse')]));
    expect(shadow().querySelector('[data-note-toggle]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fresh-note dot
// ---------------------------------------------------------------------------

describe('Bar — fresh-note dot', () => {
  afterEach(() => destroyPanel());

  it('shows dot when < 24h', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(shadow().querySelector('[data-fresh-dot]')).not.toBeNull();
  });

  it('no dot when > 24h', () => {
    const m: CandidateMatch = {
      ...fixtureMatch('sparse'),
      recent_notes: [{ text: 'Old', created_at: '2025-01-01T00:00:00Z', author: 'X' }],
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

  it('renders teal "Booked" chip', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const chip = shadow().querySelector('[data-next-booking]');
    expect(chip).not.toBeNull();
    expect(chip!.classList.contains('sr-chip--booked')).toBe(true);
    expect(chip!.textContent).toContain('Booked');
  });

  it('absent when no next_booking', () => {
    renderPanel(matchState([fixtureMatch('sparse')]));
    expect(shadow().querySelector('[data-next-booking]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 90d booking count
// ---------------------------------------------------------------------------

describe('Bar — 90d count', () => {
  afterEach(() => destroyPanel());

  it('shows shifts · 90d', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const chip = shadow().querySelector('[data-booking-90d]');
    expect(chip!.textContent).toContain('8 shifts');
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

describe('Bar — tasks chip', () => {
  afterEach(() => destroyPanel());

  it('renders in Row 1 actions', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const row1 = shadow().querySelector('.sr-row-1');
    expect(row1!.querySelector('[data-task-toggle]')).not.toBeNull();
  });

  it('amber when overdue', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const chip = shadow().querySelector('[data-task-toggle]');
    expect(chip!.classList.contains('sr-chip--tasks-overdue')).toBe(true);
  });

  it('neutral when no overdue', () => {
    const m: CandidateMatch = {
      ...fixtureMatch('sparse'),
      open_tasks: [{ title: 'Do thing', due_date: new Date(Date.now() + 86_400_000).toISOString(), owner: 'X', overdue: false }],
    };
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-task-toggle]')!.classList.contains('sr-chip--tasks')).toBe(true);
  });

  it('clicking opens popover with task titles', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-task-toggle]') as HTMLElement).click();
    const popover = shadow().querySelector('[data-task-popover]') as HTMLElement;
    expect(popover.hidden).toBe(false);
    expect(popover.querySelectorAll('[data-task]').length).toBe(2);
    expect(popover.textContent).toContain('Chase CPC renewal');
  });

  it('overdue task shown in red', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-task-toggle]') as HTMLElement).click();
    expect(shadow().querySelector('.sr-task-overdue')).not.toBeNull();
  });

  it('absent when no tasks', () => {
    renderPanel(matchState([fixtureMatch('sparse')]));
    expect(shadow().querySelector('[data-task-toggle]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Call button
// ---------------------------------------------------------------------------

describe('Bar — call button', () => {
  afterEach(() => destroyPanel());

  it('renders Call button in Row 1', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const btn = shadow().querySelector('[data-call]') as HTMLElement;
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('Call');
    expect(btn.classList.contains('sr-btn--call')).toBe(true);
  });

  it('carries candidate_id and phone', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const btn = shadow().querySelector('[data-call]') as HTMLElement;
    expect(btn.getAttribute('data-call')).toBe('10421');
    expect(btn.getAttribute('data-call-phone')).toBe('+447712345678');
  });
});

// ---------------------------------------------------------------------------
// Softphone button
// ---------------------------------------------------------------------------

describe('Bar — softphone button', () => {
  afterEach(() => destroyPanel());

  it('renders Softphone button in Row 1', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const btn = shadow().querySelector('[data-open-softphone]') as HTMLElement;
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('Softphone');
  });

  it('carries candidate_id', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const btn = shadow().querySelector('[data-open-softphone]') as HTMLElement;
    expect(btn.getAttribute('data-open-softphone')).toBe('10421');
  });
});

// ---------------------------------------------------------------------------
// Warning tint
// ---------------------------------------------------------------------------

describe('Bar — warnings', () => {
  afterEach(() => destroyPanel());

  it('unsuitable: red tint', () => {
    renderPanel(matchState([fixtureMatch('unsuitable')]));
    expect(bar().classList.contains('sr-bar--unsuitable')).toBe(true);
    expect(shadow().querySelector('[data-warning="unsuitable"]')!.textContent).toContain('Failed drug test');
  });

  it('deletion: amber tint', () => {
    renderPanel(matchState([fixtureMatch('deletion_flagged')]));
    expect(bar().classList.contains('sr-bar--deletion')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sparse
// ---------------------------------------------------------------------------

describe('Bar — sparse', () => {
  afterEach(() => destroyPanel());

  it('no null/undefined', () => {
    renderPanel(matchState([fixtureMatch('sparse')]));
    expect(barText()).not.toContain('null');
    expect(barText()).not.toContain('undefined');
  });

  it('no note/task/booking extras', () => {
    renderPanel(matchState([fixtureMatch('sparse')]));
    expect(shadow().querySelector('[data-note-toggle]')).toBeNull();
    expect(shadow().querySelector('[data-task-toggle]')).toBeNull();
    expect(shadow().querySelector('[data-next-booking]')).toBeNull();
    expect(shadow().querySelector('[data-booking-90d]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Licence colours
// ---------------------------------------------------------------------------

describe('Bar — licence colours', () => {
  afterEach(() => destroyPanel());

  it('expired → red', () => {
    const m: CandidateMatch = { ...fixtureMatch('sparse'), licence_categories: [{ category: 'C', expiry_date: '2020-01-01' }] };
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-licence-status="expired"]')!.classList.contains('sr-chip--expired')).toBe(true);
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
    expect(shadow().querySelector('[data-deeplink]')).toBeNull();
  });

  it('expands back', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-collapse]') as HTMLElement).click();
    (shadow().querySelector('[data-collapse]') as HTMLElement).click();
    expect(shadow().querySelector('[data-deeplink]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Multi-match
// ---------------------------------------------------------------------------

describe('Bar — multi-match', () => {
  afterEach(() => destroyPanel());
  const matches = FIXTURES.multiple.matches;

  it('pills sorted by confidence', () => {
    renderPanel(matchState(matches));
    const pills = shadow().querySelectorAll('.sr-pill');
    expect(pills[0].textContent).toContain('David Smith');
  });

  it('pill click expands', () => {
    renderPanel(matchState(matches));
    (shadow().querySelector('.sr-pill') as HTMLElement).click();
    expect(shadow().querySelector('.sr-expanded')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Phone not on file
// ---------------------------------------------------------------------------

describe('Bar — phone not on file', () => {
  afterEach(() => destroyPanel());

  it('note when phone scraped, email match', () => {
    renderPanel(matchState([fixtureMatch('phone_not_on_file')], { phone: '07742613765', email: 'x@y.com', name: null, location: null }));
    expect(shadow().querySelector('[data-phone-note]')!.textContent).toContain('Phone not on file');
  });
});

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

describe('Bar — transitions', () => {
  afterEach(() => destroyPanel());

  it('idle → searching → match', () => {
    renderPanel({ status: 'idle' });
    expect(getHost()).toBeNull();
    renderPanel({ status: 'searching' });
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
// Unit tests
// ---------------------------------------------------------------------------

describe('relativeDate', () => {
  it('"just now"', () => expect(relativeDate(new Date().toISOString())).toBe('just now'));
  it('minutes', () => expect(relativeDate(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5m ago'));
  it('days', () => expect(relativeDate(new Date(Date.now() - 2 * 86_400_000).toISOString())).toBe('2d ago'));
  it('future', () => expect(relativeDate(new Date(Date.now() + 2 * 86_400_000).toISOString())).toBe('in 2d'));
});

describe('licenceStatus', () => {
  it('valid for null', () => expect(licenceStatus({ category: 'B', expiry_date: null })).toBe('valid'));
  it('expired', () => expect(licenceStatus({ category: 'C', expiry_date: '2020-01-01' })).toBe('expired'));
});

describe('tier helpers', () => {
  it('isConfirmed', () => { expect(isConfirmed('exact_phone')).toBe(true); expect(isConfirmed('name_location')).toBe(false); });
  it('isSuggestion', () => { expect(isSuggestion('name_location')).toBe(true); expect(isSuggestion('exact_phone')).toBe(false); });
  it('isPhoneNotOnFile', () => {
    expect(isPhoneNotOnFile({ phone: '07712345678', email: 'a@b.com', name: null, location: null }, [fixtureMatch('single_email')])).toBe(true);
    expect(isPhoneNotOnFile({ phone: null, email: 'a@b.com', name: null, location: null }, [fixtureMatch('single_email')])).toBe(false);
  });
});

describe('isFreshNote', () => {
  it('true < 24h', () => expect(isFreshNote({ text: 'x', created_at: new Date(Date.now() - 3_600_000).toISOString(), author: null })).toBe(true));
  it('false > 24h', () => expect(isFreshNote({ text: 'x', created_at: '2025-01-01T00:00:00Z', author: null })).toBe(false));
});

describe('normalisePhoneE164', () => {
  it('07 → +44', () => expect(normalisePhoneE164('07712 345678')).toBe('+447712345678'));
  it('already +44', () => expect(normalisePhoneE164('+447712345678')).toBe('+447712345678'));
});
