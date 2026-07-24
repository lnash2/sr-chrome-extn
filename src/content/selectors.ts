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

export interface SiteProfile {
  id: 'indeed' | 'empower';
  /** Is this a page we should scrape? */
  isOnPage: () => boolean;
  /** Root element to scope scraping (or document.body) */
  getContainer: () => Element | null;
  name: Strategy[];
  email: Strategy[];
  phone: Strategy[];
  location: Strategy[];
  cvSnippet: Strategy[];
}

// ---------------------------------------------------------------------------
// Shared regex patterns
// ---------------------------------------------------------------------------

const UK_PHONE_RE = /(?:\+44\s?|0)(?:\d[\s\-]?){9,10}\d(?!\d)/;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}(?=[^a-zA-Z]|[A-Z]|$)/;
const UK_POSTCODE_RE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function textOf(el: Element | null): string | null {
  const t = el?.textContent?.trim();
  return t && t.length > 0 ? t : null;
}

function firstRegexMatch(container: Element, re: RegExp): string | null {
  const text = container.textContent ?? '';
  const m = text.match(re);
  return m ? m[0].trim() : null;
}

// ---------------------------------------------------------------------------
// Indeed profile (unchanged)
// ---------------------------------------------------------------------------

export const indeedProfile: SiteProfile = {
  id: 'indeed',

  isOnPage: () => document.querySelector('[data-testid="candidate-review-page"]') !== null,

  getContainer: () => document.querySelector('#candidateProfileContainer'),

  name: [
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
  ],

  location: [
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
  ],

  email: [
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
  ],

  phone: [
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
  ],

  cvSnippet: [
    {
      label: 'resume/CV section text',
      extract: (c) => {
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
  ],
};

// ---------------------------------------------------------------------------
// Empower (Ringover) profile — phone-only
// ---------------------------------------------------------------------------

// Real Empower DOM (from empower.ringover.com/logs/ringover/{id}):
//
//   div.module_logs[data-tab="studio"]         ← call-detail container
//     div.header
//       ...
//     div                                       ← body area
//       div.contactInfo                         ← Contact block
//         div.contactName  →  "07941 816663"    ← THE phone we want
//       div.agentInfo                           ← Agent block (EXCLUDE)
//         agent name, phone, @swift-recruit email
//
// The SPA also renders a log-list/side-rail with OTHER calls' numbers.
// We must NEVER fall back to a page-wide regex — only extract from
// inside the studio container's contactInfo.

const EMPOWER_STUDIO_SELECTOR = '.module_logs[data-tab="studio"]';

export const empowerProfile: SiteProfile = {
  id: 'empower',

  isOnPage: () => window.location.pathname.startsWith('/logs/'),

  // Scope to the studio call-detail panel — never document.body
  getContainer: () => document.querySelector(EMPOWER_STUDIO_SELECTOR),

  name: [], // no name scraping on Empower

  email: [], // no email scraping on Empower

  phone: [
    {
      // Primary: div.contactName inside div.contactInfo (not inside agentInfo)
      label: 'empower contactName element',
      extract: (studio) => {
        const contactInfo = studio.querySelector('.contactInfo');
        if (!contactInfo) return null;
        const contactName = contactInfo.querySelector('.contactName');
        return contactName ? (contactName.textContent?.trim() || null) : null;
      },
    },
    {
      // Fallback: tel: links inside contactInfo only
      label: 'empower contactInfo tel: link',
      extract: (studio) => {
        const contactInfo = studio.querySelector('.contactInfo');
        if (!contactInfo) return null;
        const a = contactInfo.querySelector('a[href^="tel:"]');
        if (!a) return null;
        const href = a.getAttribute('href') ?? '';
        return href.replace(/^tel:/i, '').trim() || null;
      },
    },
    {
      // Last resort: UK phone regex scoped to contactInfo ONLY — never page-wide
      label: 'empower contactInfo phone regex',
      extract: (studio) => {
        const contactInfo = studio.querySelector('.contactInfo');
        if (!contactInfo) return null;
        return firstRegexMatch(contactInfo, UK_PHONE_RE);
      },
    },
    // NO page-wide fallback — on Empower the SPA DOM contains dozens of
    // other calls' numbers in the log list, so page-wide regex is harmful.
  ],

  location: [], // no location scraping on Empower

  cvSnippet: [], // no CV on Empower
};

// ---------------------------------------------------------------------------
// Site detection
// ---------------------------------------------------------------------------

export function detectSiteProfile(): SiteProfile | null {
  const host = window.location.hostname;
  if (host.includes('indeed.com')) return indeedProfile;
  if (host.includes('ringover.com')) return empowerProfile;
  return null;
}

// ---------------------------------------------------------------------------
// Strategy runner (unchanged)
// ---------------------------------------------------------------------------

export function runStrategies(container: Element, strategies: Strategy[]): string | null {
  for (const s of strategies) {
    const result = s.extract(container);
    if (result) return result;
  }
  return null;
}
