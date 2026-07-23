import {
  type ScrapeResult,
  runStrategies,
  NAME_STRATEGIES,
  LOCATION_STRATEGIES,
  EMAIL_STRATEGIES,
  PHONE_STRATEGIES,
  CV_SNIPPET_STRATEGIES,
} from './selectors';

const CONTAINER_SELECTOR = '#candidateProfileContainer';
const PAGE_DETECTOR = '[data-testid="candidate-review-page"]';

export function isOnCandidatePage(): boolean {
  return document.querySelector(PAGE_DETECTOR) !== null;
}

export function scrapeCandidate(): ScrapeResult {
  const container = document.querySelector(CONTAINER_SELECTOR);
  if (!container) {
    return { name: null, email: null, phone: null, location: null, cvSnippet: null };
  }

  return {
    name: runStrategies(container, NAME_STRATEGIES),
    email: runStrategies(container, EMAIL_STRATEGIES),
    phone: runStrategies(container, PHONE_STRATEGIES),
    location: runStrategies(container, LOCATION_STRATEGIES),
    cvSnippet: runStrategies(container, CV_SNIPPET_STRATEGIES),
  };
}

const CV_MAX_CHARS = 20_000;

export function scrapeCvText(): string | null {
  const container = document.querySelector('#candidateProfileContainer');
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
