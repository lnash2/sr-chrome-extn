import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests that the background worker opens a CRM tab on 201 create
 * and does NOT open one on 409 duplicate.
 *
 * We can't import the background worker directly (it has side effects),
 * so we test the logic inline: given a CreateBackgroundResponse,
 * should chrome.tabs.create be called?
 */

// The logic extracted from the message handler:
function shouldOpenTab(response: { ok: boolean; candidate_id?: number }): string | null {
  if (response.ok && response.candidate_id) {
    return `https://portal.swift-recruit.co.uk/swift/candidates/${response.candidate_id}?complete=1`;
  }
  return null;
}

describe('Create candidate — tab open logic', () => {
  it('201 success → returns CRM URL with candidate_id and ?complete=1', () => {
    const url = shouldOpenTab({ ok: true, candidate_id: 90001 });
    expect(url).toBe('https://portal.swift-recruit.co.uk/swift/candidates/90001?complete=1');
  });

  it('URL uses .co.uk domain', () => {
    const url = shouldOpenTab({ ok: true, candidate_id: 12345 });
    expect(url).toContain('swift-recruit.co.uk');
    expect(url).not.toContain('swift-recruit.com');
  });

  it('409 duplicate → no tab', () => {
    const url = shouldOpenTab({ ok: false });
    expect(url).toBeNull();
  });

  it('error → no tab', () => {
    const url = shouldOpenTab({ ok: false });
    expect(url).toBeNull();
  });

  it('201 without candidate_id → no tab', () => {
    const url = shouldOpenTab({ ok: true });
    expect(url).toBeNull();
  });
});
