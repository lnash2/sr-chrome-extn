import { supabase } from '@/lib/supabaseClient';
import { mockCandidateMatch } from '@/lib/mockApi';
import { liveCandidateMatch } from '@/lib/liveApi';
import type { LookupRequest, BackgroundResponse } from '@/lib/types';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

/** Current access token — kept in sync by onAuthStateChange */
let accessToken: string | null = null;

async function initSession(): Promise<void> {
  // Restore persisted session from chrome.storage.local
  const { data: { session } } = await supabase.auth.getSession();
  accessToken = session?.access_token ?? null;
  console.log('[SR Extension] Session restored:', accessToken ? 'authenticated' : 'no session');
}

// Listen for auth changes (login, logout, token refresh)
supabase.auth.onAuthStateChange((_event, session) => {
  accessToken = session?.access_token ?? null;
  console.log('[SR Extension] Auth state changed:', _event, accessToken ? 'has token' : 'no token');
});

// ---------------------------------------------------------------------------
// Lookup handler
// ---------------------------------------------------------------------------

async function handleLookup(payload: LookupRequest): Promise<BackgroundResponse> {
  const hasPhone = !!payload.phone;
  const hasEmail = !!payload.email;
  const hasNameAndLocation = !!payload.name && !!payload.location;

  if (!hasPhone && !hasEmail && !hasNameAndLocation) {
    return { ok: false, error: 'Insufficient identifiers: need phone, email, or name+location' };
  }

  if (USE_MOCK) {
    const data = await mockCandidateMatch(payload);
    return { ok: true, data };
  }

  // Live path
  if (!accessToken) {
    return { ok: false, error: 'NOT_AUTHENTICATED' };
  }

  const result = await liveCandidateMatch(payload, accessToken);

  // 401 → clear session so content script shows logged-out bar
  if (!result.ok && result.error === 'UNAUTHORIZED') {
    await supabase.auth.signOut();
    accessToken = null;
    return { ok: false, error: 'NOT_AUTHENTICATED' };
  }

  return result;
}

// ---------------------------------------------------------------------------
// Message listener
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  console.log('[SR Extension] Background service worker installed');
});

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

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

initSession();
