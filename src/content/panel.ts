import type { BackgroundResponse, CandidateMatch, LicenceCategory } from '@/lib/types';

// ---------------------------------------------------------------------------
// Panel state type
// ---------------------------------------------------------------------------

export type PanelState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'match'; data: BackgroundResponse & { ok: true } }
  | { status: 'no-match' }
  | { status: 'error'; error: string }
  | { status: 'logged-out' };

// ---------------------------------------------------------------------------
// Lucide SVG icon paths (viewBox 0 0 24 24)
// ---------------------------------------------------------------------------

const ICONS = {
  shield:        '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  alertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  phone:         '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  calendar:      '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  briefcase:     '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  user:          '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  stickyNote:    '<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/>',
  chevronDown:   '<path d="m6 9 6 6 6-6"/>',
  chevronUp:     '<path d="m18 15-6-6-6 6"/>',
  externalLink:  '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  copy:          '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  checkCircle:   '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
  xCircle:       '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  loader:        '<path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/>',
  search:        '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  logIn:         '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>',
  x:             '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
} as const;

function icon(name: keyof typeof ICONS, cls = ''): string {
  return `<svg class="sr-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

export function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (isNaN(then)) return iso;
  const diffMs = now - then;
  const future = diffMs < 0;
  const absDiff = Math.abs(diffMs);
  const mins  = Math.floor(absDiff / 60_000);
  const hours = Math.floor(absDiff / 3_600_000);
  const days  = Math.floor(absDiff / 86_400_000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  let label: string;
  if (mins < 1)      label = 'just now';
  else if (mins < 60)  label = `${mins}m`;
  else if (hours < 24) label = `${hours}h`;
  else if (days < 7)   label = `${days}d`;
  else if (weeks < 5)  label = `${weeks}w`;
  else                  label = `${months}mo`;

  if (label === 'just now') return label;
  return future ? `in ${label}` : `${label} ago`;
}

// ---------------------------------------------------------------------------
// Licence status
// ---------------------------------------------------------------------------

export type LicenceStatus = 'valid' | 'expiring' | 'expired';

export function licenceStatus(cat: LicenceCategory): LicenceStatus {
  if (!cat.expiry_date) return 'valid';
  const exp = new Date(cat.expiry_date).getTime();
  if (isNaN(exp)) return 'valid';
  const now = Date.now();
  if (exp < now) return 'expired';
  if (exp - now < 30 * 86_400_000) return 'expiring';
  return 'valid';
}

// ---------------------------------------------------------------------------
// Confidence helpers
// ---------------------------------------------------------------------------

const CONFIDENCE_ORDER: Record<string, number> = {
  exact_phone: 0, exact_email: 1, fuzzy_name_postcode: 2, name_location: 3,
};

function confidenceBadgeClass(c: CandidateMatch['confidence']): string {
  if (c === 'exact_phone' || c === 'exact_email') return 'sr-badge--confirmed';
  return 'sr-badge--pending';
}

function confidenceLabel(c: CandidateMatch['confidence']): string {
  const m: Record<string, string> = {
    exact_phone: 'Phone', exact_email: 'Email',
    fuzzy_name_postcode: 'Fuzzy', name_location: 'Name + location',
  };
  return m[c] ?? c;
}

// ---------------------------------------------------------------------------
// HTML escape
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Host / shadow root / page-push
// ---------------------------------------------------------------------------

const HOST_ID = 'sr-panel-host';
let shadowRoot: ShadowRoot | null = null;
let resizeObserver: ResizeObserver | null = null;
let collapsed = false;            // per-tab session state
let currentMatches: CandidateMatch[] = [];
let expandedPill: number | null = null; // index into currentMatches for multi-match

function getOrCreateHost(): HTMLElement {
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'all:initial; position:fixed; top:0; left:0; right:0; z-index:2147483647; pointer-events:none;';
    document.body.prepend(host);
  }
  return host;
}

function getShadowRoot(): ShadowRoot {
  if (shadowRoot) return shadowRoot;
  const host = getOrCreateHost();
  shadowRoot = host.attachShadow({ mode: 'open' });
  return shadowRoot;
}

function applyPagePush(height: number): void {
  document.documentElement.style.marginTop = height + 'px';
}

function removePagePush(): void {
  document.documentElement.style.marginTop = '';
}

function observeBarHeight(root: ShadowRoot): void {
  if (resizeObserver) resizeObserver.disconnect();
  const bar = root.querySelector('.sr-bar') as HTMLElement | null;
  if (!bar) { removePagePush(); return; }
  resizeObserver = new ResizeObserver((entries) => {
    for (const e of entries) {
      applyPagePush(e.borderBoxSize?.[0]?.blockSize ?? e.target.getBoundingClientRect().height);
    }
  });
  resizeObserver.observe(bar);
}

// ---------------------------------------------------------------------------
// CSS (CRM design tokens)
// ---------------------------------------------------------------------------

const BAR_CSS = /* css */ `
:host { all: initial; }
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ===== Bar shell ===== */
.sr-bar {
  position: relative;
  width: 100%;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E7EB;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  font-family: 'Inter','Geist',system-ui,-apple-system,sans-serif;
  font-size: 13px;
  color: #0F172A;
  -webkit-font-smoothing: antialiased;
  pointer-events: auto;
}

/* ===== Warning tint ===== */
.sr-bar--unsuitable {
  background: #FEE2E2;
  border-bottom-color: #FECACA;
}
.sr-bar--deletion {
  background: #FEF3C7;
  border-bottom-color: #FDE68A;
}
/* unsuitable takes precedence when both */
.sr-bar--unsuitable.sr-bar--deletion {
  background: #FEE2E2;
  border-bottom-color: #FECACA;
}

/* ===== Row layout ===== */
.sr-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 16px;
  min-height: 40px;
}

