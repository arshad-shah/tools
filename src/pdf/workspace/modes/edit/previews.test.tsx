/** @vitest-environment jsdom */
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverlayItem } from '@/pdf/doc/types';
import { ContentPreview } from './ContentPreview';
import { MarkupPreview } from './MarkupPreview';
import type { DocumentApi } from '../types';

const ws = vi.hoisted(() => {
  const bytes = new Uint8Array([1, 2, 3]);
  return { session: { blobs: { assetBytes: async () => bytes } } };
});
vi.mock('../../workspace-context', () => ({ useWorkspace: () => ws }));
// Font metrics are pdf-lib's (a lazy import); these previews need none.
vi.mock('../../text-layout', () => {
  const font = {
    widthOfTextAtSize: () => 10,
    heightAtSize: () => 10,
    getCharacterSet: () => [],
  };
  const layout = { font, fit: () => ({ lines: [], size: 10 }) };
  return {
    useTextLayout: () => layout,
    metricsOf: () => ({ ascent: 0.7, height: 1 }),
  };
});

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: () => 'blob:x',
    revokeObjectURL: () => {},
  });
});

/** pdf.js viewport transform of a 612 x 792 page with /Rotate 90, scale 1. */
const TURNED = { a: 0, b: 1, c: 1, d: 0, e: 0, f: 0 };

const image = (rotate = 0): OverlayItem => ({
  opId: 'o1',
  type: 'content.image',
  pageId: 'p1',
  params: {
    id: 'i1',
    assetId: 'a1',
    mime: 'image/png',
    rect: { x: 100, y: 200, width: 60, height: 30 },
    opacity: 1,
    rotate,
  },
});

const placed = async (container: HTMLElement) => {
  await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
  return container.querySelector('img')!.parentElement!;
};

describe('Edit content preview', () => {
  it('turns an image with the page rotation', async () => {
    const { container } = render(
      <ContentPreview
        items={[image()]}
        transform={TURNED}
        width={792}
        height={612}
        scale={1}
      />,
    );
    const box = await placed(container);
    // The image's own x axis runs down the screen on a page turned 90.
    expect(box.style.transform).toMatch(/^matrix\(0, 1, -1, 0,/);
    expect(box.style.width).toBe('60px');
    expect(box.style.height).toBe('30px');
  });
});

describe('Edit markup preview', () => {
  it('draws an image watermark, turned as the writer turns it', async () => {
    const page = { id: 'p1', source: 's0', index: 0, rotate: 0 as const };
    const doc = {
      view: {
        pages: [page],
        docOverlays: [
          {
            opId: 'w1',
            type: 'markup.watermark',
            pageId: null,
            params: {
              id: 'wm',
              content: {
                kind: 'image',
                assetId: 'a1',
                format: 'png',
                widthFraction: 0.5,
              },
              opacity: 0.4,
              rotation: 45,
              position: 'center',
              margin: 0,
              pages: { mode: 'all' },
            },
          },
        ],
        hidden: new Set(),
      },
      pageGeom: () => ({ view: [0, 0, 612, 792], rotate: 0 }),
    } as unknown as DocumentApi;
    const { container } = render(
      <MarkupPreview
        doc={doc}
        page={page}
        pageIndex={0}
        transform={{ a: 1, b: 0, c: 0, d: -1, e: 0, f: 792 }}
        width={612}
        height={792}
      />,
    );
    const box = await placed(container);
    expect(box.style.width).toBe('306px');
    expect(box.style.opacity).toBe('0.4');
    // 45 degrees counter-clockwise on screen: x axis up and to the right.
    const [a, b] = box.style.transform
      .replace(/matrix\(|\)/g, '')
      .split(',')
      .map(Number);
    expect(a).toBeCloseTo(Math.SQRT1_2, 5);
    expect(b).toBeCloseTo(-Math.SQRT1_2, 5);
  });
});
