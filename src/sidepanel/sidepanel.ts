const nameEl = document.getElementById('candidate-name')!;
const fallbackEl = document.getElementById('fallback')!;
const frameEl = document.getElementById('softphone-frame') as HTMLIFrameElement;

// Listen for candidate updates from the background/content script
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'SIDEPANEL_SET_CANDIDATE') {
    const { candidate_id, name } = message.payload;
    nameEl.textContent = name ? `— ${name}` : '';

    const src = `https://portal.swift-recruit.co.uk/embedded/softphone?candidate=${candidate_id}`;
    frameEl.src = src;
    frameEl.hidden = false;
    fallbackEl.hidden = true;

    // If iframe fails to load, show fallback
    frameEl.onerror = () => {
      frameEl.hidden = true;
      fallbackEl.hidden = false;
    };
  }
});
