import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scrapeCandidate, canTriggerLookup, isOnCandidatePage } from '../scraper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INDEED_FIXTURE = readFileSync(resolve(__dirname, '../../../fixtures/indeed-profile.html'), 'utf-8');
const EMPOWER_FIXTURE = readFileSync(resolve(__dirname, '../../../fixtures/empower-call-detail.html'), 'utf-8');

function setHostname(host: string) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, hostname: host, pathname: host.includes('ringover') ? '/logs/12345' : '/' },
    writable: true,
    configurable: true,
  });
}

function loadIndeedFixture() {
  setHostname('employers.indeed.com');
  document.documentElement.innerHTML = INDEED_FIXTURE;
}

function loadEmpowerFixture() {
  setHostname('empower.ringover.com');
  document.documentElement.innerHTML = EMPOWER_FIXTURE;
}

function clearDom() {
  document.documentElement.innerHTML = '<html><head></head><body></body></html>';
}

// ===========================================================================
// Indeed profile tests (full existing suite)
// ===========================================================================

describe('isOnCandidatePage — Indeed', () => {
  beforeEach(clearDom);

  it('returns true when candidate-review-page testid is present', () => {
    loadIndeedFixture();
    expect(isOnCandidatePage()).toBe(true);
  });

  it('returns false on a non-candidate page', () => {
    setHostname('employers.indeed.com');
    expect(isOnCandidatePage()).toBe(false);
  });
});

describe('scrapeCandidate — Indeed', () => {
  beforeEach(loadIndeedFixture);

  it('extracts name from data-testid name plate', () => {
    expect(scrapeCandidate().name).toBe('James Whitfield');
  });

  it('extracts location', () => {
    expect(scrapeCandidate().location).toBe('Saffron Walden');
  });

  it('extracts email', () => {
    expect(scrapeCandidate().email).toBe('james.whitfield@email.com');
  });

  it('extracts phone', () => {
    expect(scrapeCandidate().phone).toBe('07712 345678');
  });

  it('extracts CV snippet', () => {
    const r = scrapeCandidate();
    expect(r.cvSnippet).toBeTruthy();
    expect(r.cvSnippet!).toContain('HGV driver');
  });

  it('does NOT pick up sidebar names', () => {
    const r = scrapeCandidate();
    expect(r.name).not.toBe('Sarah Williams');
    expect(r.name).toBe('James Whitfield');
  });

  it('returns nulls when container missing', () => {
    document.querySelector('#candidateProfileContainer')?.remove();
    expect(scrapeCandidate()).toEqual({ name: null, email: null, phone: null, location: null, cvSnippet: null });
  });
});

describe('scrapeCandidate — Indeed fallbacks', () => {
  beforeEach(() => { clearDom(); setHostname('employers.indeed.com'); });

  it('mailto href', () => {
    document.body.innerHTML = `<div data-testid="candidate-review-page"><div id="candidateProfileContainer"><a href="mailto:test@example.com">Contact</a></div></div>`;
    expect(scrapeCandidate().email).toBe('test@example.com');
  });

  it('tel href', () => {
    document.body.innerHTML = `<div data-testid="candidate-review-page"><div id="candidateProfileContainer"><a href="tel:+447999888777">Call</a></div></div>`;
    expect(scrapeCandidate().phone).toBe('+447999888777');
  });

  it('UK postcode regex', () => {
    document.body.innerHTML = `<div data-testid="candidate-review-page"><div id="candidateProfileContainer"><p>Lives near SW1A 2AA</p></div></div>`;
    expect(scrapeCandidate().location).toBe('SW1A 2AA');
  });
});

