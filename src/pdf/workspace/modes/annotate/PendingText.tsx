import { useEffect, useState } from 'react';
import {
  Image,
  OverlayText,
  PageBox,
  type OverlayTransform,
} from '@/shared/ui';
import {
  FREETEXT_LINE_HEIGHT,
  FREETEXT_PAD,
  stampTextBox,
} from '@/pdf/edit/annot/geometry';
import { STAMP_LABELS } from '@/pdf/edit/annot/presets';
import type {
  FreeTextParams,
  StampParams,
} from '@/pdf/doc/ops/annotate-params';
import type { OverlayItem } from '@/pdf/doc/types';
import { useWorkspace } from '../../workspace-context';
import { layoutLines, metricsOf, useTextLayout } from '../../text-layout';

interface Props {
  item: OverlayItem;
  transform: OverlayTransform;
  width: number;
  height: number;
}

/** A pending text comment: wrapped like the writer, in the export font. */
export function FreeTextPreview({ item, transform, width, height }: Props) {
  const p = item.params as FreeTextParams;
  const layout = useTextLayout('Helvetica');
  if (!layout) return null;
  const inner = {
    x: p.rect.x + FREETEXT_PAD,
    y: p.rect.y + FREETEXT_PAD,
    width: Math.max(0, p.rect.width - 2 * FREETEXT_PAD),
    height: Math.max(0, p.rect.height - 2 * FREETEXT_PAD),
  };
  const { lines, size } = layoutLines(
    layout,
    p.text,
    inner,
    p.fontSize,
    FREETEXT_LINE_HEIGHT,
  );
  return (
    <OverlayText
      transform={transform}
      box={inner}
      lines={lines}
      text={p.text}
      family="helvetica"
      size={size}
      color={p.color}
      align={p.align}
      metrics={metricsOf(layout.font)}
      lineHeight={FREETEXT_LINE_HEIGHT}
      width={width}
      height={height}
    />
  );
}

/** A pending stamp's label (fitted like the writer) or its image. */
export function StampPreview({ item, transform, width, height }: Props) {
  const p = item.params as StampParams;
  const layout = useTextLayout('Helvetica-Bold');
  if (p.image) return <ImageStampPreview item={item} transform={transform} />;
  if (!layout) return null;
  const text = (
    p.label ?? (p.preset ? STAMP_LABELS[p.preset] : '')
  ).toUpperCase();
  const inner = stampTextBox(p.rect);
  let size: number;
  try {
    size = layout.fit(layout.font, text, inner, {
      size: 'auto',
      minSize: 4,
      multiline: false,
    }).size;
  } catch {
    return null;
  }
  return (
    <OverlayText
      transform={transform}
      box={inner}
      lines={[text]}
      text={text}
      family="helvetica"
      size={size}
      color={p.color}
      align="center"
      valign="middle"
      metrics={metricsOf(layout.font)}
      width={width}
      height={height}
      className="font-bold"
    />
  );
}

function ImageStampPreview({
  item,
  transform,
}: {
  item: OverlayItem;
  transform: OverlayTransform;
}) {
  const p = item.params as StampParams;
  const ws = useWorkspace();
  const [bytes, setBytes] = useState<{ id: string; bytes: Uint8Array } | null>(
    null,
  );
  const id = p.image!.assetId;
  useEffect(() => {
    let live = true;
    ws.session.blobs.assetBytes(id).then(
      (b) => live && setBytes({ id, bytes: b }),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [ws, id]);
  if (bytes?.id !== id) return null;
  return (
    <PageBox transform={transform} box={p.rect}>
      <Image
        src={bytes.bytes}
        mime={p.image!.mime}
        decorative
        fit="cover"
        className="size-full"
      />
    </PageBox>
  );
}
