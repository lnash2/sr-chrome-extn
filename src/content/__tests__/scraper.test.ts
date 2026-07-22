import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach } from 'vitest';
import { scrapeCandidate, canTriggerLookup, isOnCandidatePage } from '../scraper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_PATH = resolve(__dirname, '../../../fixtures/indeed-profile.html');
const fixtureHtml = readFileSync(FIXTURE_PATH, 'utf-8');

function loadFixture() {
  document.documentElement.innerHTML = fixtureHtml;
}

function clearDom() {
  document.documentElement.innerHTML = '<html><head></head><body></body></html>';
}

describe('isOnCandidatePage', () => {
  beforeEach(clearDom);

  it('returns true when candidate-review-page testid is present', () => {
    loadFixture();
    expect(isOnCandidatePage()).toBe(true);
  });

  it('returns false on a non-candidate page', () => {
    expect(isOnCandidatePage()).toBe(false);
  });
});

describe('scrapeCandidate', () => {
  beforeEach(loadFixture);

  it('extracts name from data-testid name plate', () => {
    const result = scrapeCandidate();
    expect(result.name).toBe('James Whitfield');
  });

  it('extracts location from data-testid namePlateBottomLine', () => {
    const result = scrapeCandidate();
    expect(result.location).toBe('Saffron Walden');
  });

  it('extracts email from application tab via regex', () => {
    const result = scrapeCandidate();
    expect(result.email).toBe('james.whitfield@email.com');
  });

  it('extracts phone from application tab via regex', () => {
    const result = scrapeCandidate();
    expect(result.phone).toBe('07712 345678');
  });

  it('extracts CV snippet from resume section', () => {
    const result = scrapeCandidate();
    expect(result.cvSnippet).toBeTruthy();
    expect(result.cvSnippet!).toContain('HGV driver');
  });

  it('does NOT pick up sidebar candidate names', () => {
    const result = scrapeCandidate();
    expect(result.name).not.toBe('Sarah Williams');
    expect(result.name).not.toBe('Michael Brown');
    expect(result.name).not.toBe('Priya Patel');
    expect(result.name).toBe('James Whitfield');
  });

  it('returns all nulls when container is missing', () => {
    document.querySelector('#candidateProfileContainer')?.remove();
    const result = scrapeCandidate();
    expect(result).toEqual({
      name: null,
      email: null,
      phone: null,
      location: null,
      cvSnippet: null,
    });
  });
});

describe('scrapeCandidate — fallback strategies', () => {
  beforeEach(clearDom);

  it('falls back to mailto: href for email', () => {
    document.body.innerHTML = `
      <div data-testid="candidate-review-page">
        <div id="candidateProfileContainer">
          <a href="mailto:test@example.com">Contact</a>
        </div>
      </div>
    `;
    const result = scrapeCandidate();
    expect(result.email).toBe('test@example.com');
  });

  it('falls back to tel: href for phone', () => {
    document.body.innerHTML = `
      <div data-testid="candidate-review-page">
        <div id="candidateProfileContainer">
          <a href="tel:+447999888777">Call</a>
        </div>
      </div>
    `;
    const result = scrapeCandidate();
    expect(result.phone).toBe('+447999888777');
  });

  it('falls back to UK postcode regex for location', () => {
    document.body.innerHTML = `
      <div data-testid="candidate-review-page">
        <div id="candidateProfileContainer">
          <p>Lives near SW1A 2AA</p>
        </div>
      </div>
    `;
    const result = scrapeCandidate();
    expect(result.location).toBe('SW1A 2AA');
  });

  it('extracts email from CV/resume section when no app tab or mailto', () => {
    document.body.innerHTML = `
      <div data-testid="candidate-review-page">
        <div id="candidateProfileContainer">
          <div data-testid="resumeSection">
            Contact me at driver.dave@gmail.com for references.
          </div>
        </div>
      </div>
    `;
    const result = scrapeCandidate();
    expect(result.email).toBe('driver.dave@gmail.com');
  });

  it('extracts phone from CV/resume section when no app tab or tel', () => {
    document.body.innerHTML = `
      <div data-testid="candidate-review-page">
        <div id="candidateProfileContainer">
          <div data-testid="resumeSection">
            Available on 07999 123456 for immediate start.
          </div>
        </div>
      </div>
    `;
    const result = scrapeCandidate();
    expect(result.phone).toBe('07999 123456');
  });

  it('falls back to full container regex when no app tab or CV section', () => {
    document.body.innerHTML = `
      <div data-testid="candidate-review-page">
        <div id="candidateProfileContainer">
          <p>Reach me at loose.email@example.org or call 07111 222333</p>
        </div>
      </div>
    `;
    const result = scrapeCandidate();
    expect(result.email).toBe('loose.email@example.org');
    expect(result.phone).toBe('07111 222333');
  });
});

