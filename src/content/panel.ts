import type { BackgroundResponse, CandidateMatch, LicenceCategory, LookupRequest, LastNote } from '@/lib/types';
import { normalisePhoneE164 } from '@/lib/phoneNormalise';

// ---------------------------------------------------------------------------
// Panel state type
// ---------------------------------------------------------------------------

export type PanelState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'match'; data: BackgroundResponse & { ok: true }; scraped: LookupRequest }
  | { status: 'no-match'; scraped: LookupRequest }
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
  userPlus:      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
  clipboardList: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  calendarCheck: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  clock:         '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
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
// Confidence / tier helpers
// ---------------------------------------------------------------------------

const CONFIDENCE_ORDER: Record<string, number> = {
  exact_phone: 0, exact_email: 1, fuzzy_name_postcode: 2, name_location: 3,
};

export function isConfirmed(c: CandidateMatch['confidence']): boolean {
  return c === 'exact_phone' || c === 'exact_email';
}

export function isSuggestion(c: CandidateMatch['confidence']): boolean {
  return c === 'fuzzy_name_postcode' || c === 'name_location';
}

/** Phone was scraped but match came back on email only */
export function isPhoneNotOnFile(scraped: LookupRequest, matches: CandidateMatch[]): boolean {
  if (!scraped.phone) return false;
  return matches.length > 0 && matches.every((m) => m.confidence === 'exact_email');
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

/** Hook for the content script to handle "Add to CRM" clicks */
export let onAddToCrm: (() => void) | null = null;
export function setOnAddToCrm(handler: () => void): void { onAddToCrm = handler; }

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

/* ===== Suggestion (unconfirmed) tint ===== */
.sr-bar--suggestion {
  background: #FFFBEB;
  border-bottom-color: #FDE68A;
}

/* ===== Not-in-CRM strip ===== */
.sr-bar--not-in-crm {
  background: #F1F5F9;
  border-bottom-color: #E2E8F0;
}
.sr-bar--not-in-crm .sr-state-msg {
  color: #0F172A;
  font-weight: 600;
  font-size: 13px;
}
.sr-bar--not-in-crm .sr-state-sub {
  font-size: 11px;
  color: #64748B;
  font-weight: 500;
}

/* ===== Phone-not-on-file amber note ===== */
.sr-phone-note {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  color: #92400E;
  background: #FEF3C7;
  border: 1px solid #FDE68A;
  border-radius: 6px;
  padding: 2px 8px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ===== Suggestion badge ===== */
.sr-badge--suggestion {
  background: #FEF3C7;
  color: #92400E;
  border-color: #FDE68A;
  font-weight: 600;
}
.sr-badge--suggestion .sr-badge-dot { background: #92400E; }

/* ===== Amber CRM button for suggestions ===== */
.sr-btn--amber {
  background: #FEF3C7; color: #92400E;
  border: 1px solid #FDE68A;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.sr-btn--amber:hover { background: #FDE68A; }

/* ===== Confirmed badge ===== */
.sr-badge--in-crm {
  background: #D1FAE5; color: #065F46; border-color: #A7F3D0;
}
.sr-badge--in-crm .sr-badge-dot { background: #065F46; }

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

/* ===== Three-row match layout ===== */
.sr-match-rows { }

.sr-row-1 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 4px;
  min-height: 32px;
}

.sr-row-2 {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 2px 16px;
  min-height: 24px;
}

.sr-row-3 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 16px 8px;
  min-height: 20px;
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

.sr-btn--call {
  background: #D1FAE5; color: #065F46;
  border: 1px solid #A7F3D0;
}
.sr-btn--call:hover { background: #A7F3D0; }
.sr-btn--calling {
  background: #DBEAFE; color: #1E40AF;
  border: 1px solid #BFDBFE;
  cursor: wait;
}
.sr-btn--call-error {
  background: #F1F5F9; color: #94A3B8;
  border: 1px solid #E2E8F0;
}

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

/* ===== Notes panel (CRM-style feed) ===== */
.sr-note-anchor { position: relative; }
.sr-note-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 380px;
  max-height: 420px;
  display: flex;
  flex-direction: column;
  background: #FAFBFC;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04);
  z-index: 10;
  pointer-events: auto;
  overflow: hidden;
}
.sr-note-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E7EB;
  font-size: 13px;
  font-weight: 600;
  color: #0F172A;
  flex-shrink: 0;
}
.sr-note-panel-count {
  font-size: 11px;
  font-weight: 500;
  color: #64748B;
}
.sr-note-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px;
}
.sr-note-panel-body::-webkit-scrollbar { width: 4px; }
.sr-note-panel-body::-webkit-scrollbar-track { background: transparent; }
.sr-note-panel-body::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 2px; }

/* ===== Note card ===== */
.sr-note-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.sr-note-card + .sr-note-card { margin-top: 8px; }
.sr-note-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.sr-note-card-author {
  font-size: 12px;
  font-weight: 600;
  color: #0F172A;
}
.sr-note-card-time {
  font-size: 11px;
  color: #94A3B8;
}
.sr-note-card-text {
  font-size: 12px;
  color: #334155;
  line-height: 1.6;
  white-space: pre-line;
  word-break: break-word;
}
.sr-note-card-truncated::after {
  content: '… ';
}
.sr-note-new-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  color: #0891B2;
  background: #ECFEFF;
  border: 1px solid #CFFAFE;
  border-radius: 4px;
  padding: 0 5px;
  margin-left: 6px;
  line-height: 1.6;
}

