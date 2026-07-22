import type { BackgroundResponse, CandidateMatch, LicenceCategory } from '@/lib/types';

// --- Panel state type ---

export type PanelState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'match'; data: BackgroundResponse & { ok: true } }
  | { status: 'no-match' }
  | { status: 'error'; error: string }
  | { status: 'logged-out' };

// --- Lucide SVG icon paths (16x16 viewBox="0 0 24 24") ---

const ICONS = {
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  alertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  mapPin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  stickyNote: '<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronUp: '<path d="m18 15-6-6-6 6"/>',
  externalLink: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
  xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  loader: '<path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  logIn: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>',
} as const;

function icon(name: keyof typeof ICONS, cls = ''): string {
  return `<svg class="sr-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

// --- Date helpers ---

export function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (isNaN(then)) return iso;
  const diffMs = now - then;
  const future = diffMs < 0;
  const absDiff = Math.abs(diffMs);
  const mins = Math.floor(absDiff / 60_000);
  const hours = Math.floor(absDiff / 3_600_000);
  const days = Math.floor(absDiff / 86_400_000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  let label: string;
  if (mins < 1) label = 'just now';
  else if (mins < 60) label = `${mins}m`;
  else if (hours < 24) label = `${hours}h`;
  else if (days < 7) label = `${days}d`;
  else if (weeks < 5) label = `${weeks}w`;
  else label = `${months}mo`;

  if (label === 'just now') return label;
  return future ? `in ${label}` : `${label} ago`;
}

// --- Licence status ---

export type LicenceStatus = 'valid' | 'expiring' | 'expired';

export function licenceStatus(cat: LicenceCategory): LicenceStatus {
  if (!cat.expiry_date) return 'valid';
  const exp = new Date(cat.expiry_date).getTime();
  if (isNaN(exp)) return 'valid';
  const now = Date.now();
  if (exp < now) return 'expired';
  const thirtyDays = 30 * 86_400_000;
  if (exp - now < thirtyDays) return 'expiring';
  return 'valid';
}

// --- Confidence order for sorting ---

const CONFIDENCE_ORDER: Record<string, number> = {
  exact_phone: 0,
  exact_email: 1,
  fuzzy_name_postcode: 2,
  name_location: 3,
};

// --- HTML escape ---

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Host + Shadow DOM ---

const HOST_ID = 'sr-panel-host';
let shadowRoot: ShadowRoot | null = null;

function getOrCreateHost(): HTMLElement {
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'all:initial; position:fixed; top:0; right:0; bottom:0; left:0; z-index:2147483647; pointer-events:none;';
    document.body.appendChild(host);
  }
  return host;
}

function getShadowRoot(): ShadowRoot {
  if (shadowRoot) return shadowRoot;
  const host = getOrCreateHost();
  shadowRoot = host.attachShadow({ mode: 'open' });
  return shadowRoot;
}

// --- CRM Design Token Styles ---

const PANEL_CSS = /* css */ `
/* ===== Reset ===== */
:host { all: initial; }

*,*::before,*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border-color: #E5E7EB;
}

/* ===== Base ===== */
.sr-panel {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 340px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  overflow-x: hidden;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04);
  pointer-events: auto;
  font-family: 'Inter', 'Geist', system-ui, -apple-system, sans-serif;
  font-size: 13px;
  color: #0F172A;
  -webkit-font-smoothing: antialiased;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.sr-panel.sr-collapsed {
  max-height: none;
  overflow: visible;
}

.sr-panel::-webkit-scrollbar { width: 4px; }
.sr-panel::-webkit-scrollbar-track { background: transparent; }
.sr-panel::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 2px; }

/* ===== Icon ===== */
.sr-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  vertical-align: middle;
}

.sr-icon-sm { width: 12px; height: 12px; }
.sr-icon-xs { width: 10px; height: 10px; }

/* ===== Header bar ===== */
.sr-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #F8FAFC;
  border-bottom: 1px solid #E5E7EB;
  border-radius: 8px 8px 0 0;
  cursor: grab;
  user-select: none;
}

