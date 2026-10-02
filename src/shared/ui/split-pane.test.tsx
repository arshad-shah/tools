/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SplitPane } from './split-pane';

const sep = () => screen.getByRole('separator');
const now = () => sep().getAttribute('aria-valuenow');

function mockWidth(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

const panes = (extra: Partial<ComponentProps<typeof SplitPane>> = {}) => (
  <SplitPane direction="horizontal" {...extra}>
    <div>Left content</div>
    <div>Right content</div>
  </SplitPane>
);

describe('SplitPane', () => {
  it('is a focusable separator controlling the first pane', () => {
    render(panes());
    const s = sep();
    expect(s.tabIndex).toBe(0);
    expect(now()).toBe('50');
    expect(s.getAttribute('aria-valuemin')).toBe('15');
    expect(s.getAttribute('aria-valuemax')).toBe('85');
    expect(s.getAttribute('aria-orientation')).toBe('vertical');
    const first = document.getElementById(s.getAttribute('aria-controls')!);
    expect(first?.textContent).toBe('Left content');
  });

  it('ArrowRight moves 5 percent and clamps at min and max', () => {
    render(panes());
    fireEvent.keyDown(sep(), { key: 'ArrowRight' });
    expect(now()).toBe('55');
    fireEvent.keyDown(sep(), { key: 'ArrowRight', shiftKey: true });
    expect(now()).toBe('75');
    fireEvent.keyDown(sep(), { key: 'ArrowRight', shiftKey: true });
    expect(now()).toBe('85');
    fireEvent.keyDown(sep(), { key: 'ArrowLeft' });
    expect(now()).toBe('80');
    fireEvent.keyDown(sep(), { key: 'Home' });
    expect(now()).toBe('15');
    fireEvent.keyDown(sep(), { key: 'ArrowLeft' });
    expect(now()).toBe('15');
    fireEvent.keyDown(sep(), { key: 'End' });
    expect(now()).toBe('85');
  });

  it('vertical direction uses ArrowDown and a horizontal separator', () => {
    render(panes({ direction: 'vertical' }));
    expect(sep().getAttribute('aria-orientation')).toBe('horizontal');
    fireEvent.keyDown(sep(), { key: 'ArrowDown' });
    expect(now()).toBe('55');
  });

  it('double-click and Enter reset to the default ratio', () => {
    render(panes({ defaultRatio: 0.4 }));
    expect(now()).toBe('40');
    fireEvent.keyDown(sep(), { key: 'End' });
    fireEvent.doubleClick(sep());
    expect(now()).toBe('40');
    fireEvent.keyDown(sep(), { key: 'Home' });
    fireEvent.keyDown(sep(), { key: 'Enter' });
    expect(now()).toBe('40');
  });

  it('pointer drag sets the ratio from the pointer position', () => {
    render(panes());
    const root = sep().closest('[data-split-pane]') as HTMLElement;
    root.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 1000, height: 500 }) as DOMRect;
    const s = sep();
    s.setPointerCapture = vi.fn();
    s.releasePointerCapture = vi.fn();
    fireEvent.pointerDown(s, { pointerId: 1, clientX: 500, button: 0 });
    fireEvent.pointerMove(s, { pointerId: 1, clientX: 300 });
    fireEvent.pointerUp(s, { pointerId: 1, clientX: 300 });
    expect(now()).toBe('30');
    expect(s.setPointerCapture).toHaveBeenCalledWith(1);
  });

  it('persists the ratio by persistKey across remounts', () => {
    const { unmount } = render(panes({ persistKey: 'split-test' }));
    fireEvent.keyDown(sep(), { key: 'ArrowRight' });
    expect(now()).toBe('55');
    unmount();
    render(panes({ persistKey: 'split-test' }));
    expect(now()).toBe('55');
    expect(localStorage.getItem('kit:store:tool:kit-split')).toContain(
      'split-test',
    );
  });

  it('collapses and expands a pane with labelled buttons', () => {
    render(panes({ collapsible: 'both' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Collapse first pane' }),
    );
    expect(screen.getByText('Left content').closest('[hidden]')).not.toBeNull();
    expect(now()).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: 'Expand first pane' }));
    expect(screen.getByText('Left content').closest('[hidden]')).toBeNull();
    expect(now()).toBe('50');
    fireEvent.click(
      screen.getByRole('button', { name: 'Collapse second pane' }),
    );
    expect(now()).toBe('100');
  });

  it('stacks both panes below md with no separator', () => {
    mockWidth(false);
    render(panes());
    expect(screen.queryByRole('separator')).toBeNull();
    expect(screen.getByText('Left content')).toBeTruthy();
    expect(screen.getByText('Right content')).toBeTruthy();
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 900px)');
  });

  it('keeps the separator at or above md', () => {
    mockWidth(true);
    render(panes());
    expect(sep()).toBeTruthy();
  });
});
