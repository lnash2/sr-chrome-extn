import { supabase } from '@/lib/supabaseClient';

const PORTAL_ORIGIN = 'https://portal.swift-recruit.co.uk';

const nameEl = document.getElementById('candidate-name')!;
const fallbackEl = document.getElementById('fallback')!;
const frameEl = document.getElementById('softphone-frame') as HTMLIFrameElement;

async function sendSessionToIframe(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !frameEl.contentWindow) return;
  frameEl.contentWindow.postMessage(
    { type: 'SR_SESSION', access_token: session.access_token, refresh_token: session.refresh_token },
    PORTAL_ORIGIN,
  );
}

function loadCandidate(candidateId: number, name: string): void {
  nameEl.textContent = name ? `— ${name}` : '';

  const src = `${PORTAL_ORIGIN}/embedded/softphone?candidate=${candidateId}`;

  // Reset: iframe hidden, fallback visible until load succeeds
  frameEl.hidden = true;
  fallbackEl.hidden = false;

  frameEl.onload = () => {
    // Cross-origin iframes still fire load on successful navigation
    frameEl.hidden = false;
    fallbackEl.hidden = true;
    sendSessionToIframe();
  };

  frameEl.onerror = () => {
    frameEl.hidden = true;
    fallbackEl.hidden = false;
  };

  frameEl.src = src;
}

// Listen for candidate updates from the background worker
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'SIDEPANEL_SET_CANDIDATE') {
    const { candidate_id, name } = message.payload;
    loadCandidate(candidate_id, name);
  }
});
