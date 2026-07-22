export interface ScrapeResult {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  cvSnippet: string | null;
}

interface Strategy {
  label: string;
  extract: (container: Element) => string | null;
}

// --- Regex patterns (used as fallbacks) ---

const UK_PHONE_RE = /(?:\+44\s?|0)(?:\d[\s\-]?){9,10}\d(?!\d)/;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}(?=[^a-zA-Z]|[A-Z]|$)/;
const UK_POSTCODE_RE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;

// --- Helpers ---

function textOf(el: Element | null): string | null {
  const t = el?.textContent?.trim();
  return t && t.length > 0 ? t : null;
}

function firstRegexMatch(container: Element, re: RegExp): string | null {
  const text = container.textContent ?? '';
  const m = text.match(re);
  return m ? m[0].trim() : null;
}

// --- Strategy definitions per field ---

export const NAME_STRATEGIES: Strategy[] = [
  {
    label: 'data-testid name-plate-name-item h3',
    extract: (c) => textOf(c.querySelector('[data-testid="name-plate-name-item"] h3')),
  },
  {
    label: 'aria-label candidate name',
    extract: (c) => textOf(c.querySelector('[aria-label*="andidate name" i]')),
  },
  {
    label: 'label-text anchored "Name"',
    extract: (c) => {
      for (const label of c.querySelectorAll('label, dt, th, strong')) {
        if (/^\s*name\s*:?\s*$/i.test(label.textContent ?? '')) {
          const sibling = label.nextElementSibling;
          const val = textOf(sibling);
          if (val && val.length < 80 && /\s/.test(val)) return val;
        }
      }
      return null;
    },
  },
];

export const LOCATION_STRATEGIES: Strategy[] = [
  {
    label: 'data-testid namePlateBottomLine',
    extract: (c) => textOf(c.querySelector('[data-testid="namePlateBottomLine"]')),
  },
  {
    label: 'aria-label location',
    extract: (c) => textOf(c.querySelector('[aria-label*="ocation" i]')),
  },
  {
    label: 'UK postcode regex',
    extract: (c) => firstRegexMatch(c, UK_POSTCODE_RE),
  },
];

export const EMAIL_STRATEGIES: Strategy[] = [
  {
    label: 'mailto: href',
    extract: (c) => {
      const a = c.querySelector('a[href^="mailto:"]');
      if (!a) return null;
      const href = a.getAttribute('href') ?? '';
      return href.replace(/^mailto:/i, '').split('?')[0].trim() || null;
    },
  },
  {
    label: 'application tab email regex',
    extract: (c) => {
      const tab = c.querySelector('[data-testid="applicationTabContent"]');
      return tab ? firstRegexMatch(tab, EMAIL_RE) : null;
    },
  },
  {
    label: 'CV/resume section email regex',
    extract: (c) => {
      const section =
        c.querySelector('[data-testid*="resume" i]') ??
        c.querySelector('[data-testid*="cv" i]') ??
        c.querySelector('.resume-text, .cv-text');
      return section ? firstRegexMatch(section, EMAIL_RE) : null;
    },
  },
  {
    label: 'full container email regex',
    extract: (c) => firstRegexMatch(c, EMAIL_RE),
  },
];

export const PHONE_STRATEGIES: Strategy[] = [
  {
    label: 'tel: href',
    extract: (c) => {
      const a = c.querySelector('a[href^="tel:"]');
      if (!a) return null;
      const href = a.getAttribute('href') ?? '';
      return href.replace(/^tel:/i, '').trim() || null;
    },
  },
  {
    label: 'application tab UK phone regex',
    extract: (c) => {
      const tab = c.querySelector('[data-testid="applicationTabContent"]');
      return tab ? firstRegexMatch(tab, UK_PHONE_RE) : null;
    },
  },
  {
    label: 'CV/resume section UK phone regex',
    extract: (c) => {
      const section =
        c.querySelector('[data-testid*="resume" i]') ??
        c.querySelector('[data-testid*="cv" i]') ??
        c.querySelector('.resume-text, .cv-text');
      return section ? firstRegexMatch(section, UK_PHONE_RE) : null;
    },
  },
  {
    label: 'full container UK phone regex',
    extract: (c) => firstRegexMatch(c, UK_PHONE_RE),
  },
];

export const CV_SNIPPET_STRATEGIES: Strategy[] = [
  {
    label: 'resume/CV section text',
    extract: (c) => {
      // Look for a resume or CV section by common selectors
      const section =
        c.querySelector('[data-testid*="resume" i]') ??
        c.querySelector('[data-testid*="cv" i]') ??
        c.querySelector('[aria-label*="resume" i]') ??
        c.querySelector('.resume-text, .cv-text');
      if (section) {
        const text = section.textContent?.trim();
        if (text && text.length > 20) return text.slice(0, 500);
      }
      return null;
    },
  },
];

// --- Runner ---

export function runStrategies(container: Element, strategies: Strategy[]): string | null {
  for (const s of strategies) {
    const result = s.extract(container);
    if (result) return result;
  }
  return null;
}
