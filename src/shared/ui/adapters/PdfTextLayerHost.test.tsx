/** @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const created: {
  viewport: { scale: number; rotation: number; rawDims: unknown };
}[] = [];
const cancel = vi.fn();
let pending = false;
vi.mock('pdfjs-dist', () => ({
  TextLayer: class {
    constructor(opts: {
      viewport: { scale: number; rotation: number; rawDims: unknown };
    }) {
      created.push(opts);
    }
    render() {
      return pending ? new Promise(() => {}) : Promise.resolve();
    }
    cancel = cancel;
  },
}));

const { PdfTextLayerHost } = await import('./PdfTextLayerHost');
const { textLayerViewport } = await import('./text-layer-viewport');

const text = { items: [], styles: {} };
const geom = {
  view: [0, 0, 612, 792] as [number, number, number, number],
  rotate: 90,
};

describe('PdfTextLayerHost', () => {
  beforeEach(() => {
    created.length = 0;
    cancel.mockClear();
  });

  it('builds a viewport with the page rotation and scale, and sets --scale-factor', () => {
    render(
      <PdfTextLayerHost
        text={text}
        geom={geom}
        rotate={90}
        scale={1.5}
        selectable
        label="Page 3 text"
      />,
    );
    expect(created).toHaveLength(1);
    expect(created[0].viewport.rotation).toBe(180);
    expect(created[0].viewport.scale).toBe(1.5);
    const layer = screen.getByRole('region', { name: 'Page 3 text' });
    expect(layer.style.getPropertyValue('--scale-factor')).toBe('1.5');
    expect(layer.dataset.selectable).toBe('true');
    expect(layer.dataset.mainRotation).toBe('180');
  });

  it('re-renders after a scale change settles, without cancelling the old layer', () => {
    pending = true;
    vi.useFakeTimers();
    const { rerender } = render(
      <PdfTextLayerHost
        text={text}
        geom={geom}
        rotate={0}
        scale={1}
        selectable={false}
        label="t"
      />,
    );
    rerender(
      <PdfTextLayerHost
        text={text}
        geom={geom}
        rotate={0}
        scale={2}
        selectable={false}
        label="t"
      />,
    );
    expect(created).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(created).toHaveLength(2);
    expect(created[1].viewport.scale).toBe(2);
    // The running layer is left to finish into a detached node.
    expect(cancel).not.toHaveBeenCalled();
    vi.useRealTimers();
    pending = false;
  });

  it('does not cancel a finished layer, and fresh geometry objects do not re-render', async () => {
    const { rerender } = render(
      <PdfTextLayerHost
        text={text}
        geom={{ ...geom }}
        rotate={0}
        scale={1}
        selectable={false}
        label="t"
      />,
    );
    await act(async () => {});
    rerender(
      <PdfTextLayerHost
        text={text}
        geom={{ ...geom }}
        rotate={0}
        scale={1}
        selectable={false}
        label="t"
      />,
    );
    expect(created).toHaveLength(1);
    rerender(
      <PdfTextLayerHost
        text={{ items: [], styles: {} }}
        geom={geom}
        rotate={0}
        scale={1}
        selectable={false}
        label="t"
      />,
    );
    expect(created).toHaveLength(2);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('uses the crop as the view box', () => {
    expect(
      textLayerViewport(geom, 0, 1, { x: 10, y: 20, width: 100, height: 200 })
        .rawDims,
    ).toEqual({ pageWidth: 100, pageHeight: 200, pageX: 10, pageY: 20 });
  });
});
