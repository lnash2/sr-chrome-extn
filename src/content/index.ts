import type { LookupRequest, BackgroundResponse, CreateRequest, CreateBackgroundResponse } from '@/lib/types';
import { scrapeCandidate, scrapeCvText, canTriggerLookup, isOnCandidatePage } from './scraper';
import type { ScrapeResult } from './selectors';
import { renderPanel, destroyPanel, setOnAddToCrm, setOnNoteSaved, setAddButtonState, type PanelState } from './panel';

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
    if (response.error === 'NOT_AUTHENTICATED') {
      setPanelState({ status: 'logged-out' });
    } else {
      setPanelState({ status: 'error', error: response.error });
    }
    return;
  }

  if (response.data.matches.length === 0) {
    setPanelState({ status: 'no-match', scraped: payload });
  } else {
    setPanelState({ status: 'match', data: response, scraped: payload });
  }
}

// --- Add to CRM ---

setOnAddToCrm(() => {
  const result = scrapeCandidate();
  const cvText = scrapeCvText();

  const payload: CreateRequest = {
    name: result.name ?? '',
    phone: result.phone,
    email: result.email,
    location: result.location,
    cv_text: cvText,
  };

  chrome.runtime.sendMessage(
    { type: 'CREATE_CANDIDATE', payload },
    (response: CreateBackgroundResponse | undefined) => {
      if (chrome.runtime.lastError) {
        setAddButtonState('error', chrome.runtime.lastError.message ?? 'Message error');
        return;
      }

      if (!response) {
        setAddButtonState('error', 'No response');
        return;
      }

      if (response.ok === false) {
        if (response.error === 'NOT_AUTHENTICATED') {
          setPanelState({ status: 'logged-out' });
          return;
        }

        // 409 duplicate — render existing matches
        if (response.error === 'duplicate' && response.duplicate?.existing) {
          setAddButtonState('error', 'Already in Swift Recruit');
          // Re-run lookup to show the existing match
          setTimeout(() => {
            lastLookupKey = ''; // force re-lookup
            onScan();
          }, 1500);
          return;
        }

        setAddButtonState('error', response.error);
        return;
      }

      // 201 success
      setAddButtonState('added');
      // Re-run lookup after brief delay so bar flips to confirmed match
      setTimeout(() => {
        lastLookupKey = ''; // force re-lookup
        onScan();
      }, 1500);
    },
  );
});

// --- Note saved → silent re-lookup ---

setOnNoteSaved(() => {
  setTimeout(() => {
    lastLookupKey = '';
    onScan();
  }, 1000);
});

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
