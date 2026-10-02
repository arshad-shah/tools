import {
  Image,
  OverlayText,
  PagePlaced,
  ShapeLayer,
  type OverlayFontFamily,
  type OverlayTransform,
} from '@/shared/ui';
import type {
  ContentFont,
  ContentShapeParams,
  ImageParams,
  TextParams,
} from '@/pdf/doc/ops/edit';
import type { CoverParams } from '@/pdf/doc/ops/cover';
import type { OverlayItem } from '@/pdf/doc/types';
import { useWorkspace } from '../../workspace-context';
import { metricsOf, useTextLayout, type LayoutFont } from '../../text-layout';
import { contentShapes, coverShape } from './content-shapes';
import { useAssetBytes } from './use-asset';

const FAMILY: Record<ContentFont, OverlayFontFamily> = {
  Helvetica: 'helvetica',
  'Times-Roman': 'times',
  Courier: 'courier',
  unicode: 'noto',
};
const LAYOUT: Record<ContentFont, LayoutFont> = {
  Helvetica: 'Helvetica',
  'Times-Roman': 'Times-Roman',
  Courier: 'Courier',
  unicode: 'unicode',
};

interface Props {
  transform: OverlayTransform;
  width: number;
  height: number;
}

/** Text laid out as drawText does (multiline from the top; shrink for covers). */
function TextPreview({
  p,
  shrink,
  transform,
  width,
  height,
}: Props & {
  p: Pick<TextParams, 'text' | 'font' | 'size' | 'color' | 'align' | 'rect'> & {
    rotate?: number;
    lineHeight?: number;
  };
  shrink: boolean;
}) {
  const layout = useTextLayout(LAYOUT[p.font]);
  if (!layout) return null;
  const lh = p.lineHeight ?? 1.2;
  let lines: string[];
  let size = p.size;
  try {
    const fitted = layout.fit(layout.font, p.text, p.rect, {
      size: p.size,
      minSize: shrink ? Math.min(6, p.size) : p.size,
      multiline: true,
      lineHeight: lh,
    });
    lines = fitted.lines;
    size = fitted.size;
  } catch {
    lines = p.text.split('\n');
  }
  return (
    <OverlayText
      transform={transform}
      box={p.rect}
      lines={lines}
      text={p.text}
      family={FAMILY[p.font]}
      size={size}
      color={p.color}
      align={p.align}
      rotate={p.rotate}
      lineHeight={lh}
      metrics={metricsOf(layout.font)}
      width={width}
      height={height}
    />
  );
}

/**
 * An image as drawImage writes it: its box turned `rotate` degrees
 * counter-clockwise about the centre, and with the page's own rotation
 * (the transform), so it previews the right way round on a turned page.
 */
function ImagePreview({
  p,
  transform,
}: {
  p: ImageParams;
  transform: OverlayTransform;
}) {
  const ws = useWorkspace();
  const bytes = useAssetBytes(ws, p.assetId);
  if (!bytes) return null;
  const { x, y, width, height } = p.rect;
  const r = ((p.rotate ?? 0) * Math.PI) / 180;
  const [cos, sin] = [Math.cos(r), Math.sin(r)];
  // The lower-left corner after turning about the centre.
  const cx = x + width / 2;
  const cy = y + height / 2;
  const ox = cx + cos * (-width / 2) - sin * (-height / 2);
  const oy = cy + sin * (-width / 2) + cos * (-height / 2);
  return (
    <PagePlaced
      transform={transform}
      x={ox}
      y={oy}
      width={width}
      height={height}
      rotate={p.rotate ?? 0}
      opacity={p.opacity}
    >
      <Image
        src={bytes}
        mime={p.mime}
        decorative
        fit="cover"
        className="size-full"
      />
    </PagePlaced>
  );
}

/** Pending Edit content on one page, drawn with the writers' geometry and fonts. */
export function ContentPreview({
  items,
  transform,
  width,
  height,
  scale,
}: Props & { items: OverlayItem[]; scale: number }) {
  const shapes = items.flatMap((o) =>
    o.type === 'content.shape'
      ? contentShapes(o.params as ContentShapeParams, scale)
      : o.type === 'content.cover'
        ? [coverShape(o.params as CoverParams)]
        : [],
  );
  return (
    <>
      {shapes.length ? (
        <ShapeLayer
          width={width}
          height={height}
          transform={transform}
          shapes={shapes}
        />
      ) : null}
      {items.map((o) => {
        if (o.type === 'content.text')
          return (
            <TextPreview
              key={o.opId}
              p={o.params as TextParams}
              shrink={false}
              transform={transform}
              width={width}
              height={height}
            />
          );
        if (o.type === 'content.cover' && (o.params as CoverParams).text.trim())
          return (
            <TextPreview
              key={o.opId}
              p={o.params as CoverParams}
              shrink
              transform={transform}
              width={width}
              height={height}
            />
          );
        if (o.type === 'content.image')
          return (
            <ImagePreview
              key={o.opId}
              p={o.params as ImageParams}
              transform={transform}
            />
          );
        return null;
      })}
    </>
  );
}
