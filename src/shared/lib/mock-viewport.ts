import { vi } from 'vitest';

/**
 * jsdom has no layout: every element reports this box (as in the
 * VirtualList tests), so a grid or list sees a `width` by `height` viewport.
 */
export function mockViewport(width = 800, height = 200) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect);
}
