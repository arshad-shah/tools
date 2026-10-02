import { OverlayText, ShapeLayer, type OverlayTransform } from '@/shared/ui';
import type { HeaderFooterParams, WatermarkParams } from '@/pdf/doc/ops/markup';
import type { PageRef } from '@/pdf/doc/types';
import { trySelectPages } from '@/pdf/edit/geometry';
import {
  formatHeaderFooter,
  formatPageNumber,
  headerFooterPlacements,
  pageNumberPlacement,
  watermarkPlacement,
} from '@/pdf/edit/markup-layout';
import type { DocumentApi } from '../types';
import { activeMarkup, frameOf } from './markup-state';
import { metricsOf, useTextLayout } from '../../text-layout';

export interface MarkupPreviewProps {
  doc: DocumentApi;
  page: PageRef;
  pageIndex: number;
  transform: OverlayTransform;
  width: number;
  height: number;
}

/**
 * Watermark, page numbers and header/footer drawn on one page with the
 * writers' anchor math and fonts (spec §9.2: overlay preview on every
 * affected page).
 */
export function MarkupPreview({
  doc,
  page,
  pageIndex,
  transform,
  width,
  height,
}: MarkupPreviewProps) {
  const regular = useTextLayout('Helvetica');
  const bold = useTextLayout('Helvetica-Bold');
  const m = activeMarkup(doc);
  if (!regular || !bold) return null;
  const count = doc.view.pages.length;
  const frame = frameOf(doc, page);
  const on = (sel: WatermarkParams['pages']) => {
    const { pages } = trySelectPages(sel, count);
    return pages;
  };
  const parts: React.ReactNode[] = [];

  const wm = m.watermark;
  if (wm && on(wm.pages).includes(pageIndex)) {
    if (wm.content.kind === 'text') {
      const f = bold.font;
      const size = wm.content.fontSize;
      const box = {
        width: f.widthOfTextAtSize(wm.content.text, size),
        height: f.heightAtSize(size, { descender: false }),
      };
      const at = watermarkPlacement(frame, box, wm);
      parts.push(
        <OverlayText
          key="watermark"
          transform={transform}
          box={{ x: at.x, y: at.y, width: box.width, height: box.height }}
          text={wm.content.text}
          family="helvetica"
          size={size}
          color={wm.content.color}
          align="left"
          opacity={wm.opacity}
          baseline={at}
          metrics={metricsOf(f)}
          width={width}
          height={height}
          className="font-bold"
        />,
      );
    } else {
      // Image watermarks preview as their outline (the export is exact).
      const w =
        (frame.rotation % 180 === 0 ? frame.width : frame.height) *
        wm.content.widthFraction;
      const box = { width: w, height: w * 0.5 };
      const at = watermarkPlacement(frame, box, wm);
      const r = (at.rotate * Math.PI) / 180;
      const pt = (dx: number, dy: number) =>
        `${at.x + dx * Math.cos(r) - dy * Math.sin(r)},${at.y + dx * Math.sin(r) + dy * Math.cos(r)}`;
      parts.push(
        <ShapeLayer
          key="watermark-image"
          width={width}
          height={height}
          transform={transform}
          shapes={[
            {
              kind: 'path',
              d: `M${pt(0, 0)} L${pt(box.width, 0)} L${pt(box.width, box.height)} L${pt(0, box.height)} Z`,
              stroke: { token: 'accent' },
              width: 1,
            },
          ]}
        />,
      );
    }
  }

  const pn = m.pageNumbers;
  if (pn) {
    const selected = on(pn.pages);
    const k = selected.indexOf(pageIndex);
    if (k >= 0) {
      const f = regular.font;
      const total = pn.startAt + selected.length - 1;
      const label = formatPageNumber(pn.format, pn.startAt + k, total);
      const box = {
        width: f.widthOfTextAtSize(label, pn.fontSize),
        height: f.heightAtSize(pn.fontSize, { descender: false }),
      };
      const at = pageNumberPlacement(frame, box, pn);
      parts.push(
        <OverlayText
          key="page-number"
          transform={transform}
          box={{ x: at.x, y: at.y, width: box.width, height: box.height }}
          text={label}
          family="helvetica"
          size={pn.fontSize}
          color="#000000"
          align="left"
          baseline={at}
          width={width}
          height={height}
        />,
      );
    }
  }

  const hf = m.headerFooter;
  if (hf && on(hf.pages).includes(pageIndex)) {
    const f = regular.font;
    const fill = (t: string) =>
      formatHeaderFooter(t, {
        n: pageIndex + 1,
        total: count,
        date: new Date(hf.date),
        filename: hf.filename,
        locale: 'en-GB',
      });
    const slots = (s: HeaderFooterParams['header']) => ({
      left: fill(s.left),
      center: fill(s.center),
      right: fill(s.right),
    });
    const placed = headerFooterPlacements(
      frame,
      { ...hf, header: slots(hf.header), footer: slots(hf.footer) },
      {
        width: (t, size) => f.widthOfTextAtSize(t, size),
        height: (size) => f.heightAtSize(size, { descender: false }),
      },
    );
    placed.forEach((p, i) =>
      parts.push(
        <OverlayText
          key={`hf-${i}`}
          transform={transform}
          box={{ x: p.x, y: p.y, width: 1, height: 1 }}
          text={p.text}
          family="helvetica"
          size={p.size}
          color={hf.color}
          align="left"
          baseline={p}
          width={width}
          height={height}
        />,
      ),
    );
  }
  return <>{parts}</>;
}
