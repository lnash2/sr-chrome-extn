/**
 * Supabase-compatible storage adapter backed by chrome.storage.local.
 *
 * Both the popup and the background service worker share the same
 * chrome.storage.local namespace, so session state is automatically
 * synchronised without message passing.
 *
 * Supabase's SupportedStorage interface requires synchronous getItem,
 * but chrome.storage is async. Supabase >= 2.x accepts async returns
 * from getItem/setItem/removeItem, so we return promises directly.
 */

const KEY_PREFIX = 'sb-';

export const chromeStorageAdapter = {
  getItem(key: string): Promise<string | null> {
    const storageKey = KEY_PREFIX + key;
    return new Promise((resolve) => {
      chrome.storage.local.get([storageKey], (result) => {
        resolve((result[storageKey] as string) ?? null);
      });
    });
  },

  setItem(key: string, value: string): Promise<void> {
    const storageKey = KEY_PREFIX + key;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [storageKey]: value }, () => resolve());
    });
  },

  removeItem(key: string): Promise<void> {
    const storageKey = KEY_PREFIX + key;
    return new Promise((resolve) => {
      chrome.storage.local.remove([storageKey], () => resolve());
    });
  },
};
