import { describe, it, expect, afterEach } from 'vitest';
import { renderPanel, destroyPanel, relativeDate, licenceStatus, isConfirmed, isSuggestion, isPhoneNotOnFile, isFreshNote, setAddButtonState, type PanelState } from '../panel';
import type { CandidateMatch, LookupRequest, MatchResponse, LastNote } from '@/lib/types';
import { normalisePhoneE164 } from '@/lib/phoneNormalise';
import { FIXTURES } from '@/lib/mockApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHost(): HTMLElement | null { return document.getElementById('sr-panel-host'); }
function shadow(): ShadowRoot { const h = getHost(); if (!h?.shadowRoot) throw new Error('No shadow root'); return h.shadowRoot; }
function bar(): Element { const el = shadow().querySelector('.sr-bar'); if (!el) throw new Error('.sr-bar not found'); return el; }
function barText(): string { return bar().textContent ?? ''; }

const DEFAULT_SCRAPED: LookupRequest = { phone: '07712 345678', email: null, name: null, location: null };
function matchState(matches: CandidateMatch[], scraped: LookupRequest = DEFAULT_SCRAPED, duration_ms = 38): PanelState {
  return { status: 'match', data: { ok: true as const, data: { matches, metadata: { duration_ms } } }, scraped };
}
function noMatchState(scraped: LookupRequest = DEFAULT_SCRAPED): PanelState { return { status: 'no-match', scraped }; }
function fixtureMatch(name: string): CandidateMatch { return FIXTURES[name].matches[0]; }

// ---------------------------------------------------------------------------
// Shadow DOM + page push
// ---------------------------------------------------------------------------

describe('Bar — basics', () => {
  afterEach(() => destroyPanel());
  it('shadow root created', () => { renderPanel({ status: 'searching' }); expect(getHost()!.shadowRoot).not.toBeNull(); });
  it('no DOM leakage', () => { renderPanel({ status: 'searching' }); expect(document.querySelector('.sr-bar')).toBeNull(); });
  it('page push applied', () => { renderPanel({ status: 'searching' }); expect(parseInt(document.documentElement.style.marginTop)).toBeGreaterThan(0); });
  it('page push removed on destroy', () => { renderPanel({ status: 'searching' }); destroyPanel(); expect(document.documentElement.style.marginTop).toBe(''); });
  it('idle renders nothing', () => { renderPanel({ status: 'idle' }); expect(getHost()).toBeNull(); });
});

// ---------------------------------------------------------------------------
// Three-row layout
// ---------------------------------------------------------------------------

