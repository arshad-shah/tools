import { afterEach, beforeEach } from 'vitest';

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
