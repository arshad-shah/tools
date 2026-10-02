/** @vitest-environment jsdom */
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useFavicon } from './use-favicon';

afterEach(() => {
  document.head.innerHTML = '';
});

describe('useFavicon', () => {
  it('swaps the icon while set and restores it after', () => {
    document.head.innerHTML =
      '<link rel="icon" type="image/svg+xml" href="/favicon.svg">';
    const link = document.querySelector('link')!;
    const hook = renderHook(({ href }) => useFavicon(href), {
      initialProps: { href: 'data:image/png;base64,AA' as string | null },
    });
    expect(link.getAttribute('href')).toBe('data:image/png;base64,AA');
    expect(link.getAttribute('type')).toBe('image/png');
    hook.rerender({ href: null });
    expect(link.getAttribute('href')).toBe('/favicon.svg');
    expect(link.getAttribute('type')).toBe('image/svg+xml');
  });
  it('adds a link when the page has none and removes it on unmount', () => {
    const hook = renderHook(() => useFavicon('data:image/png;base64,BB'));
    expect(document.querySelectorAll('link[rel="icon"]')).toHaveLength(1);
    hook.unmount();
    expect(document.querySelectorAll('link[rel="icon"]')).toHaveLength(0);
  });
});
