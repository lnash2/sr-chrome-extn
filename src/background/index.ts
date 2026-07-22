import { supabase } from '@/lib/supabaseClient';
import { mockCandidateMatch } from '@/lib/mockApi';
import { liveCandidateMatch } from '@/lib/liveApi';
import type { LookupRequest, BackgroundResponse } from '@/lib/types';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

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

  // Live path — read session fresh from chrome.storage via Supabase client
  const { data: { session } } = await supabase.auth.getSession();
  console.log('[SR Extension] Lookup session check:', session ? `authenticated (${session.user.email})` : 'no session');

  if (!session) {
    return { ok: false, error: 'NOT_AUTHENTICATED' };
  }

  const result = await liveCandidateMatch(payload, session.access_token);

  // Log raw response shape for diagnosis (open_tasks, recent_notes, etc.)
  if (result.ok) {
    const m0 = result.data.matches[0];
    if (m0) {
      console.log('[SR Extension] Raw match fields:', {
        open_tasks: m0.open_tasks,
        recent_notes_length: Array.isArray(m0.recent_notes) ? m0.recent_notes.length : m0.recent_notes,
        recent_notes: m0.recent_notes,
        next_booking: m0.next_booking,
        recent_booking_count_90d: m0.recent_booking_count_90d,
      });
    }
  }

  // 401 → clear session so content script shows logged-out bar
  if (!result.ok && result.error === 'UNAUTHORIZED') {
    await supabase.auth.signOut();
    return { ok: false, error: 'NOT_AUTHENTICATED' };
  }

  return result;
}

// ---------------------------------------------------------------------------
// Call handler
// ---------------------------------------------------------------------------

async function handleInitiateCall(payload: { candidate_id: number; phone: string }): Promise<BackgroundResponse> {
  if (USE_MOCK) {
    return { ok: false, error: 'Call service not yet available (mock mode)' };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { ok: false, error: 'NOT_AUTHENTICATED' };
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initiate-call`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 404) {
      return { ok: false, error: 'Call service not yet available (404)' };
    }
    if (res.status === 401) {
      await supabase.auth.signOut();
      return { ok: false, error: 'NOT_AUTHENTICATED' };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      let message = `Call failed (${res.status})`;
      try { const p = JSON.parse(body); if (p.error) message = p.error; } catch { /* use generic */ }
      return { ok: false, error: message };
    }

    return { ok: true, data: { matches: [], metadata: { duration_ms: 0 } } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
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
      } else if (message?.type === 'INITIATE_CALL') {
        response = await handleInitiateCall(message.payload);
      } else if (message?.type === 'OPEN_SOFTPHONE') {
        try {
          if (_sender.tab?.id) {
            await chrome.sidePanel.open({ tabId: _sender.tab.id });
            // Small delay so the panel page loads before receiving the message
            setTimeout(() => {
              chrome.runtime.sendMessage({
                type: 'SIDEPANEL_SET_CANDIDATE',
                payload: message.payload,
              });
            }, 300);
          }
          response = { ok: true, data: { matches: [], metadata: { duration_ms: 0 } } };
        } catch (err) {
          response = { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
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