describe('scrapeCandidate — abutting text', () => {
  beforeEach(() => { clearDom(); setHostname('employers.indeed.com'); });

  it('.co.ukPersonal → .co.uk', () => {
    document.body.innerHTML = `<div data-testid="candidate-review-page"><div id="candidateProfileContainer"><div data-testid="applicationTabContent">saidhaval@hotmail.co.ukPersonal Profile</div></div></div>`;
    expect(scrapeCandidate().email).toBe('saidhaval@hotmail.co.uk');
  });

  it('.comExperience → .com', () => {
    document.body.innerHTML = `<div data-testid="candidate-review-page"><div id="candidateProfileContainer"><div data-testid="applicationTabContent">x@y.comExperience</div></div></div>`;
    expect(scrapeCandidate().email).toBe('x@y.com');
  });

  it('phone regex: valid UK mobile', () => {
    document.body.innerHTML = `<div data-testid="candidate-review-page"><div id="candidateProfileContainer"><div data-testid="applicationTabContent">Call me on 07999 888777 anytime</div></div></div>`;
    expect(scrapeCandidate().phone).toBe('07999 888777');
  });
});

// ===========================================================================
// Empower profile tests
// ===========================================================================

describe('isOnCandidatePage — Empower', () => {
  beforeEach(clearDom);

  it('returns true on /logs/ path', () => {
    loadEmpowerFixture();
    expect(isOnCandidatePage()).toBe(true);
  });

  it('returns false on non-/logs/ path', () => {
    setHostname('empower.ringover.com');
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hostname: 'empower.ringover.com', pathname: '/dashboard' },
      writable: true, configurable: true,
    });
    expect(isOnCandidatePage()).toBe(false);
  });
});

describe('scrapeCandidate — Empower', () => {
  beforeEach(loadEmpowerFixture);

  it('extracts contact phone from .contactName inside studio container', () => {
    const r = scrapeCandidate();
    expect(r.phone).toBe('07941 816663');
  });

  it('does NOT extract agent phone (07537 158191)', () => {
    const r = scrapeCandidate();
    expect(r.phone).not.toContain('07537');
    expect(r.phone).not.toContain('158191');
  });

  it('does NOT extract decoy phone from log list (01387 272143)', () => {
    const r = scrapeCandidate();
    expect(r.phone).not.toContain('01387');
    expect(r.phone).not.toContain('272143');
  });

  it('does NOT extract second decoy (07700 900555)', () => {
    const r = scrapeCandidate();
    expect(r.phone).not.toContain('07700');
    expect(r.phone).not.toContain('900555');
  });

  it('returns null for name (phone-only site)', () => {
    expect(scrapeCandidate().name).toBeNull();
  });

  it('returns null for email', () => {
    expect(scrapeCandidate().email).toBeNull();
  });

  it('returns null for location', () => {
    expect(scrapeCandidate().location).toBeNull();
  });

  it('returns null for cvSnippet', () => {
    expect(scrapeCandidate().cvSnippet).toBeNull();
  });

  it('phone-only trigger fires', () => {
    expect(canTriggerLookup(scrapeCandidate())).toBe(true);
  });

  it('returns null phone when studio container missing (idle)', () => {
    document.querySelector('.module_logs')?.remove();
    // Re-detect — isOnCandidatePage still true (path /logs/) but container gone
    isOnCandidatePage();
    expect(scrapeCandidate().phone).toBeNull();
  });
});

// ===========================================================================
// Unknown host → idle
// ===========================================================================

describe('isOnCandidatePage — unknown host', () => {
  beforeEach(clearDom);

  it('returns false for unknown hostname', () => {
    setHostname('www.example.com');
    expect(isOnCandidatePage()).toBe(false);
  });
});

// ===========================================================================
// canTriggerLookup (shared)
// ===========================================================================

describe('canTriggerLookup', () => {
  it('phone alone', () => expect(canTriggerLookup({ name: null, email: null, phone: '07712345678', location: null, cvSnippet: null })).toBe(true));
  it('email alone', () => expect(canTriggerLookup({ name: null, email: 'a@b.com', phone: null, location: null, cvSnippet: null })).toBe(true));
  it('name + location', () => expect(canTriggerLookup({ name: 'J', email: null, phone: null, location: 'X', cvSnippet: null })).toBe(true));
  it('name alone — no', () => expect(canTriggerLookup({ name: 'J', email: null, phone: null, location: null, cvSnippet: null })).toBe(false));
  it('all null — no', () => expect(canTriggerLookup({ name: null, email: null, phone: null, location: null, cvSnippet: null })).toBe(false));
});
