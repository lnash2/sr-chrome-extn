import { mockCandidateMatch } from '@/lib/mockApi';
import type { LookupRequest, BackgroundResponse } from '@/lib/types';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[SR Extension] Background service worker installed');
});

async function handleLookup(payload: LookupRequest): Promise<BackgroundResponse> {
  const hasPhone = !!payload.phone;
  const hasEmail = !!payload.email;
  const hasNameAndPostcode = !!payload.name && !!payload.postcode;

  if (!hasPhone && !hasEmail && !hasNameAndPostcode) {
    return { ok: false, error: 'Insufficient identifiers: need phone, email, or name+postcode' };
  }

  if (USE_MOCK) {
    const data = await mockCandidateMatch(payload);
    return { ok: true, data };
  }

  // Phase 5: real edge function call will go here
  return { ok: false, error: 'Live API not yet implemented — set VITE_USE_MOCK=true' };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[SR Extension] ← received:', message);
  let responded = false;

  (async () => {
    try {
      let response: BackgroundResponse;

      if (message?.type === 'CANDIDATE_LOOKUP') {
        response = await handleLookup(message.payload);
      } else {
        response = { ok: false, error: `Unknown message type: ${message?.type}` };
      }

      console.log('[SR Extension] → responding:', response);
      sendResponse(response);
      responded = true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[SR Extension] Handler error:', error.message, error.stack);
      const fallback: BackgroundResponse = { ok: false, error: error.message };
      console.log('[SR Extension] → error response:', fallback);
      sendResponse(fallback);
      responded = true;
    } finally {
      if (!responded) {
        const fallback: BackgroundResponse = { ok: false, error: 'Handler completed without responding' };
        console.error('[SR Extension] → finally fallback (should not happen):', fallback);
        sendResponse(fallback);
      }
    }
  })();

  return true; // keep message channel open for async sendResponse
});
