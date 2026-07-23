import {
  type ScrapeResult,
  type SiteProfile,
  runStrategies,
  detectSiteProfile,
} from './selectors';

let activeProfile: SiteProfile | null = null;

export function getActiveProfile(): SiteProfile | null {
  return activeProfile;
}

export function isOnCandidatePage(): boolean {
  activeProfile = detectSiteProfile();
  if (!activeProfile) return false;
  return activeProfile.isOnPage();
}

export function scrapeCandidate(): ScrapeResult {
  if (!activeProfile) {
    return { name: null, email: null, phone: null, location: null, cvSnippet: null };
  }

  const container = activeProfile.getContainer();
  if (!container) {
    return { name: null, email: null, phone: null, location: null, cvSnippet: null };
  }

  return {
    name: runStrategies(container, activeProfile.name),
    email: runStrategies(container, activeProfile.email),
    phone: runStrategies(container, activeProfile.phone),
    location: runStrategies(container, activeProfile.location),
    cvSnippet: runStrategies(container, activeProfile.cvSnippet),
  };
}

const CV_MAX_CHARS = 20_000;

export function scrapeCvText(): string | null {
  // Only Indeed has CV text
  if (!activeProfile || activeProfile.id !== 'indeed') return null;

  const container = activeProfile.getContainer();
  if (!container) return null;

  const section =
    container.querySelector('[data-testid*="resume" i]') ??
    container.querySelector('[data-testid*="cv" i]') ??
    container.querySelector('[aria-label*="resume" i]') ??
    container.querySelector('.resume-text, .cv-text');

  if (!section) return null;
  const text = section.textContent?.trim();
  if (!text || text.length < 20) return null;
  return text.slice(0, CV_MAX_CHARS);
}

export function canTriggerLookup(result: ScrapeResult): boolean {
  if (result.phone) return true;
  if (result.email) return true;
  if (result.name && result.location) return true;
  return false;
}
