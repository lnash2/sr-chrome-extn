import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chromeStorageAdapter } from '../chromeStorageAdapter';

// ---------------------------------------------------------------------------
// Mock chrome.storage.local
// ---------------------------------------------------------------------------

const store: Record<string, string> = {};

const mockChromeStorage = {
  local: {
    get(keys: string[], cb: (result: Record<string, unknown>) => void) {
      const result: Record<string, unknown> = {};
      for (const k of keys) {
        if (k in store) result[k] = store[k];
      }
      cb(result);
    },
    set(items: Record<string, string>, cb: () => void) {
      for (const [k, v] of Object.entries(items)) store[k] = v;
      cb();
    },
    remove(keys: string[], cb: () => void) {
      for (const k of keys) delete store[k];
      cb();
    },
  },
};

// @ts-expect-error — partial chrome mock
globalThis.chrome = { storage: mockChromeStorage };

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('chromeStorageAdapter', () => {
  it('getItem returns null for missing key', async () => {
    const val = await chromeStorageAdapter.getItem('nonexistent');
    expect(val).toBeNull();
  });

  it('setItem + getItem round-trips a value', async () => {
    await chromeStorageAdapter.setItem('auth-token', '{"access_token":"abc"}');
    const val = await chromeStorageAdapter.getItem('auth-token');
    expect(val).toBe('{"access_token":"abc"}');
  });

  it('keys are prefixed with sb-', async () => {
    await chromeStorageAdapter.setItem('my-key', 'value');
    expect(store['sb-my-key']).toBe('value');
    expect(store['my-key']).toBeUndefined();
  });

  it('removeItem deletes the key', async () => {
    await chromeStorageAdapter.setItem('to-delete', 'temp');
    await chromeStorageAdapter.removeItem('to-delete');
    const val = await chromeStorageAdapter.getItem('to-delete');
    expect(val).toBeNull();
  });

  it('setItem overwrites existing value', async () => {
    await chromeStorageAdapter.setItem('key', 'first');
    await chromeStorageAdapter.setItem('key', 'second');
    const val = await chromeStorageAdapter.getItem('key');
    expect(val).toBe('second');
  });

  it('multiple keys are independent', async () => {
    await chromeStorageAdapter.setItem('a', '1');
    await chromeStorageAdapter.setItem('b', '2');
    expect(await chromeStorageAdapter.getItem('a')).toBe('1');
    expect(await chromeStorageAdapter.getItem('b')).toBe('2');
    await chromeStorageAdapter.removeItem('a');
    expect(await chromeStorageAdapter.getItem('a')).toBeNull();
    expect(await chromeStorageAdapter.getItem('b')).toBe('2');
  });
});
