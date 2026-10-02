/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DocumentViewport,
  type DocumentViewportProps,
  type ZoomSetting,
} from './document-viewport';

const PAGES = Array.from({ length: 100 }, (_, i) => ({
  id: `p${i + 1}`,
  width: 612,
  height: 792,
}));

function stubBox(width: number, height: number) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(
    height,
  );
}

function view(over: Partial<DocumentViewportProps> = {}) {
  const renderPage = vi.fn(
    (p: {
      id: string;
      index: number;
      scale: number;
      visible: boolean;
      visibleRect: {
        left: number;
        top: number;
        width: number;
        height: number;
      } | null;
    }) => (
      <span>
        {p.id} {p.visible ? 'visible' : 'near'}
      </span>
    ),
  );
  const onZoomChange = vi.fn();
  const utils = render(
    <DocumentViewport
      label="Document"
      pages={PAGES}
      zoom={{ kind: 'percent', value: 100 }}
      onZoomChange={onZoomChange}
      renderPage={renderPage}
      {...over}
    />,
  );
  return {
    ...utils,
    renderPage,
    onZoomChange,
    region: screen.getByRole('region', { name: 'Document' }),
  };
}

beforeEach(() => stubBox(1000, 800));
afterEach(() => vi.restoreAllMocks());

describe('DocumentViewport', () => {
  it('renders only the slots near the viewport, each a labelled region', () => {
    view();
    const slots = screen.getAllByTestId(/^page-slot-/);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.length).toBeLessThan(6);
    expect(screen.getByTestId('page-slot-1').getAttribute('aria-label')).toBe(
      'Page 1 of 100',
    );
    expect(
      screen.getByRole('region', { name: 'Page 1 of 100' }).textContent,
    ).toContain('p1 visible');
  });

  it('follows the scroll position', () => {
    const onVisiblePagesChange = vi.fn();
    const { region } = view({ onVisiblePagesChange });
    expect(onVisiblePagesChange).toHaveBeenLastCalledWith(['p1']);
    // Slot 50 starts at gap + 49 * (792 + gap).
    act(() => {
      region.scrollTop = 16 + 49 * 808;
      fireEvent.scroll(region);
    });
    expect(screen.queryByTestId('page-slot-1')).toBeNull();
    expect(screen.getByTestId('page-slot-50')).toBeTruthy();
    expect(onVisiblePagesChange).toHaveBeenLastCalledWith(['p50']);
  });

  it('reports the page with the largest visible area as current', () => {
    const onCurrentPageChange = vi.fn();
    const { region } = view({ onCurrentPageChange });
    expect(onCurrentPageChange).toHaveBeenLastCalledWith('p1');
    // A 92px sliver of page 1 above most of page 2.
    act(() => {
      region.scrollTop = 16 + 700;
      fireEvent.scroll(region);
    });
    expect(onCurrentPageChange).toHaveBeenLastCalledWith('p2');
  });

  it('tells each slot which part of it is on screen', () => {
    const { renderPage } = view();
    const first = renderPage.mock.calls
      .map((c) => c[0])
      .filter((p) => p.index === 0)
      .at(-1)!;
    // 1000 wide viewport, 612 wide page centred; 800 tall viewport, slot at y 16.
    expect(first.visibleRect).toEqual({
      left: 0,
      top: 0,
      width: 612,
      height: 784,
    });
    const third = renderPage.mock.calls
      .map((c) => c[0])
      .filter((p) => p.index === 2)
      .at(-1);
    if (third) expect(third.visibleRect).toBeNull();
  });

  it('ctrl+wheel zooms to a percent', () => {
    const { region, onZoomChange } = view();
    fireEvent.wheel(region, { ctrlKey: true, deltaY: -100 });
    const z = onZoomChange.mock.calls.at(-1)?.[0] as ZoomSetting;
    expect(z.kind).toBe('percent');
    expect(z.kind === 'percent' && z.value).toBeGreaterThan(100);
    fireEvent.wheel(region, { deltaY: -100 });
    expect(onZoomChange).toHaveBeenCalledTimes(1);
  });

  it('fit-width scales the widest page into the client width', () => {
    const { renderPage } = view({ zoom: { kind: 'fit-width' } });
    const scale = renderPage.mock.calls.at(-1)?.[0].scale;
    expect(scale).toBeCloseTo((1000 - 2 * 16) / 612, 5);
  });

  it('fit-page also fits the tallest page into the client height', () => {
    const { renderPage } = view({ zoom: { kind: 'fit-page' } });
    const scale = renderPage.mock.calls.at(-1)?.[0].scale;
    expect(scale).toBeCloseTo((800 - 2 * 16) / 792, 5);
  });

  it('announces the zoom level politely', () => {
    const { rerender } = view();
    rerender(
      <DocumentViewport
        label="Document"
        pages={PAGES}
        zoom={{ kind: 'percent', value: 150 }}
        onZoomChange={() => {}}
        renderPage={() => null}
      />,
    );
    expect(screen.getByRole('status').textContent).toBe('Zoom 150 percent');
  });

  it('scrolls to a requested page', () => {
    const { rerender, region } = view();
    rerender(
      <DocumentViewport
        label="Document"
        pages={PAGES}
        zoom={{ kind: 'percent', value: 100 }}
        onZoomChange={() => {}}
        renderPage={() => null}
        scrollToPage={{ id: 'p10', nonce: 1 }}
      />,
    );
    expect(region.scrollTop).toBe(9 * 808);
    expect(screen.getByTestId('page-slot-10')).toBeTruthy();
  });

  it('centres a requested box on the page and can focus the page', () => {
    stubBox(800, 400);
    const { rerender, region } = view();
    rerender(
      <DocumentViewport
        label="Document"
        pages={PAGES}
        zoom={{ kind: 'percent', value: 100 }}
        onZoomChange={() => {}}
        renderPage={() => null}
        scrollToPage={{
          id: 'p10',
          nonce: 1,
          rect: { left: 0, top: 500, width: 100, height: 40 },
          focus: true,
        }}
      />,
    );
    // Page top (gap + offset) + box top - half the space around the box.
    expect(region.scrollTop).toBe(16 + 9 * 808 + 500 - (400 - 40) / 2);
    const slot = screen.getByTestId('page-slot-10');
    expect(document.activeElement).toBe(slot);
    expect(slot.getAttribute('tabindex')).toBe('-1');
  });

  it('scales the requested box with the zoom', () => {
    stubBox(800, 400);
    const { rerender, region } = view();
    rerender(
      <DocumentViewport
        label="Document"
        pages={PAGES}
        zoom={{ kind: 'percent', value: 200 }}
        onZoomChange={() => {}}
        renderPage={() => null}
        scrollToPage={{
          id: 'p2',
          nonce: 1,
          rect: { left: 0, top: 300, width: 100, height: 20 },
        }}
      />,
    );
    // 200%: slots are 1584 tall with a 16 gap.
    expect(region.scrollTop).toBe(16 + 1600 + 600 - (400 - 40) / 2);
  });
});
