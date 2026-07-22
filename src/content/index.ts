import type { LookupRequest, BackgroundResponse } from '@/lib/types';
import { scrapeCandidate, canTriggerLookup, isOnCandidatePage } from './scraper';
import type { ScrapeResult } from './selectors';
import { renderPanel, type PanelState } from './panel';

console.log('[SR Extension] Content script loaded on', window.location.href);

// --- Panel state ---

let currentState: PanelState = { status: 'idle' };

function setPanelState(state: PanelState) {
  currentState = state;
  console.log('[SR Extension] Panel state →', state.status, state);
  renderPanel(state);
}

export function getPanelState(): PanelState {
  return currentState;
}

// --- Lookup messaging ---

const LOOKUP_TIMEOUT_MS = 10_000;

function sendLookup(payload: LookupRequest): Promise<BackgroundResponse> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ ok: false, error: 'Lookup timed out — background service worker may have terminated' });
    }, LOOKUP_TIMEOUT_MS);

    try {
      chrome.runtime.sendMessage(
        { type: 'CANDIDATE_LOOKUP', payload },
        (response: BackgroundResponse | undefined) => {
          clearTimeout(timer);

          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message ?? 'Message channel error' });
            return;
          }

          if (!response) {
            resolve({ ok: false, error: 'Empty response from background worker' });
            return;
          }

          resolve(response);
        },
      );
    } catch (err) {
      clearTimeout(timer);
      resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
}

async function performLookup(payload: LookupRequest): Promise<void> {
  setPanelState({ status: 'searching' });

  const response = await sendLookup(payload);

  if (!response.ok) {
    setPanelState({ status: 'error', error: response.error });
    return;
  }

  if (response.data.matches.length === 0) {
    setPanelState({ status: 'no-match' });
  } else {
    setPanelState({ status: 'match', data: response });
  }
}

// --- Scan orchestration ---

let lastLookupKey = '';

function lookupKeyFor(r: ScrapeResult): string {
  return JSON.stringify([r.phone, r.email, r.name, r.location]);
}

function onScan() {
  const result = scrapeCandidate();
  console.log('[SR Extension] Scrape result:', result);

  if (!canTriggerLookup(result)) {
    setPanelState({ status: 'idle' });
    return;
  }

  const key = lookupKeyFor(result);
  if (key === lastLookupKey && currentState.status !== 'error') return;
  lastLookupKey = key;

  performLookup({
    phone: result.phone,
    email: result.email,
    name: result.name,
    location: result.location,
  });
}

// --- Initial scan + MutationObserver ---

if (isOnCandidatePage()) {
  onScan();
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const observer = new MutationObserver(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (isOnCandidatePage()) {
      onScan();
    } else {
      lastLookupKey = '';
      setPanelState({ status: 'idle' });
    }
  }, 500);
});

observer.observe(document.body, { childList: true, subtree: true });