describe('Bar — three-row layout', () => {
  afterEach(() => destroyPanel());
  const m = fixtureMatch('single_phone');

  it('Row 1: name, badges, actions', () => {
    renderPanel(matchState([m]));
    const r1 = shadow().querySelector('.sr-row-1')!;
    expect(r1.textContent).toContain('James Whitfield');
    expect(r1.querySelector('[data-conf-tier="confirmed"]')).not.toBeNull();
    expect(r1.querySelector('[data-deeplink]')).not.toBeNull();
  });

  it('Row 2: chips', () => {
    renderPanel(matchState([m]));
    const r2 = shadow().querySelector('.sr-row-2')!;
    expect(r2.querySelectorAll('[data-licence-status]').length).toBe(2);
  });

  it('Row 3: meta', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-meta-row]')!.textContent).toContain('Sarah Connor');
  });

  it('Row 2/3 omitted when sparse', () => {
    renderPanel(matchState([fixtureMatch('sparse')]));
    expect(shadow().querySelector('.sr-row-2')).toBeNull();
    expect(shadow().querySelector('.sr-row-3')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// .co.uk domain
// ---------------------------------------------------------------------------

describe('Bar — .co.uk', () => {
  afterEach(() => destroyPanel());
  it('deep link', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect((shadow().querySelector('[data-deeplink]') as HTMLAnchorElement).href).toContain('swift-recruit.co.uk');
  });
  it('notes footer', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect((shadow().querySelector('.sr-note-panel-footer a') as HTMLAnchorElement).href).toContain('swift-recruit.co.uk');
  });
});

// ---------------------------------------------------------------------------
// Notes panel — CRM-style feed
// ---------------------------------------------------------------------------

describe('Bar — notes panel (CRM feed)', () => {
  afterEach(() => destroyPanel());
  const m = fixtureMatch('single_phone');

  it('click opens panel with header showing count', () => {
    renderPanel(matchState([m]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    const panel = shadow().querySelector('[data-note-popover]') as HTMLElement;
    expect(panel.hidden).toBe(false);
    expect(shadow().querySelector('.sr-note-panel-header')!.textContent).toContain('Notes');
    expect(shadow().querySelector('.sr-note-panel-count')!.textContent).toContain('3');
  });

  it('renders note cards', () => {
    renderPanel(matchState([m]));
    const cards = shadow().querySelectorAll('[data-note-card]');
    expect(cards.length).toBe(3);
  });

  it('newest note first with author', () => {
    renderPanel(matchState([m]));
    const first = shadow().querySelector('[data-note-card="0"]')!;
    expect(first.querySelector('.sr-note-card-author')!.textContent).toContain('Sarah Connor');
  });

  it('preserves line breaks (white-space: pre-line)', () => {
    renderPanel(matchState([m]));
    const text = shadow().querySelector('[data-note-card="0"] .sr-note-card-text')!;
    // The text contains \n which pre-line renders as line breaks
    expect(text.textContent).toContain('=== QUALIFYING CALL ===');
    expect(text.textContent).toContain('--- LICENCE & COMPLIANCE ---');
    expect(text.textContent).toContain('--- AVAILABILITY ---');
  });

  it('fresh note (<24h) gets "New" tag', () => {
    renderPanel(matchState([m]));
    const newTag = shadow().querySelector('[data-note-new]');
    expect(newTag).not.toBeNull();
    expect(newTag!.textContent).toBe('New');
    // Only the first (fresh) note has the tag
    const allTags = shadow().querySelectorAll('[data-note-new]');
    expect(allTags.length).toBe(1);
  });

  it('no "New" tag on old notes', () => {
    const old: CandidateMatch = {
      ...fixtureMatch('sparse'),
      recent_notes: [{ text: 'Old', created_at: '2025-01-01T00:00:00Z', author: 'X' }],
    };
    renderPanel(matchState([old]));
    expect(shadow().querySelector('[data-note-new]')).toBeNull();
  });

  it('scrollable body', () => {
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-note-body]')).not.toBeNull();
  });

  it('"View all notes in CRM" footer button', () => {
    renderPanel(matchState([m]));
    const a = shadow().querySelector('.sr-note-panel-footer a') as HTMLAnchorElement;
    expect(a.textContent).toContain('View all notes');
    expect(a.href).toContain('/swift/candidates/10421');
  });

  it('falls back to last_note when recent_notes absent', () => {
    const legacy: CandidateMatch = { ...fixtureMatch('sparse'), last_note: { text: 'Legacy note', created_at: '2026-01-01T00:00:00Z', author: 'Test' } };
    renderPanel(matchState([legacy]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    const cards = shadow().querySelectorAll('[data-note-card]');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Legacy note');
  });

  it('no button when no notes AND suggestion tier', () => {
    const m: CandidateMatch = { ...fixtureMatch('sparse'), confidence: 'name_location' };
    renderPanel(matchState([m], { phone: null, email: null, name: 'J', location: 'X' }));
    expect(shadow().querySelector('[data-note-toggle]')).toBeNull();
  });

  it('click toggle closes panel', () => {
    renderPanel(matchState([m]));
    const btn = shadow().querySelector('[data-note-toggle]') as HTMLElement;
    btn.click();
    btn.click();
    expect((shadow().querySelector('[data-note-popover]') as HTMLElement).hidden).toBe(true);
  });

  it('truncated note (200 chars) gets truncation class', () => {
    const truncated: CandidateMatch = {
      ...fixtureMatch('sparse'),
      recent_notes: [{ text: 'x'.repeat(200), created_at: '2026-01-01T00:00:00Z', author: 'A' }],
    };
    renderPanel(matchState([truncated]));
    expect(shadow().querySelector('.sr-note-card-truncated')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fresh-note dot
// ---------------------------------------------------------------------------

describe('Bar — fresh-note dot', () => {
  afterEach(() => destroyPanel());
  it('shows dot < 24h', () => { renderPanel(matchState([fixtureMatch('single_phone')])); expect(shadow().querySelector('[data-fresh-dot]')).not.toBeNull(); });
  it('no dot > 24h', () => {
    const m: CandidateMatch = { ...fixtureMatch('sparse'), recent_notes: [{ text: 'Old', created_at: '2025-01-01T00:00:00Z', author: 'X' }] };
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-fresh-dot]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Last contact in Row 1
// ---------------------------------------------------------------------------

describe('Bar — last contact (Row 1)', () => {
  afterEach(() => destroyPanel());

  it('renders in Row 1 with clock icon', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const el = shadow().querySelector('.sr-row-1 [data-last-contact]');
    expect(el).not.toBeNull();
    expect(el!.textContent).toContain('Last contact');
  });

  it('recent contact has normal styling', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const el = shadow().querySelector('[data-last-contact]')!;
    expect(el.getAttribute('data-last-contact')).toBe('recent');
    expect(el.classList.contains('sr-last-contact--stale')).toBe(false);
  });

  it('stale contact (>30d) gets amber treatment', () => {
    const m: CandidateMatch = {
      ...fixtureMatch('single_phone'),
      last_contact_date: new Date(Date.now() - 45 * 86_400_000).toISOString(),
    };
    renderPanel(matchState([m]));
    const el = shadow().querySelector('[data-last-contact]')!;
    expect(el.getAttribute('data-last-contact')).toBe('stale');
    expect(el.classList.contains('sr-last-contact--stale')).toBe(true);
  });

  it('no contact logged shows amber "No contact logged"', () => {
    const m: CandidateMatch = { ...fixtureMatch('sparse'), last_contact_date: null };
    renderPanel(matchState([m]));
    const el = shadow().querySelector('[data-last-contact]')!;
    expect(el.getAttribute('data-last-contact')).toBe('stale');
    expect(el.textContent).toContain('No contact logged');
  });

  it('not in collapsed strip', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-collapse]') as HTMLElement).click();
    expect(shadow().querySelector('[data-last-contact]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

describe('Bar — bookings', () => {
  afterEach(() => destroyPanel());
  it('next-booking chip', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const chip = shadow().querySelector('[data-next-booking]')!;
    expect(chip.classList.contains('sr-chip--booked')).toBe(true);
    expect(chip.textContent).toContain('Booked');
  });
  it('90d count', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(shadow().querySelector('[data-booking-90d]')!.textContent).toContain('8 shifts');
  });
});

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

describe('Bar — tasks', () => {
  afterEach(() => destroyPanel());
  it('chip in Row 1', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(shadow().querySelector('.sr-row-1 [data-task-toggle]')).not.toBeNull();
  });
  it('amber when overdue', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(shadow().querySelector('[data-task-toggle]')!.classList.contains('sr-chip--tasks-overdue')).toBe(true);
  });
  it('popover opens on click', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-task-toggle]') as HTMLElement).click();
    expect((shadow().querySelector('[data-task-popover]') as HTMLElement).hidden).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Call + softphone removed
// ---------------------------------------------------------------------------

describe('Bar — removed buttons', () => {
  afterEach(() => destroyPanel());
  it('no Call button', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(shadow().querySelector('[data-call]')).toBeNull();
  });
  it('no softphone button', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(shadow().querySelector('[data-open-softphone]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Warnings + tiers
// ---------------------------------------------------------------------------

describe('Bar — warnings/tiers', () => {
  afterEach(() => destroyPanel());
  it('unsuitable red tint', () => { renderPanel(matchState([fixtureMatch('unsuitable')])); expect(bar().classList.contains('sr-bar--unsuitable')).toBe(true); });
  it('suggestion amber tint', () => { renderPanel(matchState([fixtureMatch('suggestion')], { phone: null, email: null, name: 'J', location: 'X' })); expect(bar().classList.contains('sr-bar--suggestion')).toBe(true); });
  it('confirmed: "In CRM ✓"', () => { renderPanel(matchState([fixtureMatch('single_phone')])); expect(shadow().querySelector('[data-conf-tier="confirmed"]')!.textContent).toContain('In CRM'); });
});

// ---------------------------------------------------------------------------
// Sparse
// ---------------------------------------------------------------------------

describe('Bar — sparse', () => {
  afterEach(() => destroyPanel());
  it('no null/undefined', () => { renderPanel(matchState([fixtureMatch('sparse')])); expect(barText()).not.toContain('null'); expect(barText()).not.toContain('undefined'); });
  it('no task/booking extras; note button renders (confirmed, for compose)', () => {
    renderPanel(matchState([fixtureMatch('sparse')]));
    // sparse is exact_phone (confirmed), so note button renders for compose even with no notes
    expect(shadow().querySelector('[data-note-toggle]')).not.toBeNull();
    expect(shadow().querySelector('[data-task-toggle]')).toBeNull();
    expect(shadow().querySelector('[data-next-booking]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Collapse + multi-match
// ---------------------------------------------------------------------------

describe('Bar — collapse/multi', () => {
  afterEach(() => destroyPanel());
  it('collapse/expand', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-collapse]') as HTMLElement).click();
    expect(bar().classList.contains('sr-bar--collapsed')).toBe(true);
    (shadow().querySelector('[data-collapse]') as HTMLElement).click();
    expect(shadow().querySelector('[data-deeplink]')).not.toBeNull();
  });
  it('multi-match pills', () => {
    renderPanel(matchState(FIXTURES.multiple.matches));
    expect(shadow().querySelectorAll('.sr-pill').length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('relativeDate', () => {
  it('"just now"', () => expect(relativeDate(new Date().toISOString())).toBe('just now'));
  it('future', () => expect(relativeDate(new Date(Date.now() + 2 * 86_400_000).toISOString())).toBe('in 2d'));
});

describe('isFreshNote', () => {
  it('true < 24h', () => expect(isFreshNote({ text: 'x', created_at: new Date(Date.now() - 3_600_000).toISOString(), author: null })).toBe(true));
  it('false > 24h', () => expect(isFreshNote({ text: 'x', created_at: '2025-01-01T00:00:00Z', author: null })).toBe(false));
});

describe('normalisePhoneE164', () => {
  it('07 → +44', () => expect(normalisePhoneE164('07712 345678')).toBe('+447712345678'));
  it('already +44', () => expect(normalisePhoneE164('+447712345678')).toBe('+447712345678'));
});

describe('tier helpers', () => {
  it('isConfirmed', () => { expect(isConfirmed('exact_phone')).toBe(true); expect(isConfirmed('name_location')).toBe(false); });
  it('isSuggestion', () => { expect(isSuggestion('name_location')).toBe(true); expect(isSuggestion('exact_phone')).toBe(false); });
});

// ---------------------------------------------------------------------------
// Add to CRM
// ---------------------------------------------------------------------------

describe('Bar — Add to CRM button', () => {
  afterEach(() => destroyPanel());

  it('renders in no-match state', () => {
    renderPanel(noMatchState());
    const btn = shadow().querySelector('[data-add-to-crm]');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toContain('Add to Swift Recruit');
  });

  it('not rendered in match state', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(shadow().querySelector('[data-add-to-crm]')).toBeNull();
  });

  it('first click morphs to confirm with scraped name', () => {
    renderPanel(noMatchState({ phone: '07712345678', email: null, name: 'Tony Lynn', location: null }));
    const btn = shadow().querySelector('[data-add-to-crm]') as HTMLElement;
    btn.click();
    expect(btn.textContent).toContain('Confirm add');
    expect(btn.textContent).toContain('Tony Lynn');
    expect(btn.classList.contains('sr-btn--add-confirm')).toBe(true);
  });

  it('confirm reverts after 5s timeout', async () => {
    const { vi } = await import('vitest');
    vi.useFakeTimers();
    renderPanel(noMatchState({ phone: '07712345678', email: null, name: 'Tony Lynn', location: null }));
    const btn = shadow().querySelector('[data-add-to-crm]') as HTMLElement;
    btn.click();
    expect(btn.textContent).toContain('Confirm add');
    vi.advanceTimersByTime(5100);
    expect(btn.textContent).toContain('Add to Swift Recruit');
    expect(btn.classList.contains('sr-btn--primary')).toBe(true);
    vi.useRealTimers();
  });

  it('setAddButtonState("added") shows "Added ✓"', () => {
    renderPanel(noMatchState());
    setAddButtonState('added');
    const btn = shadow().querySelector('[data-add-to-crm]') as HTMLElement;
    expect(btn.textContent).toContain('Added');
    expect(btn.classList.contains('sr-btn--added')).toBe(true);
  });

  it('setAddButtonState("error") shows error message', () => {
    renderPanel(noMatchState());
    setAddButtonState('error', 'Already in Swift Recruit');
    const btn = shadow().querySelector('[data-add-to-crm]') as HTMLElement;
    expect(btn.textContent).toContain('Already in Swift Recruit');
    expect(btn.classList.contains('sr-btn--add-error')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// scrapeCvText
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Note compose
// ---------------------------------------------------------------------------

describe('Bar — note compose', () => {
  afterEach(() => destroyPanel());

  it('compose area renders for confirmed match with notes', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    expect(shadow().querySelector('[data-note-textarea]')).not.toBeNull();
    expect(shadow().querySelector('[data-note-save]')).not.toBeNull();
  });

  it('compose area renders for confirmed match with zero notes', () => {
    const m: CandidateMatch = { ...fixtureMatch('sparse'), confidence: 'exact_phone' };
    renderPanel(matchState([m]));
    // Note button should render for confirmed match even with no notes
    const btn = shadow().querySelector('[data-note-toggle]');
    expect(btn).not.toBeNull();
    (btn as HTMLElement).click();
    expect(shadow().querySelector('[data-note-textarea]')).not.toBeNull();
    expect(shadow().querySelector('.sr-note-empty')).not.toBeNull();
  });

  it('no note button for suggestion tier with zero notes', () => {
    const m: CandidateMatch = { ...fixtureMatch('sparse'), confidence: 'name_location' };
    renderPanel(matchState([m], { phone: null, email: null, name: 'J', location: 'X' }));
    expect(shadow().querySelector('[data-note-toggle]')).toBeNull();
  });

  it('char counter shows past 1800', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    const textarea = shadow().querySelector('[data-note-textarea]') as HTMLTextAreaElement;
    // Simulate typing 1850 chars
    textarea.value = 'x'.repeat(1850);
    textarea.dispatchEvent(new Event('input'));
    const counter = shadow().querySelector('[data-note-char-count]') as HTMLElement;
    expect(counter.hidden).toBe(false);
    expect(counter.textContent).toContain('1850');
  });

  it('char counter hidden below 1800', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    const textarea = shadow().querySelector('[data-note-textarea]') as HTMLTextAreaElement;
    textarea.value = 'short';
    textarea.dispatchEvent(new Event('input'));
    expect((shadow().querySelector('[data-note-char-count]') as HTMLElement).hidden).toBe(true);
  });

  it('save button carries candidate_id', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    expect(shadow().querySelector('[data-note-save]')!.getAttribute('data-note-save')).toBe('10421');
  });
});

// ---------------------------------------------------------------------------
// Notes panel toggle / close (regression)
// ---------------------------------------------------------------------------

describe('Bar — notes panel toggle', () => {
  afterEach(() => destroyPanel());
  const m = fixtureMatch('single_phone');

  it('button click opens panel', () => {
    renderPanel(matchState([m]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    expect((shadow().querySelector('[data-note-popover]') as HTMLElement).hidden).toBe(false);
  });

  it('button click again closes panel', () => {
    renderPanel(matchState([m]));
    const btn = shadow().querySelector('[data-note-toggle]') as HTMLElement;
    btn.click();
    btn.click();
    expect((shadow().querySelector('[data-note-popover]') as HTMLElement).hidden).toBe(true);
  });

  it('clicking inside panel does NOT close it', () => {
    renderPanel(matchState([m]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    // Click the textarea inside the panel
    const textarea = shadow().querySelector('[data-note-textarea]') as HTMLElement;
    textarea.click();
    expect((shadow().querySelector('[data-note-popover]') as HTMLElement).hidden).toBe(false);
  });

  it('clicking outside panel (on bar) closes it', () => {
    renderPanel(matchState([m]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    // Click the brand element (outside the note anchor)
    (shadow().querySelector('.sr-brand') as HTMLElement).click();
    expect((shadow().querySelector('[data-note-popover]') as HTMLElement).hidden).toBe(true);
  });

  it('Escape key closes panel', () => {
    renderPanel(matchState([m]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    shadow().querySelector('.sr-bar')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect((shadow().querySelector('[data-note-popover]') as HTMLElement).hidden).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Note type selector
// ---------------------------------------------------------------------------

describe('Bar — note type selector', () => {
  afterEach(() => destroyPanel());

  it('renders type select in compose area', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    const select = shadow().querySelector('[data-note-type]') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.options.length).toBeGreaterThan(5);
  });

  it('defaults to "No type" (empty value)', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    const select = shadow().querySelector('[data-note-type]') as HTMLSelectElement;
    expect(select.value).toBe('');
  });

  it('contains "Recruiting Call" option with value 4', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    (shadow().querySelector('[data-note-toggle]') as HTMLElement).click();
    const select = shadow().querySelector('[data-note-type]') as HTMLSelectElement;
    const opt = Array.from(select.options).find(o => o.value === '4');
    expect(opt).not.toBeUndefined();
    expect(opt!.textContent).toContain('Recruiting Call');
  });
});

// ---------------------------------------------------------------------------
// Status badge — null / unknown values
// ---------------------------------------------------------------------------

describe('Bar — status badge', () => {
  afterEach(() => destroyPanel());

  it('active → green badge', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    const badge = shadow().querySelector('[data-status-badge]');
    expect(badge).not.toBeNull();
    expect(badge!.classList.contains('sr-badge--active')).toBe(true);
    expect(badge!.textContent).toContain('active');
  });

  it('null → no badge rendered', () => {
    const m: CandidateMatch = { ...fixtureMatch('sparse'), active_status: null as unknown as 'active' };
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-status-badge]')).toBeNull();
  });

  it('empty string → no badge rendered', () => {
    const m: CandidateMatch = { ...fixtureMatch('sparse'), active_status: '' as unknown as 'active' };
    renderPanel(matchState([m]));
    expect(shadow().querySelector('[data-status-badge]')).toBeNull();
  });

  it('unknown value "unresponsive" → grey badge with text', () => {
    const m: CandidateMatch = { ...fixtureMatch('sparse'), active_status: 'unresponsive' as 'active' };
    renderPanel(matchState([m]));
    const badge = shadow().querySelector('[data-status-badge]');
    expect(badge).not.toBeNull();
    expect(badge!.classList.contains('sr-badge--inactive')).toBe(true);
    expect(badge!.textContent).toContain('unresponsive');
  });
});

// ---------------------------------------------------------------------------
// Softphone fully absent
// ---------------------------------------------------------------------------

describe('Bar — softphone removed', () => {
  afterEach(() => destroyPanel());

  it('no softphone button in bar', () => {
    renderPanel(matchState([fixtureMatch('single_phone')]));
    expect(shadow().querySelector('[data-open-softphone]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// scrapeCvText
// ---------------------------------------------------------------------------

describe('scrapeCvText', () => {
  it('extracts full CV text from fixture', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const fixtureHtml = readFileSync(resolve(__dirname, '../../../fixtures/indeed-profile.html'), 'utf-8');
    document.documentElement.innerHTML = fixtureHtml;

    const { scrapeCvText } = await import('../scraper');
    const cv = scrapeCvText();
    expect(cv).not.toBeNull();
    expect(cv!).toContain('HGV driver');
    expect(cv!.length).toBeLessThanOrEqual(20_000);
  });
});
