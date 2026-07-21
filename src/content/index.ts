import type { LookupRequest, BackgroundResponse } from '@/lib/types';

console.log('[SR Extension] Content script loaded on', window.location.href);

type PanelState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'match'; data: BackgroundResponse & { ok: true } }
  | { status: 'no-match' }
  | { status: 'error'; error: string }
  | { status: 'logged-out' };

let currentState: PanelState = { status: 'idle' };

function setPanelState(state: PanelState) {
  currentState = state;
  console.log('[SR Extension] Panel state →', state.status, state);
  // Phase 4: panel UI will subscribe to state changes here
}

export function getPanelState(): PanelState {
  return currentState;
}

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

export async function performLookup(payload: LookupRequest): Promise<void> {
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
