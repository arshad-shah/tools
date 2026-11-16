import { afterEach, beforeEach } from 'vitest';
import { installOverlayPolyfills } from './jsdom-overlays';

// Cynosure's overlays need the Popover API and <dialog>.showModal().
installOverlayPolyfills();

// jsdom lays nothing out, so the root's client size is 0. Give it the
// window's size: the kit positioner clips floating surfaces to it.
beforeEach(() => {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  for (const [prop, value] of [
    ['clientWidth', window.innerWidth],
    ['clientHeight', window.innerHeight],
  ] as const)
    Object.defineProperty(html, prop, { configurable: true, value });
});

// Testing Library only auto-cleans with globals enabled; we keep globals off.
afterEach(async () => {
  if (typeof document === 'undefined') return;
  const { cleanup } = await import('@testing-library/react');
  cleanup();
});

// jsdom has no ResizeObserver; Cynosure's Tooltip (IconButton, CopyButton)
// observes its anchor. Tests that need sizes stub it themselves.
if (typeof globalThis.ResizeObserver === 'undefined')
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;

// jsdom lays nothing out: CodeMirror measures text ranges.
if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
  const empty = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      width: 0,
      height: 0,
    }) as DOMRect;
  Range.prototype.getClientRects = () =>
    Object.assign([], { item: () => null }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = empty;
}