.sr-row-right {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
}

/* ===== Brand mark ===== */
.sr-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #0F172A;
  letter-spacing: -0.025em;
  white-space: nowrap;
  flex-shrink: 0;
}

.sr-teal-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #0891B2;
  flex-shrink: 0;
}

.sr-sep {
  width: 1px;
  height: 16px;
  background: #E2E8F0;
  flex-shrink: 0;
}

/* ===== Icon ===== */
.sr-icon { width: 14px; height: 14px; flex-shrink: 0; vertical-align: middle; }
.sr-icon-sm { width: 12px; height: 12px; }
.sr-icon-xs { width: 10px; height: 10px; }

/* ===== Badge (CRM dot-prefixed pill) ===== */
.sr-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  padding: 1px 8px 1px 6px;
  border-radius: 9999px;
  border: 1px solid;
  white-space: nowrap;
  line-height: 1.6;
  flex-shrink: 0;
}
.sr-badge-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

.sr-badge--active    { background:#D1FAE5; color:#065F46; border-color:#A7F3D0; }
.sr-badge--active    .sr-badge-dot { background:#065F46; }
.sr-badge--inactive  { background:#F1F5F9; color:#475569; border-color:#E2E8F0; }
.sr-badge--inactive  .sr-badge-dot { background:#94A3B8; }
.sr-badge--confirmed { background:#DBEAFE; color:#1E40AF; border-color:#BFDBFE; }
.sr-badge--confirmed .sr-badge-dot { background:#1E40AF; }
.sr-badge--pending   { background:#FEF3C7; color:#92400E; border-color:#FDE68A; }
.sr-badge--pending   .sr-badge-dot { background:#92400E; }
.sr-badge--error     { background:#FEE2E2; color:#991B1B; border-color:#FECACA; }
.sr-badge--error     .sr-badge-dot { background:#991B1B; }
.sr-badge--searching { background:#DBEAFE; color:#1E40AF; border-color:#BFDBFE; }
.sr-badge--searching .sr-badge-dot { background:#1E40AF; }

/* ===== Chip (summary strip items) ===== */
.sr-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 6px;
  background: #F1F5F9;
  border: 1px solid #E2E8F0;
  color: #475569;
  white-space: nowrap;
  flex-shrink: 0;
}
.sr-chip .sr-icon { color: inherit; }

.sr-chip--expiring { background:#FEF3C7; border-color:#FDE68A; color:#92400E; }
.sr-chip--expired  { background:#FEE2E2; border-color:#FECACA; color:#991B1B; }
.sr-chip--available { background:#D1FAE5; border-color:#A7F3D0; color:#065F46; }
.sr-chip--hot  { background:#D1FAE5; border-color:#A7F3D0; color:#065F46; }
.sr-chip--warm { background:#DBEAFE; border-color:#BFDBFE; color:#1E40AF; }
.sr-chip--cold { background:#F1F5F9; border-color:#E2E8F0; color:#94A3B8; }

/* ===== Candidate name ===== */
.sr-name {
  font-size: 13px;
  font-weight: 600;
  color: #0F172A;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ===== Meta text (recruiter etc) ===== */
.sr-meta {
  font-size: 11px;
  color: #64748B;
  white-space: nowrap;
  flex-shrink: 0;
}
.sr-meta-sep { margin: 0 3px; color: #CBD5E1; }

/* ===== Warning text in bar ===== */
.sr-warn-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}
.sr-warn-text--unsuitable { color: #991B1B; }
.sr-warn-text--deletion   { color: #92400E; }

/* ===== Caveat ===== */
.sr-caveat {
  font-size: 11px;
  color: #92400E;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ===== Buttons ===== */
.sr-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
  line-height: 1.4;
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
}
.sr-btn:active { transform: scale(0.98); }

.sr-btn--primary {
  background: #0891B2; color: #FFFFFF;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.sr-btn--primary:hover { background: #0E7490; }

.sr-btn--secondary {
  background: #F1F5F9; color: #475569;
  border: 1px solid #E2E8F0;
}
.sr-btn--secondary:hover { background: #E2E8F0; }

.sr-btn--ghost {
  background: transparent; color: #475569;
  padding: 4px 6px; border-radius: 6px;
}
.sr-btn--ghost:hover { background: #F1F5F9; color: #0F172A; }

/* ===== Collapse chevron ===== */
.sr-collapse-btn {
  background: transparent; border: none; cursor: pointer;
  color: #64748B; padding: 4px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  transition: background-color 0.15s ease;
  flex-shrink: 0;
}
.sr-collapse-btn:hover { background: #F1F5F9; color: #0F172A; }

/* ===== Collapsed strip ===== */
.sr-bar--collapsed .sr-row { min-height: 28px; padding: 4px 16px; }

/* ===== State strips ===== */
.sr-state-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  min-height: 32px;
}
.sr-state-msg {
  font-size: 12px;
  color: #64748B;
  font-weight: 500;
}
.sr-state-row--error { background: #FEF2F2; }
.sr-state-row--error .sr-state-msg { color: #991B1B; }
.sr-state-row--logged-out .sr-state-msg { color: #0891B2; }

/* ===== Spinner ===== */
@keyframes sr-spin { to { transform: rotate(360deg); } }
.sr-spinner {
  width: 14px; height: 14px;
  color: #0891B2;
  animation: sr-spin 0.8s linear infinite;
  flex-shrink: 0;
}

/* ===== Multi-match pills ===== */
.sr-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 9999px;
  border: 1px solid #E2E8F0;
  background: #F8FAFC;
  color: #0F172A;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.sr-pill:hover { background: #F1F5F9; border-color: #CBD5E1; }
.sr-pill--expanded { background: #DBEAFE; border-color: #BFDBFE; color: #1E40AF; }

.sr-multi-label {
  font-size: 12px;
  font-weight: 600;
  color: #0F172A;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ===== Expanded match row (below pill bar) ===== */
.sr-expanded {
  border-top: 1px solid #E5E7EB;
}

/* ===== Note popover ===== */
.sr-note-anchor { position: relative; }
.sr-note-popover {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 300px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04);
  padding: 12px;
  z-index: 10;
  pointer-events: auto;
}
.sr-note-popover-text {
  font-size: 12px;
  color: #334155;
  line-height: 1.5;
  margin-bottom: 6px;
}
.sr-note-popover-meta {
  font-size: 11px;
  color: #94A3B8;
}
`;

// ---------------------------------------------------------------------------
// Chip renderers
// ---------------------------------------------------------------------------

function statusBadge(s: CandidateMatch['active_status']): string {
  const cls = s === 'active' ? 'sr-badge--active' : 'sr-badge--inactive';
  return `<span class="sr-badge ${cls}"><span class="sr-badge-dot"></span>${s}</span>`;
}

function confBadge(c: CandidateMatch['confidence']): string {
  return `<span class="sr-badge ${confidenceBadgeClass(c)}"><span class="sr-badge-dot"></span>${confidenceLabel(c)}</span>`;
}

function licenceChips(cats: LicenceCategory[]): string {
  return cats.map((c) => {
    const st = licenceStatus(c);
    const cls = st === 'expired' ? 'sr-chip--expired' : st === 'expiring' ? 'sr-chip--expiring' : '';
    const title = c.expiry_date ? `Expires ${c.expiry_date.slice(0, 10)}` : 'No expiry';
    return `<span class="sr-chip ${cls}" title="${esc(title)}" data-licence-status="${st}">${icon('shield', 'sr-icon-xs')} ${esc(c.category)}</span>`;
  }).join('');
}

function summaryChips(m: CandidateMatch): string {
  const out: string[] = [];

  if (m.licence_categories.length > 0) out.push(licenceChips(m.licence_categories));

  if (m.licence_points > 0) {
    const cls = m.licence_points >= 9 ? 'sr-chip--expired' : m.licence_points >= 6 ? 'sr-chip--expiring' : '';
    out.push(`<span class="sr-chip ${cls}" data-points="${m.licence_points}">${m.licence_points} pts</span>`);
  }

  for (const jc of m.job_categories)
    out.push(`<span class="sr-chip">${icon('briefcase', 'sr-icon-xs')} ${esc(jc)}</span>`);

  if (m.last_booking) {
    const lbl = m.last_booking.client_name
      ? `${relativeDate(m.last_booking.date)} · ${esc(m.last_booking.client_name)}`
      : relativeDate(m.last_booking.date);
    out.push(`<span class="sr-chip" title="${esc(m.last_booking.date.slice(0, 10))}">${icon('calendar', 'sr-icon-xs')} ${lbl}</span>`);
  }

  if (m.company_booking_count > 0 || m.agency_booking_count > 0) {
    const parts: string[] = [];
    if (m.company_booking_count > 0) parts.push(`${m.company_booking_count} co.`);
    if (m.agency_booking_count > 0) parts.push(`${m.agency_booking_count} ag.`);
    out.push(`<span class="sr-chip">${parts.join(' / ')}</span>`);
  }

  if (m.available_this_week)
    out.push(`<span class="sr-chip sr-chip--available">${icon('checkCircle', 'sr-icon-xs')} Available</span>`);

  if (m.engagement?.health) {
    const h = m.engagement.health.toLowerCase();
    const cls = h === 'hot' ? 'sr-chip--hot' : h === 'warm' ? 'sr-chip--warm' : h === 'cold' ? 'sr-chip--cold' : '';
    out.push(`<span class="sr-chip ${cls}" data-health="${esc(h)}">${esc(m.engagement.health)}</span>`);
  }

  return out.join('');
}

function metaText(m: CandidateMatch): string {
  const parts: string[] = [];
  if (m.recruiter_name) parts.push(esc(m.recruiter_name));
  if (m.resourcer_name) parts.push(esc(m.resourcer_name));
  if (m.registered_at) parts.push(`Reg. <span title="${esc(m.registered_at.slice(0, 10))}">${relativeDate(m.registered_at)}</span>`);
  if (parts.length === 0) return '';
  return `<span class="sr-meta">${parts.join('<span class="sr-meta-sep">&middot;</span>')}</span>`;
}

// ---------------------------------------------------------------------------
// Warning helpers
// ---------------------------------------------------------------------------

function warningBarClasses(m: CandidateMatch): string {
  const cls: string[] = [];
  if (m.marked_unsuitable) cls.push('sr-bar--unsuitable');
  if (m.marked_for_deletion) cls.push('sr-bar--deletion');
  return cls.join(' ');
}

function warningText(m: CandidateMatch): string {
  const parts: string[] = [];
  if (m.marked_unsuitable) {
    const reason = m.unsuitable_reason ? `: ${esc(m.unsuitable_reason)}` : '';
    parts.push(`<span class="sr-warn-text sr-warn-text--unsuitable" data-warning="unsuitable">${icon('alertTriangle', 'sr-icon-sm')} Marked unsuitable${reason}</span>`);
  }
  if (m.marked_for_deletion) {
    parts.push(`<span class="sr-warn-text sr-warn-text--deletion" data-warning="deletion">${icon('alertTriangle', 'sr-icon-sm')} Flagged for deletion</span>`);
  }
  return parts.join('');
}

// ---------------------------------------------------------------------------
// Single-match row
// ---------------------------------------------------------------------------

function noteButton(m: CandidateMatch): string {
  if (!m.last_note) return '';
  return `<span class="sr-note-anchor">
    <button class="sr-btn sr-btn--secondary" type="button" data-note-toggle>
      ${icon('stickyNote', 'sr-icon-sm')} Note
    </button>
    <div class="sr-note-popover" hidden data-note-popover>
      <div class="sr-note-popover-text">${esc(m.last_note.text)}</div>
      <div class="sr-note-popover-meta">
        ${m.last_note.author ? esc(m.last_note.author) : ''}${m.last_note.author && m.last_note.created_at ? '<span class="sr-meta-sep">&middot;</span>' : ''}${m.last_note.created_at ? `<span title="${esc(m.last_note.created_at.slice(0, 10))}">${relativeDate(m.last_note.created_at)}</span>` : ''}
      </div>
    </div>
  </span>`;
}

function singleMatchRow(m: CandidateMatch): string {
  const deepLink = `https://portal.swift-recruit.com/swift/candidates/${m.candidate_id}`;
  const caveat = m.confidence === 'name_location'
    ? `<span class="sr-caveat" data-caveat>verify phone before contacting</span>` : '';

  return `
    <div class="sr-row" data-candidate-id="${m.candidate_id}">
      ${warningText(m)}
      <span class="sr-brand"><span class="sr-teal-dot"></span>Swift Recruit</span>
      <span class="sr-sep"></span>
      <span class="sr-name">${esc(m.name)}</span>
      ${statusBadge(m.active_status)}
      ${confBadge(m.confidence)}
      ${caveat}
      ${summaryChips(m)}
      ${metaText(m)}
      <span class="sr-row-right">
        ${noteButton(m)}
        <a class="sr-btn sr-btn--primary" href="${esc(deepLink)}" target="_blank" rel="noopener" data-deeplink>
          ${icon('externalLink', 'sr-icon-sm')} Open in CRM
        </a>
        <button class="sr-btn sr-btn--secondary" type="button" data-copy-phone="${esc(m.phone_number)}">
          ${icon('copy', 'sr-icon-sm')} ${esc(m.phone_number)}
        </button>
        <button class="sr-collapse-btn" type="button" data-collapse>
          ${icon('chevronUp', 'sr-icon-sm')}
        </button>
      </span>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Collapsed strip
// ---------------------------------------------------------------------------

function collapsedStrip(state: PanelState & { status: 'match' }): string {
  const matches = state.data.data.matches;
  const m = matches[0];
  const count = matches.length;
  return `
    <div class="sr-row">
      <span class="sr-brand"><span class="sr-teal-dot"></span>Swift Recruit</span>
      <span class="sr-sep"></span>
      <span class="sr-name">${esc(m.name)}</span>
      ${statusBadge(m.active_status)}
      <span class="sr-badge sr-badge--confirmed"><span class="sr-badge-dot"></span>${count} match${count !== 1 ? 'es' : ''}</span>
      <span class="sr-row-right">
        <button class="sr-collapse-btn" type="button" data-collapse>
          ${icon('chevronDown', 'sr-icon-sm')}
        </button>
      </span>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Multi-match bar
// ---------------------------------------------------------------------------

function multiMatchBar(matches: CandidateMatch[]): string {
  const sorted = [...matches].sort((a, b) =>
    (CONFIDENCE_ORDER[a.confidence] ?? 9) - (CONFIDENCE_ORDER[b.confidence] ?? 9));

  const hasNameLoc = sorted.some((m) => m.confidence === 'name_location');
  const pills = sorted.map((m, i) => {
    const cls = expandedPill === i ? 'sr-pill--expanded' : '';
    return `<span class="sr-pill ${cls}" data-pill-index="${i}" data-candidate-id="${m.candidate_id}">${esc(m.name)}</span>`;
  }).join('');

  const caveat = hasNameLoc ? '<span class="sr-caveat" data-caveat>includes loose match — verify phone</span>' : '';

  let expandedRow = '';
  if (expandedPill !== null && sorted[expandedPill]) {
    const m = sorted[expandedPill];
    expandedRow = `<div class="sr-expanded">${singleMatchRow(m)}</div>`;
  }

  return `
    <div class="sr-row">
      <span class="sr-brand"><span class="sr-teal-dot"></span>Swift Recruit</span>
      <span class="sr-sep"></span>
      <span class="sr-multi-label" data-multi-label>${sorted.length} possible matches</span>
      ${pills}
      ${caveat}
      <span class="sr-row-right">
        <button class="sr-collapse-btn" type="button" data-collapse>
          ${icon('chevronUp', 'sr-icon-sm')}
        </button>
      </span>
    </div>
    ${expandedRow}
  `;
}

// ---------------------------------------------------------------------------
// State renderers
// ---------------------------------------------------------------------------

function renderMatch(state: PanelState & { status: 'match' }): string {
  const matches = state.data.data.matches;
  const warnCls = matches.length === 1 ? warningBarClasses(matches[0]) : '';
  const collapsedCls = collapsed ? 'sr-bar--collapsed' : '';

  let body: string;
  if (collapsed) {
    body = collapsedStrip(state);
  } else if (matches.length === 1) {
    body = singleMatchRow(matches[0]);
  } else {
    body = multiMatchBar(matches);
  }

  return `<div class="sr-bar ${warnCls} ${collapsedCls}" data-status="match">${body}</div>`;
}

function renderState(state: PanelState): string {
  switch (state.status) {
    case 'idle':
      return ''; // nothing rendered

    case 'searching':
      return `<div class="sr-bar" data-status="searching">
        <div class="sr-state-row">
          <span class="sr-brand"><span class="sr-teal-dot"></span>Swift Recruit</span>
          <span class="sr-sep"></span>
          <svg class="sr-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.loader}</svg>
          <span class="sr-state-msg">Searching Swift Recruit…</span>
        </div>
      </div>`;

    case 'match':
      return renderMatch(state);

    case 'no-match':
      return `<div class="sr-bar" data-status="no-match">
        <div class="sr-state-row">
          <span class="sr-brand"><span class="sr-teal-dot"></span>Swift Recruit</span>
          <span class="sr-sep"></span>
          <span class="sr-state-msg">Not in Swift Recruit</span>
        </div>
      </div>`;

    case 'error':
      return `<div class="sr-bar" data-status="error">
        <div class="sr-state-row sr-state-row--error">
          <span class="sr-brand"><span class="sr-teal-dot"></span>Swift Recruit</span>
          <span class="sr-sep"></span>
          ${icon('alertTriangle', 'sr-icon-sm')}
          <span class="sr-state-msg">${esc(state.error)}</span>
        </div>
      </div>`;

    case 'logged-out':
      return `<div class="sr-bar" data-status="logged-out">
        <div class="sr-state-row sr-state-row--logged-out">
          <span class="sr-brand"><span class="sr-teal-dot"></span>Swift Recruit</span>
          <span class="sr-sep"></span>
          <span class="sr-state-msg">Log in via the extension popup</span>
        </div>
      </div>`;
  }
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

function wireEvents(root: ShadowRoot, state: PanelState): void {
  // Collapse toggle
  root.querySelectorAll<HTMLElement>('[data-collapse]').forEach((btn) => {
    btn.addEventListener('click', () => {
      collapsed = !collapsed;
      renderPanel(state); // re-render preserving state
    });
  });

  // Copy phone
  root.querySelectorAll<HTMLElement>('[data-copy-phone]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const phone = btn.getAttribute('data-copy-phone');
      if (phone) navigator.clipboard.writeText(phone);
    });
  });

  // Note popover toggle
  root.querySelectorAll<HTMLElement>('[data-note-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const popover = btn.parentElement?.querySelector('[data-note-popover]') as HTMLElement | null;
      if (popover) popover.hidden = !popover.hidden;
    });
  });

  // Close note popover on outside click
  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest?.('[data-note-anchor]') && !target.closest?.('[data-note-toggle]')) {
      root.querySelectorAll<HTMLElement>('[data-note-popover]').forEach((p) => { p.hidden = true; });
    }
  });

  // Multi-match pill click
  root.querySelectorAll<HTMLElement>('[data-pill-index]').forEach((pill) => {
    pill.addEventListener('click', () => {
      const idx = parseInt(pill.getAttribute('data-pill-index') ?? '0', 10);
      expandedPill = expandedPill === idx ? null : idx;
      renderPanel(state); // re-render with expanded/collapsed pill
    });
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function renderPanel(state: PanelState): void {
  // idle = destroy everything
  if (state.status === 'idle') {
    destroyPanel();
    return;
  }

  // Track matches for multi-expand
  if (state.status === 'match') {
    currentMatches = state.data.data.matches;
    // Reset expanded pill when matches change
    if (expandedPill !== null && expandedPill >= currentMatches.length) {
      expandedPill = null;
    }
  } else {
    currentMatches = [];
    expandedPill = null;
  }

  const root = getShadowRoot();
  root.innerHTML = `<style>${BAR_CSS}</style>${renderState(state)}`;

  wireEvents(root, state);
  observeBarHeight(root);
}

export function destroyPanel(): void {
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  removePagePush();
  const host = document.getElementById(HOST_ID);
  if (host) { host.remove(); shadowRoot = null; }
  currentMatches = [];
  expandedPill = null;
  collapsed = false;
}
