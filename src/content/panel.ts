import type { BackgroundResponse } from '@/lib/types';
import type { CandidateMatch } from '@/lib/types';

// --- Panel state type (mirrors content/index.ts) ---

export type PanelState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'match'; data: BackgroundResponse & { ok: true } }
  | { status: 'no-match' }
  | { status: 'error'; error: string }
  | { status: 'logged-out' };

// --- Host element + shadow root ---

const HOST_ID = 'sr-panel-host';
let shadowRoot: ShadowRoot | null = null;

function getOrCreateHost(): HTMLElement {
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    // Position host off the normal flow — all visual styling lives inside shadow DOM
    host.style.cssText = 'all:initial; position:fixed; top:0; right:0; z-index:2147483647; pointer-events:none;';
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

// --- Styles ---

const PANEL_CSS = `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  color: #1a1a1a;
}

.sr-panel {
  position: fixed;
  top: 80px;
  right: 16px;
  width: 320px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.12);
  pointer-events: auto;
}

.sr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 10px 10px 0 0;
}

.sr-header-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.sr-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sr-badge--searching {
  background: #eff6ff;
  color: #2563eb;
}

.sr-badge--match {
  background: #f0fdf4;
  color: #16a34a;
}

.sr-badge--no-match {
  background: #fefce8;
  color: #a16207;
}

.sr-badge--error {
  background: #fef2f2;
  color: #dc2626;
}

.sr-body {
  padding: 14px;
}

.sr-status-msg {
  font-size: 12px;
  color: #64748b;
  text-align: center;
  padding: 18px 8px;
}

.sr-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: sr-spin 0.7s linear infinite;
  vertical-align: middle;
  margin-right: 6px;
}

@keyframes sr-spin {
  to { transform: rotate(360deg); }
}

/* --- Match card --- */

.sr-match-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}

.sr-match-card:last-child {
  margin-bottom: 0;
}

.sr-match-name {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.sr-match-conf {
  font-size: 10px;
  font-weight: 600;
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  margin-bottom: 8px;
  background: #eff6ff;
  color: #2563eb;
}

.sr-match-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
  color: #334155;
}

.sr-match-row .label {
  color: #64748b;
  font-weight: 500;
}

.sr-match-divider {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 8px 0;
}

.sr-warning {
  font-size: 11px;
  font-weight: 600;
  padding: 6px 8px;
  border-radius: 6px;
  margin-top: 8px;
}

.sr-warning--unsuitable {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.sr-warning--deletion {
  background: #fefce8;
  color: #a16207;
  border: 1px solid #fde68a;
}

.sr-licence-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.sr-licence-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  background: #f1f5f9;
  border-radius: 4px;
  color: #475569;
}

.sr-match-meta {
  font-size: 11px;
  color: #94a3b8;
  text-align: right;
  margin-top: 8px;
}
`;

// --- Renderers ---

function renderConfidence(conf: CandidateMatch['confidence']): string {
  const labels: Record<string, string> = {
    exact_phone: 'Phone match',
    exact_email: 'Email match',
    fuzzy_name_postcode: 'Fuzzy match',
    name_location: 'Name + location',
  };
  return labels[conf] ?? conf;
}

function renderLicences(cats: CandidateMatch['licence_categories']): string {
  if (cats.length === 0) return '<span class="sr-match-row"><span class="label">Licences</span><span>None on file</span></span>';
  const tags = cats
    .map((c) => `<span class="sr-licence-tag">${esc(c.category)}${c.expiry_date ? ` — ${esc(c.expiry_date)}` : ''}</span>`)
    .join('');
  return `<div class="sr-match-row"><span class="label">Licences</span></div><div class="sr-licence-list">${tags}</div>`;
}

function renderMatchCard(m: CandidateMatch): string {
  const warnings: string[] = [];
  if (m.marked_unsuitable) {
    warnings.push(`<div class="sr-warning sr-warning--unsuitable">Marked unsuitable${m.unsuitable_reason ? ': ' + esc(m.unsuitable_reason) : ''}</div>`);
  }
  if (m.marked_for_deletion) {
    warnings.push(`<div class="sr-warning sr-warning--deletion">Flagged for deletion</div>`);
  }

  return `
    <div class="sr-match-card" data-candidate-id="${m.candidate_id}">
      <div class="sr-match-name">${esc(m.name)}</div>
      <span class="sr-match-conf">${renderConfidence(m.confidence)}</span>
      <div class="sr-match-row"><span class="label">Status</span><span>${esc(m.active_status)}</span></div>
      <div class="sr-match-row"><span class="label">Recruiter</span><span>${esc(m.recruiter_name ?? '—')}</span></div>
      <div class="sr-match-row"><span class="label">Phone</span><span>${esc(m.phone_number)}</span></div>
      <div class="sr-match-row"><span class="label">Postcode</span><span>${esc(m.postcode ?? '—')}</span></div>
      <hr class="sr-match-divider" />
      ${renderLicences(m.licence_categories)}
      <div class="sr-match-row"><span class="label">Points</span><span>${m.licence_points}</span></div>
      <div class="sr-match-row"><span class="label">Last booking</span><span>${m.last_booking_date ? esc(m.last_booking_date.slice(0, 10)) : '—'}</span></div>
      ${warnings.join('')}
    </div>
  `;
}

function renderBody(state: PanelState): { badge: string; body: string } {
  switch (state.status) {
    case 'idle':
      return {
        badge: '',
        body: '<div class="sr-status-msg">No candidate detected on this page.</div>',
      };

    case 'searching':
      return {
        badge: '<span class="sr-badge sr-badge--searching">Searching</span>',
        body: '<div class="sr-status-msg"><span class="sr-spinner"></span> Looking up candidate…</div>',
      };

    case 'match': {
      const matches = state.data.data.matches;
      const count = matches.length;
      const cards = matches.map(renderMatchCard).join('');
      const meta = `<div class="sr-match-meta">${count} match${count !== 1 ? 'es' : ''} · ${state.data.data.metadata.duration_ms}ms</div>`;
      return {
        badge: `<span class="sr-badge sr-badge--match">${count} match${count !== 1 ? 'es' : ''}</span>`,
        body: cards + meta,
      };
    }

    case 'no-match':
      return {
        badge: '<span class="sr-badge sr-badge--no-match">No match</span>',
        body: '<div class="sr-status-msg">No matching candidate found in Swift Recruit.</div>',
      };

    case 'error':
      return {
        badge: '<span class="sr-badge sr-badge--error">Error</span>',
        body: `<div class="sr-status-msg" style="color:#dc2626">${esc(state.error)}</div>`,
      };

    case 'logged-out':
      return {
        badge: '',
        body: '<div class="sr-status-msg">Log in via the extension popup to start matching.</div>',
      };
  }
}

// --- Escape HTML ---

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Public API ---

export function renderPanel(state: PanelState): void {
  const root = getShadowRoot();
  const { badge, body } = renderBody(state);

  root.innerHTML = `
    <style>${PANEL_CSS}</style>
    <div class="sr-panel" data-status="${state.status}">
      <div class="sr-header">
        <span class="sr-header-title">Swift Recruit</span>
        ${badge}
      </div>
      <div class="sr-body">
        ${body}
      </div>
    </div>
  `;
}

export function destroyPanel(): void {
  const host = document.getElementById(HOST_ID);
  if (host) {
    host.remove();
    shadowRoot = null;
  }
}
