import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
class Observer {
  observe() {}
  disconnect() {}
  unobserve() {}
}
vi.stubGlobal('ResizeObserver', Observer);
vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  configurable: true,
  value(options: ScrollToOptions) {
    this.scrollLeft = options.left ?? 0;
  },
});
Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 900 });