.sr-topbar-title {
  font-size: 12px;
  font-weight: 600;
  color: #0F172A;
  letter-spacing: -0.025em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sr-topbar-title .sr-teal-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #0891B2;
}

.sr-topbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sr-topbar-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #64748B;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
}

.sr-topbar-btn:hover { background: #F1F5F9; color: #0F172A; }

/* ===== Warning banner ===== */
.sr-warning-banner {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.4;
}

.sr-warning-banner .sr-icon { flex-shrink: 0; margin-top: 1px; }

.sr-warning--unsuitable {
  background: #FEE2E2;
  color: #991B1B;
  border-bottom: 1px solid #FECACA;
}

.sr-warning--deletion {
  background: #FEF3C7;
  color: #92400E;
  border-bottom: 1px solid #FDE68A;
}

/* ===== Card header ===== */
.sr-card-header {
  padding: 14px 14px 10px;
}

.sr-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.sr-candidate-name {
  font-size: 14px;
  font-weight: 600;
  color: #0F172A;
  letter-spacing: -0.025em;
  line-height: 1.3;
}

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
}

.sr-badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sr-badge--active {
  background: #D1FAE5; color: #065F46; border-color: #A7F3D0;
}
.sr-badge--active .sr-badge-dot { background: #065F46; }

.sr-badge--inactive {
  background: #F1F5F9; color: #475569; border-color: #E2E8F0;
}
.sr-badge--inactive .sr-badge-dot { background: #94A3B8; }

.sr-badge--phone {
  background: #DBEAFE; color: #1E40AF; border-color: #BFDBFE;
}
.sr-badge--phone .sr-badge-dot { background: #1E40AF; }

.sr-badge--email {
  background: #DBEAFE; color: #1E40AF; border-color: #BFDBFE;
}
.sr-badge--email .sr-badge-dot { background: #1E40AF; }

.sr-badge--fuzzy {
  background: #FEF3C7; color: #92400E; border-color: #FDE68A;
}
.sr-badge--fuzzy .sr-badge-dot { background: #92400E; }

.sr-badge--name-loc {
  background: #FEF3C7; color: #92400E; border-color: #FDE68A;
}
.sr-badge--name-loc .sr-badge-dot { background: #92400E; }

.sr-badge--searching {
  background: #DBEAFE; color: #1E40AF; border-color: #BFDBFE;
}
.sr-badge--searching .sr-badge-dot { background: #1E40AF; }

.sr-badge--no-match {
  background: #FEF3C7; color: #92400E; border-color: #FDE68A;
}
.sr-badge--no-match .sr-badge-dot { background: #92400E; }

.sr-badge--error {
  background: #FEE2E2; color: #991B1B; border-color: #FECACA;
}
.sr-badge--error .sr-badge-dot { background: #991B1B; }

/* ===== Meta line (recruiter, resourcer, date) ===== */
.sr-meta-line {
  font-size: 11px;
  color: #64748B;
  line-height: 1.5;
  margin-top: 4px;
}

.sr-meta-sep { margin: 0 4px; color: #CBD5E1; }

.sr-caveat {
  font-size: 11px;
  color: #92400E;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 6px;
  padding: 6px 10px;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ===== Summary strip ===== */
.sr-summary {
  padding: 0 14px 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sr-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 6px;
  background: #F1F5F9;
  border: 1px solid #E2E8F0;
  color: #475569;
  white-space: nowrap;
}

.sr-chip--valid { }
.sr-chip--expiring { background: #FEF3C7; border-color: #FDE68A; color: #92400E; }
.sr-chip--expired  { background: #FEE2E2; border-color: #FECACA; color: #991B1B; }

.sr-chip--available { background: #D1FAE5; border-color: #A7F3D0; color: #065F46; }
.sr-chip--unavailable { background: #F1F5F9; border-color: #E2E8F0; color: #94A3B8; }

.sr-chip--hot  { background: #D1FAE5; border-color: #A7F3D0; color: #065F46; }
.sr-chip--warm { background: #DBEAFE; border-color: #BFDBFE; color: #1E40AF; }
.sr-chip--cold { background: #F1F5F9; border-color: #E2E8F0; color: #94A3B8; }

.sr-chip .sr-icon { color: inherit; }

.sr-divider {
  border: none;
  border-top: 1px solid #E5E7EB;
  margin: 0 14px;
}

/* ===== Collapsible section ===== */
.sr-section {
  border-top: 1px solid #E5E7EB;
}

.sr-section-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #94A3B8;
  transition: background-color 0.15s ease;
}

.sr-section-trigger:hover { background: #F8FAFC; }

.sr-section-trigger .sr-icon {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: #94A3B8;
}

.sr-section-body {
  padding: 0 14px 10px;
  font-size: 12px;
  color: #334155;
  line-height: 1.5;
}

.sr-note-text {
  font-size: 12px;
  color: #334155;
  line-height: 1.5;
  margin-bottom: 4px;
}

.sr-note-meta {
  font-size: 11px;
  color: #94A3B8;
}

.sr-activity-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
}

.sr-activity-row .sr-label { color: #64748B; font-weight: 500; }
.sr-activity-row .sr-value { color: #334155; }

/* ===== Footer ===== */
.sr-footer {
  padding: 10px 14px;
  border-top: 1px solid #E5E7EB;
  display: flex;
  gap: 8px;
}

.sr-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
  line-height: 1.4;
  font-family: inherit;
}

.sr-btn:active { transform: scale(0.98); }

.sr-btn--primary {
  background: #0891B2;
  color: #FFFFFF;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  flex: 1;
}

.sr-btn--primary:hover { background: #0E7490; }

.sr-btn--secondary {
  background: #F1F5F9;
  color: #475569;
  border: 1px solid #E2E8F0;
}

.sr-btn--secondary:hover { background: #E2E8F0; }

/* ===== Multi-match list ===== */
.sr-match-list {
  padding: 0;
}

.sr-match-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid #E5E7EB;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.sr-match-row:hover { background: #F6F8FA; }
.sr-match-row:last-child { border-bottom: none; }

.sr-match-row-name {
  font-size: 13px;
  font-weight: 500;
  color: #0F172A;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sr-match-row-date {
  font-size: 11px;
  color: #94A3B8;
  white-space: nowrap;
}

/* ===== State screens ===== */
.sr-state-body {
  padding: 28px 20px;
  text-align: center;
}

.sr-state-icon {
  width: 32px;
  height: 32px;
  margin: 0 auto 10px;
  color: #94A3B8;
}

.sr-state-icon--teal { color: #0891B2; }
.sr-state-icon--warning { color: #F59E0B; }
.sr-state-icon--error { color: #EF4444; }

.sr-state-title {
  font-size: 13px;
  font-weight: 600;
  color: #0F172A;
  margin-bottom: 4px;
}

.sr-state-msg {
  font-size: 12px;
  color: #64748B;
  line-height: 1.5;
}

/* ===== Spinner ===== */
@keyframes sr-spin { to { transform: rotate(360deg); } }

.sr-spinner {
  width: 32px;
  height: 32px;
  margin: 0 auto 10px;
  color: #0891B2;
  animation: sr-spin 0.8s linear infinite;
}

/* ===== Match count footer meta ===== */
.sr-result-meta {
  font-size: 11px;
  color: #94A3B8;
  padding: 6px 14px;
  border-top: 1px solid #E5E7EB;
  text-align: right;
}

/* ===== Card body wrapper ===== */
.sr-card-body { }
`;

// --- Renderers ---

function confidenceBadgeClass(c: CandidateMatch['confidence']): string {
  switch (c) {
    case 'exact_phone': return 'sr-badge--phone';
    case 'exact_email': return 'sr-badge--email';
    case 'fuzzy_name_postcode': return 'sr-badge--fuzzy';
    case 'name_location': return 'sr-badge--name-loc';
  }
}

function confidenceLabel(c: CandidateMatch['confidence']): string {
  switch (c) {
    case 'exact_phone': return 'Phone';
    case 'exact_email': return 'Email';
    case 'fuzzy_name_postcode': return 'Fuzzy';
    case 'name_location': return 'Name + location';
  }
}

function statusBadge(status: CandidateMatch['active_status']): string {
  const cls = status === 'active' ? 'sr-badge--active' : 'sr-badge--inactive';
  return `<span class="sr-badge ${cls}"><span class="sr-badge-dot"></span>${status}</span>`;
}

function confBadge(c: CandidateMatch['confidence']): string {
  return `<span class="sr-badge ${confidenceBadgeClass(c)}"><span class="sr-badge-dot"></span>${confidenceLabel(c)}</span>`;
}

function renderWarnings(m: CandidateMatch): string {
  let html = '';
  if (m.marked_unsuitable) {
    html += `<div class="sr-warning-banner sr-warning--unsuitable" data-warning="unsuitable">
      ${icon('alertTriangle')}
      <div><strong>Marked unsuitable</strong>${m.unsuitable_reason ? '<br/>' + esc(m.unsuitable_reason) : ''}</div>
    </div>`;
  }
  if (m.marked_for_deletion) {
    html += `<div class="sr-warning-banner sr-warning--deletion" data-warning="deletion">
      ${icon('alertTriangle')}
      <div><strong>Flagged for deletion</strong></div>
    </div>`;
  }
  return html;
}

function renderMetaLine(m: CandidateMatch): string {
  const parts: string[] = [];
  if (m.recruiter_name) parts.push(esc(m.recruiter_name));
  if (m.resourcer_name) parts.push(esc(m.resourcer_name));
  if (m.registered_at) parts.push(`Reg. <span title="${esc(m.registered_at.slice(0, 10))}">${relativeDate(m.registered_at)}</span>`);
  if (parts.length === 0) return '';
  return `<div class="sr-meta-line">${parts.join('<span class="sr-meta-sep">&middot;</span>')}</div>`;
}

function renderLicenceChips(cats: LicenceCategory[]): string {
  return cats.map((c) => {
    const st = licenceStatus(c);
    const cls = st === 'expired' ? 'sr-chip--expired' : st === 'expiring' ? 'sr-chip--expiring' : 'sr-chip--valid';
    const title = c.expiry_date ? `Expires ${c.expiry_date.slice(0, 10)}` : 'No expiry';
    return `<span class="sr-chip ${cls}" title="${esc(title)}" data-licence-status="${st}">${icon('shield', 'sr-icon-xs')} ${esc(c.category)}</span>`;
  }).join('');
}

function renderSummaryStrip(m: CandidateMatch): string {
  const chips: string[] = [];

  // Licences
  if (m.licence_categories.length > 0) {
    chips.push(renderLicenceChips(m.licence_categories));
  }

  // Points (only if >0)
  if (m.licence_points > 0) {
    const ptsCls = m.licence_points >= 9 ? 'sr-chip--expired' : m.licence_points >= 6 ? 'sr-chip--expiring' : '';
    chips.push(`<span class="sr-chip ${ptsCls}" data-points="${m.licence_points}">${m.licence_points} pts</span>`);
  }

  // Job categories
  for (const jc of m.job_categories) {
    chips.push(`<span class="sr-chip">${icon('briefcase', 'sr-icon-xs')} ${esc(jc)}</span>`);
  }

  // Last booking
  if (m.last_booking) {
    const bookingLabel = m.last_booking.client_name
      ? `${relativeDate(m.last_booking.date)} · ${esc(m.last_booking.client_name)}`
      : relativeDate(m.last_booking.date);
    chips.push(`<span class="sr-chip" title="${esc(m.last_booking.date.slice(0, 10))}">${icon('calendar', 'sr-icon-xs')} ${bookingLabel}</span>`);
  }

  // Booking counts (only if >0)
  if (m.company_booking_count > 0 || m.agency_booking_count > 0) {
    const parts: string[] = [];
    if (m.company_booking_count > 0) parts.push(`${m.company_booking_count} co.`);
    if (m.agency_booking_count > 0) parts.push(`${m.agency_booking_count} ag.`);
    chips.push(`<span class="sr-chip">${parts.join(' / ')}</span>`);
  }

  // Available this week
  if (m.available_this_week) {
    chips.push(`<span class="sr-chip sr-chip--available">${icon('checkCircle', 'sr-icon-xs')} Available</span>`);
  }

  // Engagement health
  if (m.engagement?.health) {
    const h = m.engagement.health.toLowerCase();
    const healthCls = h === 'hot' ? 'sr-chip--hot' : h === 'warm' ? 'sr-chip--warm' : h === 'cold' ? 'sr-chip--cold' : '';
    chips.push(`<span class="sr-chip ${healthCls}" data-health="${esc(h)}">${esc(m.engagement.health)}</span>`);
  }

  if (chips.length === 0) return '';
  return `<div class="sr-summary">${chips.join('')}</div>`;
}

function renderCollapsibleSections(m: CandidateMatch): string {
  const sections: string[] = [];

  // Last note
  if (m.last_note) {
    sections.push(`
      <div class="sr-section" data-section="note">
        <button class="sr-section-trigger" type="button" data-toggle="note">
          <span>Last note</span>
          ${icon('chevronDown', 'sr-icon-sm')}
        </button>
        <div class="sr-section-body" hidden data-body="note">
          <div class="sr-note-text">${esc(m.last_note.text)}</div>
          <div class="sr-note-meta">
            ${m.last_note.author ? esc(m.last_note.author) : ''}${m.last_note.author && m.last_note.created_at ? '<span class="sr-meta-sep">&middot;</span>' : ''}${m.last_note.created_at ? `<span title="${esc(m.last_note.created_at.slice(0, 10))}">${relativeDate(m.last_note.created_at)}</span>` : ''}
          </div>
        </div>
      </div>
    `);
  }

  // Activity
  const activityRows: string[] = [];
  if (m.last_contact_date) {
    activityRows.push(`<div class="sr-activity-row"><span class="sr-label">Last contact</span><span class="sr-value" title="${esc(m.last_contact_date.slice(0, 10))}">${relativeDate(m.last_contact_date)}</span></div>`);
  }
  if (m.next_availability_date) {
    activityRows.push(`<div class="sr-activity-row"><span class="sr-label">Next available</span><span class="sr-value" title="${esc(m.next_availability_date.slice(0, 10))}">${relativeDate(m.next_availability_date)}</span></div>`);
  }
  if (m.engagement) {
    if (m.engagement.funnel_stage) {
      activityRows.push(`<div class="sr-activity-row"><span class="sr-label">Funnel stage</span><span class="sr-value">${esc(m.engagement.funnel_stage)}</span></div>`);
    }
    if (m.engagement.response_rate > 0) {
      activityRows.push(`<div class="sr-activity-row"><span class="sr-label">Response rate</span><span class="sr-value">${Math.round(m.engagement.response_rate * 100)}%</span></div>`);
    }
  }

  if (activityRows.length > 0) {
    sections.push(`
      <div class="sr-section" data-section="activity">
        <button class="sr-section-trigger" type="button" data-toggle="activity">
          <span>Activity</span>
          ${icon('chevronDown', 'sr-icon-sm')}
        </button>
        <div class="sr-section-body" hidden data-body="activity">
          ${activityRows.join('')}
        </div>
      </div>
    `);
  }

  return sections.join('');
}

function renderFooter(m: CandidateMatch): string {
  const deepLink = `https://portal.swift-recruit.com/swift/candidates/${m.candidate_id}`;
  return `
    <div class="sr-footer">
      <a class="sr-btn sr-btn--primary" href="${esc(deepLink)}" target="_blank" rel="noopener" data-deeplink>
        ${icon('externalLink', 'sr-icon-sm')} Open in CRM
      </a>
      <button class="sr-btn sr-btn--secondary" type="button" data-copy-phone="${esc(m.phone_number)}">
        ${icon('copy', 'sr-icon-sm')} ${esc(m.phone_number)}
      </button>
    </div>
  `;
}

function renderSingleMatch(m: CandidateMatch): string {
  return `
    ${renderWarnings(m)}
    <div class="sr-card-header">
      <div class="sr-name-row">
        <span class="sr-candidate-name">${esc(m.name)}</span>
        ${statusBadge(m.active_status)}
        ${confBadge(m.confidence)}
      </div>
      ${renderMetaLine(m)}
      ${m.confidence === 'name_location' ? `<div class="sr-caveat">${icon('alertTriangle', 'sr-icon-sm')} Loose match — verify phone before contacting</div>` : ''}
    </div>
    ${renderSummaryStrip(m)}
    ${renderCollapsibleSections(m)}
    ${renderFooter(m)}
  `;
}

function renderMultiMatchList(matches: CandidateMatch[]): string {
  const sorted = [...matches].sort((a, b) =>
    (CONFIDENCE_ORDER[a.confidence] ?? 9) - (CONFIDENCE_ORDER[b.confidence] ?? 9),
  );

  const rows = sorted.map((m, i) => `
    <div class="sr-match-row" data-match-index="${i}" data-candidate-id="${m.candidate_id}">
      <span class="sr-match-row-name">${esc(m.name)}</span>
      ${statusBadge(m.active_status)}
      ${confBadge(m.confidence)}
      ${m.last_booking ? `<span class="sr-match-row-date" title="${esc(m.last_booking.date.slice(0, 10))}">${relativeDate(m.last_booking.date)}</span>` : ''}
    </div>
  `).join('');

  return `<div class="sr-match-list">${rows}</div>`;
}

function renderMatchBody(state: PanelState & { status: 'match' }): string {
  const matches = state.data.data.matches;
  if (matches.length === 1) {
    return `<div class="sr-card-body">${renderSingleMatch(matches[0])}</div>`;
  }

  // Multi-match: show list, clicking a row expands that match
  return `
    <div class="sr-card-body" data-multi>
      ${renderMultiMatchList(matches)}
    </div>
  `;
}

function renderTopbarBadge(state: PanelState): string {
  switch (state.status) {
    case 'idle':
      return '';
    case 'searching':
      return '<span class="sr-badge sr-badge--searching"><span class="sr-badge-dot"></span>Searching</span>';
    case 'match': {
      const c = state.data.data.matches.length;
      return `<span class="sr-badge sr-badge--active"><span class="sr-badge-dot"></span>${c} match${c !== 1 ? 'es' : ''}</span>`;
    }
    case 'no-match':
      return '<span class="sr-badge sr-badge--no-match"><span class="sr-badge-dot"></span>No match</span>';
    case 'error':
      return '<span class="sr-badge sr-badge--error"><span class="sr-badge-dot"></span>Error</span>';
    case 'logged-out':
      return '';
  }
}

function renderStateBody(state: PanelState): string {
  switch (state.status) {
    case 'idle':
      return `<div class="sr-state-body">
        <svg class="sr-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.search}</svg>
        <div class="sr-state-title">No candidate detected</div>
        <div class="sr-state-msg">Navigate to a candidate profile to start matching.</div>
      </div>`;

    case 'searching':
      return `<div class="sr-state-body">
        <svg class="sr-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.loader}</svg>
        <div class="sr-state-title">Searching</div>
        <div class="sr-state-msg">Looking up candidate in Swift Recruit...</div>
      </div>`;

    case 'match':
      return renderMatchBody(state);

    case 'no-match':
      return `<div class="sr-state-body">
        <svg class="sr-state-icon sr-state-icon--warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.xCircle}</svg>
        <div class="sr-state-title">No match found</div>
        <div class="sr-state-msg">This candidate doesn't appear in Swift Recruit.</div>
      </div>`;

    case 'error':
      return `<div class="sr-state-body">
        <svg class="sr-state-icon sr-state-icon--error" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.alertTriangle}</svg>
        <div class="sr-state-title">Something went wrong</div>
        <div class="sr-state-msg">${esc(state.error)}</div>
      </div>`;

    case 'logged-out':
      return `<div class="sr-state-body">
        <svg class="sr-state-icon sr-state-icon--teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.logIn}</svg>
        <div class="sr-state-title">Not logged in</div>
        <div class="sr-state-msg">Open the extension popup and log in to start matching candidates.</div>
      </div>`;
  }
}

function renderResultMeta(state: PanelState): string {
  if (state.status !== 'match') return '';
  const { matches, metadata } = state.data.data;
  return `<div class="sr-result-meta">${matches.length} match${matches.length !== 1 ? 'es' : ''} &middot; ${metadata.duration_ms}ms</div>`;
}

// --- Event wiring ---

function wireEvents(root: ShadowRoot): void {
  // Collapsible sections
  root.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-toggle')!;
      const body = root.querySelector<HTMLElement>(`[data-body="${key}"]`);
      if (!body) return;
      const isHidden = body.hidden;
      body.hidden = !isHidden;
      // Rotate chevron
      const chevIcon = btn.querySelector('.sr-icon');
      if (chevIcon) {
        (chevIcon as HTMLElement).style.transform = isHidden ? 'rotate(180deg)' : '';
      }
    });
  });

  // Copy phone
  root.querySelectorAll<HTMLButtonElement>('[data-copy-phone]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const phone = btn.getAttribute('data-copy-phone');
      if (phone) navigator.clipboard.writeText(phone);
    });
  });

  // Multi-match row click → expand
  root.querySelectorAll<HTMLElement>('[data-match-index]').forEach((row) => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.getAttribute('data-match-index') ?? '0', 10);
      const container = root.querySelector<HTMLElement>('[data-multi]');
      if (!container) return;
      // Store matches from the current render in closure — read from DOM data
      const allRows = container.querySelectorAll('.sr-match-row');
      const matchCount = allRows.length;
      if (idx < 0 || idx >= matchCount) return;
      // The match data is stored on the render context; re-render via event
      container.dispatchEvent(new CustomEvent('sr-expand', { detail: idx }));
    });
  });
}

// --- Render state for expanded multi-match ---

let currentMatches: CandidateMatch[] = [];
let expandedIndex: number | null = null;

function renderMultiExpanded(root: ShadowRoot, idx: number): void {
  const m = currentMatches[idx];
  if (!m) return;
  const cardBody = root.querySelector('.sr-card-body');
  if (!cardBody) return;

  // Replace list with: back button + single card
  cardBody.innerHTML = `
    <div style="padding:8px 14px 0;">
      <button class="sr-btn sr-btn--secondary" type="button" data-back style="font-size:12px;padding:4px 10px;">
        ${icon('chevronUp', 'sr-icon-xs')} All matches
      </button>
    </div>
    ${renderSingleMatch(m)}
  `;

  expandedIndex = idx;

  // Wire back button
  const backBtn = cardBody.querySelector('[data-back]');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      expandedIndex = null;
      cardBody.innerHTML = renderMultiMatchList(currentMatches);
      wireMultiMatchEvents(root);
    });
  }

  // Wire new events in expanded card
  wireEvents(root);
}

function wireMultiMatchEvents(root: ShadowRoot): void {
  root.querySelectorAll<HTMLElement>('[data-match-index]').forEach((row) => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.getAttribute('data-match-index') ?? '0', 10);
      renderMultiExpanded(root, idx);
    });
  });
}

// --- Public API ---

export function renderPanel(state: PanelState): void {
  const root = getShadowRoot();

  // Track matches for multi-expand
  if (state.status === 'match') {
    currentMatches = state.data.data.matches;
    expandedIndex = null;
  } else {
    currentMatches = [];
    expandedIndex = null;
  }

  root.innerHTML = `
    <style>${PANEL_CSS}</style>
    <div class="sr-panel" data-status="${state.status}">
      <div class="sr-topbar">
        <div class="sr-topbar-title">
          <span class="sr-teal-dot"></span>
          Swift Recruit
        </div>
        <div class="sr-topbar-actions">
          ${renderTopbarBadge(state)}
        </div>
      </div>
      ${renderStateBody(state)}
      ${renderResultMeta(state)}
    </div>
  `;

  wireEvents(root);
  wireMultiMatchEvents(root);
}

export function destroyPanel(): void {
  const host = document.getElementById(HOST_ID);
  if (host) {
    host.remove();
    shadowRoot = null;
  }
  currentMatches = [];
  expandedIndex = null;
}
