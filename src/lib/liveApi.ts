import type { LookupRequest, BackgroundResponse, MatchResponse } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/candidate-match`;
const TIMEOUT_MS = 10_000;

/**
 * Call the live candidate-match edge function.
 *
 * Returns BackgroundResponse. Special error strings:
 * - 'UNAUTHORIZED' → 401 from the API (caller should clear session)
 * - 'RATE_LIMITED'  → 429 (caller can retry with backoff)
 */
export async function liveCandidateMatch(
  payload: LookupRequest,
  accessToken: string,
): Promise<BackgroundResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (res.status === 401) {
      return { ok: false, error: 'UNAUTHORIZED' };
    }

    if (res.status === 429) {
      return { ok: false, error: 'RATE_LIMITED' };
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      let message = `API error ${res.status}`;
      try {
        const parsed = JSON.parse(body);
        if (parsed.error) message = parsed.error;
      } catch { /* use generic message */ }
      return { ok: false, error: message };
    }

    const data: MatchResponse = await res.json();
    return { ok: true, data };
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, error: 'Lookup timed out after 10s' };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