describe('scrapeCandidate — abutting text boundary handling', () => {
  beforeEach(clearDom);

  it('trims email when TLD abuts section heading: .co.ukPersonal → .co.uk', () => {
    document.body.innerHTML = `
      <div data-testid="candidate-review-page">
        <div id="candidateProfileContainer">
          <div data-testid="applicationTabContent">
            saidhaval@hotmail.co.ukPersonal Profile
          </div>
        </div>
      </div>
    `;
    const result = scrapeCandidate();
    expect(result.email).toBe('saidhaval@hotmail.co.uk');
  });

  it('trims email when .com abuts heading: x@y.comExperience → x@y.com', () => {
    document.body.innerHTML = `
      <div data-testid="candidate-review-page">
        <div id="candidateProfileContainer">
          <div data-testid="applicationTabContent">
            x@y.comExperience
          </div>
        </div>
      </div>
    `;
    const result = scrapeCandidate();
    expect(result.email).toBe('x@y.com');
  });

  it('still extracts clean email followed by whitespace', () => {
    document.body.innerHTML = `
      <div data-testid="candidate-review-page">
        <div id="candidateProfileContainer">
          <div data-testid="applicationTabContent">
            driver@gmail.com for references
          </div>
        </div>
      </div>
    `;
    const result = scrapeCandidate();
    expect(result.email).toBe('driver@gmail.com');
  });

  it('still extracts .co.uk email followed by whitespace', () => {
    document.body.innerHTML = `
      <div data-testid="candidate-review-page">
        <div id="candidateProfileContainer">
          <div data-testid="applicationTabContent">
            test@domain.co.uk is my email
          </div>
        </div>
      </div>
    `;
    const result = scrapeCandidate();
    expect(result.email).toBe('test@domain.co.uk');
  });

  it('phone regex does not over-capture into a longer digit string', () => {
    document.body.innerHTML = `
      <div data-testid="candidate-review-page">
        <div id="candidateProfileContainer">
          <div data-testid="applicationTabContent">
            REF: 077123456789999
          </div>
        </div>
      </div>
    `;
    const result = scrapeCandidate();
    // Should NOT extract a phone from a 15-digit reference number
    expect(result.phone).toBeNull();
  });

  it('phone regex still extracts valid UK mobile followed by text', () => {
    document.body.innerHTML = `
      <div data-testid="candidate-review-page">
        <div id="candidateProfileContainer">
          <div data-testid="applicationTabContent">
            Call me on 07999 888777 anytime
          </div>
        </div>
      </div>
    `;
    const result = scrapeCandidate();
    expect(result.phone).toBe('07999 888777');
  });
});

describe('canTriggerLookup', () => {
  it('triggers on phone alone', () => {
    expect(canTriggerLookup({ name: null, email: null, phone: '07712345678', location: null, cvSnippet: null })).toBe(true);
  });

  it('triggers on email alone', () => {
    expect(canTriggerLookup({ name: null, email: 'a@b.com', phone: null, location: null, cvSnippet: null })).toBe(true);
  });

  it('triggers on name + location', () => {
    expect(canTriggerLookup({ name: 'James', email: null, phone: null, location: 'Saffron Walden', cvSnippet: null })).toBe(true);
  });

  it('does NOT trigger on name alone', () => {
    expect(canTriggerLookup({ name: 'James', email: null, phone: null, location: null, cvSnippet: null })).toBe(false);
  });

  it('does NOT trigger on location alone', () => {
    expect(canTriggerLookup({ name: null, email: null, phone: null, location: 'Saffron Walden', cvSnippet: null })).toBe(false);
  });

  it('does NOT trigger when everything is null', () => {
    expect(canTriggerLookup({ name: null, email: null, phone: null, location: null, cvSnippet: null })).toBe(false);
  });
});
