// Polyfill ResizeObserver for jsdom (not natively supported)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    private callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    observe(target: Element) {
      // Fire once synchronously with a mock entry so page-push logic runs
      this.callback(
        [
          {
            target,
            contentRect: target.getBoundingClientRect(),
            borderBoxSize: [{ blockSize: 40, inlineSize: 1000 }],
            contentBoxSize: [{ blockSize: 40, inlineSize: 1000 }],
            devicePixelContentBoxSize: [{ blockSize: 40, inlineSize: 1000 }],
          } as unknown as ResizeObserverEntry,
        ],
        this,
      );
    }
    unobserve() {}
    disconnect() {}
  };
}