/* ===== Notes panel footer ===== */
.sr-note-panel-footer {
  padding: 10px 14px;
  border-top: 1px solid #E5E7EB;
  background: #FFFFFF;
  flex-shrink: 0;
}
.sr-note-panel-footer a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: #0891B2;
  text-decoration: none;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #CFFAFE;
  background: #ECFEFF;
  transition: all 0.15s ease;
}
.sr-note-panel-footer a:hover { background: #CFFAFE; }

/* ===== Last contact (Row 1) ===== */
.sr-last-contact {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #64748B;
  white-space: nowrap;
  flex-shrink: 0;
}
.sr-last-contact .sr-icon { color: #94A3B8; }
.sr-last-contact--stale {
  color: #92400E;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 6px;
  padding: 1px 8px;
}
.sr-last-contact--stale .sr-icon { color: #92400E; }

/* ===== Add to CRM button states ===== */
.sr-btn--add-confirm {
  background: #FEF3C7; color: #92400E;
  border: 1px solid #FDE68A;
}
.sr-btn--add-confirm:hover { background: #FDE68A; }
.sr-btn--adding {
  background: #DBEAFE; color: #1E40AF;
  border: 1px solid #BFDBFE;
  cursor: wait;
}
.sr-btn--added {
  background: #D1FAE5; color: #065F46;
  border: 1px solid #A7F3D0;
}
.sr-btn--add-error {
  background: #FEE2E2; color: #991B1B;
  border: 1px solid #FECACA;
}

/* ===== Fresh note dot ===== */
.sr-note-btn-wrap { position: relative; display: inline-flex; }
.sr-fresh-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #0891B2;
}

/* ===== Booked chip (next booking, teal) ===== */
.sr-chip--booked {
  background: #D1FAE5;
  border-color: #A7F3D0;
  color: #065F46;
}

/* ===== Task chip ===== */
.sr-chip--tasks-overdue {
  background: #FEF3C7;
  border-color: #FDE68A;
  color: #92400E;
  cursor: pointer;
}
.sr-chip--tasks {
  cursor: pointer;
}

/* ===== Task popover ===== */
.sr-task-anchor { position: relative; }
.sr-task-popover {
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
.sr-task-item {
  font-size: 12px;
  color: #334155;
  line-height: 1.5;
  padding: 4px 0;
}
.sr-task-item + .sr-task-item {
  border-top: 1px solid #F1F5F9;
  margin-top: 4px;
  padding-top: 8px;
}
.sr-task-title { font-weight: 500; }
.sr-task-meta { font-size: 11px; color: #94A3B8; margin-top: 2px; }
.sr-task-overdue { color: #991B1B; font-weight: 500; }
`;

// ---------------------------------------------------------------------------
// Chip renderers
// ---------------------------------------------------------------------------

function statusBadge(s: CandidateMatch['active_status']): string {
  const cls = s === 'active' ? 'sr-badge--active' : 'sr-badge--inactive';
  return `<span class="sr-badge ${cls}"><span class="sr-badge-dot"></span>${s}</span>`;
}

function confBadge(c: CandidateMatch['confidence']): string {
  if (isConfirmed(c)) {
    const verifiedLabel = c === 'exact_phone' ? 'phone verified' : 'email verified';
    return `<span class="sr-badge sr-badge--in-crm" data-conf-tier="confirmed"><span class="sr-badge-dot"></span>In CRM ✓</span>
      <span class="sr-badge sr-badge--confirmed" data-conf-detail><span class="sr-badge-dot"></span>${verifiedLabel}</span>`;
  }
  return `<span class="sr-badge sr-badge--suggestion" data-conf-tier="suggestion"><span class="sr-badge-dot"></span>Possible match — NOT confirmed</span>`;
}

function licenceChips(cats: LicenceCategory[]): string {
  return cats.map((c) => {
    const st = licenceStatus(c);
    const cls = st === 'expired' ? 'sr-chip--expired' : st === 'expiring' ? 'sr-chip--expiring' : '';
    const title = c.expiry_date ? `Expires ${c.expiry_date.slice(0, 10)}` : 'No expiry';
    return `<span class="sr-chip ${cls}" title="${esc(title)}" data-licence-status="${st}">${icon('shield', 'sr-icon-xs')} ${esc(c.category)}</span>`;
  }).join('');
}

function taskChipButton(m: CandidateMatch): string {
  const tasks = m.open_tasks;
  if (!tasks || tasks.length === 0) return '';
  const hasOverdue = tasks.some((t) => t.overdue);
  const cls = hasOverdue ? 'sr-chip--tasks-overdue' : 'sr-chip--tasks';
  const count = tasks.length;
  return `<span class="sr-task-anchor"><span class="sr-chip ${cls}" data-task-toggle>${icon('clipboardList', 'sr-icon-xs')} ${count} open task${count !== 1 ? 's' : ''}</span>
    <div class="sr-task-popover" hidden data-task-popover>
      ${tasks.map((t) => {
        const dueText = t.due_date
          ? (t.overdue
            ? `<span class="sr-task-overdue">overdue ${relativeDate(t.due_date).replace(' ago', '')}</span>`
            : `due ${relativeDate(t.due_date)}`)
          : '';
        const ownerText = t.owner ? esc(t.owner) : '';
        const metaParts = [ownerText, dueText].filter(Boolean).join('<span class="sr-meta-sep">&middot;</span>');
        return `<div class="sr-task-item" data-task>
          <div class="sr-task-title">${esc(t.title)}</div>
          ${metaParts ? `<div class="sr-task-meta">${metaParts}</div>` : ''}
        </div>`;
      }).join('')}
    </div>
  </span>`;
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

  // Next booking — prominent, before last booking
  if (m.next_booking) {
    const nb = m.next_booking;
    const lbl = nb.client_name
      ? `Booked ${relativeDate(nb.date)} · ${esc(nb.client_name)}`
      : `Booked ${relativeDate(nb.date)}`;
    out.push(`<span class="sr-chip sr-chip--booked" title="${esc(nb.date.slice(0, 10))}" data-next-booking>${icon('calendarCheck', 'sr-icon-xs')} ${lbl}</span>`);
  }

  if (m.last_booking) {
    const lbl = m.last_booking.client_name
      ? `${relativeDate(m.last_booking.date)} · ${esc(m.last_booking.client_name)}`
      : relativeDate(m.last_booking.date);
    out.push(`<span class="sr-chip" title="${esc(m.last_booking.date.slice(0, 10))}">${icon('calendar', 'sr-icon-xs')} ${lbl}</span>`);
  }

  // 90d booking count (replaces lifetime counts when present)
  if (m.recent_booking_count_90d != null && m.recent_booking_count_90d > 0) {
    out.push(`<span class="sr-chip" data-booking-90d>${m.recent_booking_count_90d} shift${m.recent_booking_count_90d !== 1 ? 's' : ''} · 90d</span>`);
  } else if (m.company_booking_count > 0 || m.agency_booking_count > 0) {
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

export function isFreshNote(note: LastNote): boolean {
  const then = new Date(note.created_at).getTime();
  if (isNaN(then)) return false;
  return Date.now() - then < 24 * 3_600_000;
}

function renderNoteCard(note: LastNote, idx: number): string {
  const fresh = isFreshNote(note);
  const newTag = fresh ? '<span class="sr-note-new-tag" data-note-new>New</span>' : '';
  // If 200 chars exactly, likely truncated server-side
  const truncCls = note.text.length >= 200 ? ' sr-note-card-truncated' : '';

  return `<div class="sr-note-card" data-note-card="${idx}">
    <div class="sr-note-card-header">
      <span class="sr-note-card-author">${note.author ? esc(note.author) : 'Unknown'}${newTag}</span>
      <span class="sr-note-card-time" title="${note.created_at ? esc(note.created_at.slice(0, 10)) : ''}">${note.created_at ? relativeDate(note.created_at) : ''}</span>
    </div>
    <div class="sr-note-card-text${truncCls}">${esc(note.text)}</div>
  </div>`;
}

function noteButton(m: CandidateMatch): string {
  const notes: LastNote[] = m.recent_notes && m.recent_notes.length > 0
    ? m.recent_notes
    : m.last_note ? [m.last_note] : [];

  if (notes.length === 0) return '';

  const freshDot = isFreshNote(notes[0])
    ? `<span class="sr-fresh-dot" data-fresh-dot title="Note added ${relativeDate(notes[0].created_at)}"></span>` : '';

  const deepLink = `https://portal.swift-recruit.co.uk/swift/candidates/${m.candidate_id}`;
  const cardsHtml = notes.map((n, i) => renderNoteCard(n, i)).join('');

  return `<span class="sr-note-anchor">
    <span class="sr-note-btn-wrap">
      <button class="sr-btn sr-btn--secondary" type="button" data-note-toggle>
        ${icon('stickyNote', 'sr-icon-sm')} Notes
      </button>
      ${freshDot}
    </span>
    <div class="sr-note-panel" hidden data-note-popover>
      <div class="sr-note-panel-header">
        Notes
        <span class="sr-note-panel-count">${notes.length} note${notes.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="sr-note-panel-body" data-note-body>
        ${cardsHtml}
      </div>
      <div class="sr-note-panel-footer">
        <a href="${esc(deepLink)}" target="_blank" rel="noopener">${icon('externalLink', 'sr-icon-xs')} View all notes in CRM</a>
      </div>
    </div>
  </span>`;
}

function phoneNotOnFileNote(scraped: LookupRequest, matches: CandidateMatch[]): string {
  if (!isPhoneNotOnFile(scraped, matches)) return '';
  return `<span class="sr-phone-note" data-phone-note>${icon('phone', 'sr-icon-xs')} Phone not on file — matched by email</span>`;
}

function lastContactElement(m: CandidateMatch): string {
  if (!m.last_contact_date) {
    return `<span class="sr-last-contact sr-last-contact--stale" data-last-contact="stale">${icon('clock', 'sr-icon-xs')} No contact logged</span>`;
  }
  const then = new Date(m.last_contact_date).getTime();
  const stale = !isNaN(then) && (Date.now() - then > 30 * 86_400_000);
  const cls = stale ? ' sr-last-contact--stale' : '';
  return `<span class="sr-last-contact${cls}" data-last-contact="${stale ? 'stale' : 'recent'}" title="${esc(m.last_contact_date.slice(0, 10))}">${icon('clock', 'sr-icon-xs')} Last contact ${relativeDate(m.last_contact_date)}</span>`;
}

function metaRow(m: CandidateMatch): string {
  const parts: string[] = [];
  if (m.recruiter_name) parts.push(esc(m.recruiter_name));
  if (m.resourcer_name) parts.push(esc(m.resourcer_name));
  if (m.registered_at) parts.push(`Reg. <span title="${esc(m.registered_at.slice(0, 10))}">${relativeDate(m.registered_at)}</span>`);
  if (parts.length === 0) return '';
  return `<div class="sr-row-3"><span class="sr-meta" data-meta-row>${parts.join('<span class="sr-meta-sep">&middot;</span>')}</span></div>`;
}

function singleMatchRow(m: CandidateMatch, scraped: LookupRequest, allMatches: CandidateMatch[]): string {
  const deepLink = `https://portal.swift-recruit.co.uk/swift/candidates/${m.candidate_id}`;
  const suggestion = isSuggestion(m.confidence);
  const caveat = suggestion
    ? `<span class="sr-caveat" data-caveat>verify phone before contacting</span>` : '';

  const crmBtnClass = suggestion ? 'sr-btn--amber' : 'sr-btn--primary';
  const crmBtnLabel = suggestion ? 'Review possible match' : 'Open in CRM';

  const chips = summaryChips(m);

  return `
    <div class="sr-match-rows" data-candidate-id="${m.candidate_id}">
      <div class="sr-row-1">
        ${warningText(m)}
        <span class="sr-brand"><span class="sr-teal-dot"></span>Swift Recruit</span>
        <span class="sr-sep"></span>
        <span class="sr-name">${esc(m.name)}</span>
        ${statusBadge(m.active_status)}
        ${confBadge(m.confidence)}
        ${lastContactElement(m)}
        ${caveat}
        ${phoneNotOnFileNote(scraped, allMatches)}
        <span class="sr-row-right">
          ${noteButton(m)}
          ${taskChipButton(m)}
          <button class="sr-btn sr-btn--call" type="button" data-call="${m.candidate_id}" data-call-phone="${esc(m.phone_number)}" title="Call ${esc(m.name)}">
            ${icon('phone', 'sr-icon-sm')} Call
          </button>
          <button class="sr-btn sr-btn--secondary" type="button" data-open-softphone="${m.candidate_id}" data-softphone-name="${esc(m.name)}" title="Open softphone">
            ${icon('phone', 'sr-icon-sm')} Softphone
          </button>
          <a class="sr-btn ${crmBtnClass}" href="${esc(deepLink)}" target="_blank" rel="noopener" data-deeplink>
            ${icon('externalLink', 'sr-icon-sm')} ${crmBtnLabel}
          </a>
          <button class="sr-btn sr-btn--secondary" type="button" data-copy-phone="${esc(m.phone_number)}">
            ${icon('copy', 'sr-icon-sm')} ${esc(m.phone_number)}
          </button>
          <button class="sr-collapse-btn" type="button" data-collapse>
            ${icon('chevronUp', 'sr-icon-sm')}
          </button>
        </span>
      </div>
      ${chips ? `<div class="sr-row-2">${chips}</div>` : ''}
      ${metaRow(m)}
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
  const confirmed = matches.some((m) => isConfirmed(m.confidence));
  const countBadgeCls = confirmed ? 'sr-badge--in-crm' : 'sr-badge--suggestion';
  return `
    <div class="sr-row">
      <span class="sr-brand"><span class="sr-teal-dot"></span>Swift Recruit</span>
      <span class="sr-sep"></span>
      <span class="sr-name">${esc(m.name)}</span>
      ${statusBadge(m.active_status)}
      <span class="sr-badge ${countBadgeCls}"><span class="sr-badge-dot"></span>${count} match${count !== 1 ? 'es' : ''}</span>
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

function multiMatchBar(matches: CandidateMatch[], scraped: LookupRequest): string {
  const sorted = [...matches].sort((a, b) =>
    (CONFIDENCE_ORDER[a.confidence] ?? 9) - (CONFIDENCE_ORDER[b.confidence] ?? 9));

  const hasSuggestion = sorted.some((m) => isSuggestion(m.confidence));
  const pills = sorted.map((m, i) => {
    const cls = expandedPill === i ? 'sr-pill--expanded' : '';
    return `<span class="sr-pill ${cls}" data-pill-index="${i}" data-candidate-id="${m.candidate_id}">${esc(m.name)}</span>`;
  }).join('');

  const caveat = hasSuggestion ? '<span class="sr-caveat" data-caveat>includes unconfirmed match — verify phone</span>' : '';

  let expandedRow = '';
  if (expandedPill !== null && sorted[expandedPill]) {
    const m = sorted[expandedPill];
    expandedRow = `<div class="sr-expanded">${singleMatchRow(m, scraped, sorted)}</div>`;
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
  const m0 = matches[0];
  const warnCls = matches.length === 1 ? warningBarClasses(m0) : '';
  const suggestionCls = matches.every((m) => isSuggestion(m.confidence)) ? 'sr-bar--suggestion' : '';
  const collapsedCls = collapsed ? 'sr-bar--collapsed' : '';

  let body: string;
  if (collapsed) {
    body = collapsedStrip(state);
  } else if (matches.length === 1) {
    body = singleMatchRow(m0, state.scraped, matches);
  } else {
    body = multiMatchBar(matches, state.scraped);
  }

  return `<div class="sr-bar ${warnCls} ${suggestionCls} ${collapsedCls}" data-status="match">${body}</div>`;
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

    case 'no-match': {
      const scrapedPhone = state.scraped.phone ? normalisePhoneE164(state.scraped.phone) : null;
      const phoneDisplay = scrapedPhone
        ? `<span class="sr-sep"></span><span class="sr-state-sub" data-scraped-phone>${icon('phone', 'sr-icon-xs')} Checked: ${esc(scrapedPhone)}</span>` : '';
      const scrapedName = state.scraped.name ? esc(state.scraped.name) : '';
      return `<div class="sr-bar sr-bar--not-in-crm" data-status="no-match">
        <div class="sr-state-row">
          <span class="sr-brand"><span class="sr-teal-dot"></span>Swift Recruit</span>
          <span class="sr-sep"></span>
          ${icon('userPlus', 'sr-icon-sm')}
          <span class="sr-state-msg">Not in Swift Recruit</span>
          ${phoneDisplay}
          <span class="sr-row-right">
            <button class="sr-btn sr-btn--primary" type="button" data-add-to-crm data-scraped-name="${scrapedName}">
              ${icon('userPlus', 'sr-icon-sm')} Add to Swift Recruit
            </button>
          </span>
        </div>
      </div>`;
    }

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

  // Call button
  root.querySelectorAll<HTMLElement>('[data-call]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const candidateId = parseInt(btn.getAttribute('data-call') ?? '0', 10);
      const phone = btn.getAttribute('data-call-phone') ?? '';
      btn.className = 'sr-btn sr-btn--calling';
      btn.innerHTML = `${icon('phone', 'sr-icon-sm')} Calling…`;

      chrome.runtime.sendMessage(
        { type: 'INITIATE_CALL', payload: { candidate_id: candidateId, phone } },
        (response: { ok: boolean; error?: string } | undefined) => {
          if (chrome.runtime.lastError || !response?.ok) {
            const err = response?.error ?? chrome.runtime.lastError?.message ?? 'Unknown error';
            const isNotAvailable = err.includes('404') || err.includes('not yet');
            btn.className = 'sr-btn sr-btn--call-error';
            btn.innerHTML = `${icon('phone', 'sr-icon-sm')} ${isNotAvailable ? 'Call service not yet available' : 'Call failed'}`;
            setTimeout(() => {
              btn.className = 'sr-btn sr-btn--call';
              btn.innerHTML = `${icon('phone', 'sr-icon-sm')} Call`;
            }, 3000);
          } else {
            btn.className = 'sr-btn sr-btn--call';
            btn.innerHTML = `${icon('phone', 'sr-icon-sm')} Call`;
          }
        },
      );
    });
  });

  // Open softphone side panel
  root.querySelectorAll<HTMLElement>('[data-open-softphone]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const candidateId = parseInt(btn.getAttribute('data-open-softphone') ?? '0', 10);
      const name = btn.getAttribute('data-softphone-name') ?? '';
      chrome.runtime.sendMessage({ type: 'OPEN_SOFTPHONE', payload: { candidate_id: candidateId, name } });
    });
  });

  // Note popover toggle — traverse up to .sr-note-anchor to find sibling popover
  root.querySelectorAll<HTMLElement>('[data-note-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const anchor = btn.closest('.sr-note-anchor');
      const popover = anchor?.querySelector('[data-note-popover]') as HTMLElement | null;
      if (popover) popover.hidden = !popover.hidden;
    });
  });

  // Task popover toggle — traverse up to .sr-task-anchor
  root.querySelectorAll<HTMLElement>('[data-task-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const anchor = btn.closest('.sr-task-anchor');
      const popover = anchor?.querySelector('[data-task-popover]') as HTMLElement | null;
      if (popover) popover.hidden = !popover.hidden;
    });
  });

  // Close popovers on outside click
  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest?.('[data-note-anchor]') && !target.closest?.('[data-note-toggle]')) {
      root.querySelectorAll<HTMLElement>('[data-note-popover]').forEach((p) => { p.hidden = true; });
    }
    if (!target.closest?.('[data-task-anchor]') && !target.closest?.('[data-task-toggle]')) {
      root.querySelectorAll<HTMLElement>('[data-task-popover]').forEach((p) => { p.hidden = true; });
    }
  });

  // Add to CRM — confirm step
  root.querySelectorAll<HTMLElement>('[data-add-to-crm]').forEach((btn) => {
    let confirmTimer: ReturnType<typeof setTimeout> | null = null;
    let confirmed = false;

    btn.addEventListener('click', () => {
      if (confirmed) return; // already submitting

      if (!btn.hasAttribute('data-confirming')) {
        // First click — morph to confirm
        const name = btn.getAttribute('data-scraped-name') ?? '';
        btn.setAttribute('data-confirming', 'true');
        btn.className = 'sr-btn sr-btn--add-confirm';
        btn.innerHTML = `${icon('userPlus', 'sr-icon-sm')} Confirm add: ${name}?`;

        confirmTimer = setTimeout(() => {
          // Revert after 5s
          btn.removeAttribute('data-confirming');
          btn.className = 'sr-btn sr-btn--primary';
          btn.innerHTML = `${icon('userPlus', 'sr-icon-sm')} Add to Swift Recruit`;
        }, 5000);
      } else {
        // Second click — confirmed
        if (confirmTimer) clearTimeout(confirmTimer);
        confirmed = true;
        btn.className = 'sr-btn sr-btn--adding';
        btn.innerHTML = `<svg class="sr-spinner sr-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.loader}</svg> Adding…`;

        if (onAddToCrm) onAddToCrm();
      }
    });
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

export function setAddButtonState(state: 'added' | 'error', message?: string): void {
  if (!shadowRoot) return;
  const btn = shadowRoot.querySelector('[data-add-to-crm]') as HTMLElement | null;
  if (!btn) return;

  if (state === 'added') {
    btn.className = 'sr-btn sr-btn--added';
    btn.innerHTML = `${icon('checkCircle', 'sr-icon-sm')} Added ✓`;
  } else {
    btn.className = 'sr-btn sr-btn--add-error';
    btn.innerHTML = `${icon('alertTriangle', 'sr-icon-sm')} ${esc(message ?? 'Failed')}`;
    setTimeout(() => {
      btn.className = 'sr-btn sr-btn--primary';
      btn.innerHTML = `${icon('userPlus', 'sr-icon-sm')} Add to Swift Recruit`;
      btn.removeAttribute('data-confirming');
    }, 3000);
  }
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
