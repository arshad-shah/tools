import { Fragment, useState } from 'react';
import {
  HitArea,
  PageBox,
  SelectionFrame,
  Text,
  type OverlayTransform,
} from '@/shared/ui';
import type {
  SignBlockParams,
  SignInitialPagesParams,
} from '@/pdf/doc/ops/fill-sign';
import type { Box, OpId, PageRef } from '@/pdf/doc/types';
import { formatBlockDate, layoutBlock } from '@/pdf/sign/block';
import type { ModeProps } from '../types';
import { SignatureLook } from './PlacedSignatures';
import { previewOf, useFillSign } from './store';

/** The page's view box (crop, else the page geometry), page space. */
function viewBox(ctx: ModeProps, page: PageRef): Box {
  if (page.crop) return page.crop;
  const [x0, y0, x1, y1] = ctx.doc.pageGeom(page).view;
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** A signature block drawn as its parts: signature, then the printed lines. */
function BlockLook({
  p,
  box,
  transform,
}: {
  p: SignBlockParams;
  box: Box;
  transform: OverlayTransform;
}) {
  const previews = useFillSign((s) => s.previews);
  const c = p.content;
  const layout = layoutBlock(box, c);
  const lines: [string, Box | null][] = [
    [c.name, layout.name],
    [c.title, layout.title],
    [c.showDate ? formatBlockDate(c.dateIso, c.locale) : '', layout.date],
  ];
  return (
    <>
      <PageBox transform={transform} box={layout.signature}>
        <SignatureLook
          preview={previewOf(c.signature, previews)}
          role="signature"
        />
      </PageBox>
      {lines.map(([text, at], i) =>
        text.trim() && at ? (
          <PageBox key={i} transform={transform} box={at}>
            <Text size="xs" className="flex size-full items-center truncate">
              {text}
            </Text>
          </PageBox>
        ) : null,
      )}
    </>
  );
}

/**
 * Signature blocks on this page (select, move, resize) and initials placed
 * on several pages (select to remove; their spot follows each page's size).
 */
export function PlacedBlocks({
  ctx,
  page,
  pageNumber,
  transform,
}: {
  ctx: ModeProps;
  page: PageRef;
  pageNumber: number;
  transform: OverlayTransform;
}) {
  const previews = useFillSign((s) => s.previews);
  const [preview, setPreview] = useState<{ id: OpId; box: Box } | null>(null);
  const { view } = ctx.doc;
  const blocks = (view.overlays.get(page.id) ?? []).filter(
    (o) => o.type === 'sign.block' && !view.hidden.has(o.opId),
  );
  const initials = view.docOverlays.filter(
    (o) =>
      o.type === 'sign.initialPages' &&
      !view.hidden.has(o.opId) &&
      (o.params as SignInitialPagesParams).pageIds.includes(page.id),
  );
  const frame = initials.length ? viewBox(ctx, page) : null;
  return (
    <>
      {blocks.map((o) => {
        const p = o.params as SignBlockParams;
        const box = preview?.id === o.opId ? preview.box : p.rect;
        const name = `Signature block on page ${pageNumber}`;
        return (
          <Fragment key={o.opId}>
            <BlockLook p={p} box={box} transform={transform} />
            {ctx.selection.objects.has(o.opId) ? (
              <SelectionFrame
                transform={transform}
                box={box}
                resizable
                label={name}
                onChange={(b) => setPreview({ id: o.opId, box: b })}
                onCommit={(b) => {
                  setPreview(null);
                  ctx.doc.dispatch({
                    type: 'object.move',
                    params: { targetId: o.opId, rect: b },
                  });
                }}
              />
            ) : (
              <HitArea
                transform={transform}
                box={box}
                label={name}
                onActivate={() => ctx.selection.selectObjects([o.opId])}
              />
            )}
          </Fragment>
        );
      })}
      {frame
        ? initials.map((o) => {
            const { anchor, content } = o.params as SignInitialPagesParams;
            const box = {
              x: frame.x + anchor.fx * frame.width,
              y: frame.y + anchor.fy * frame.height,
              width: anchor.fw * frame.width,
              height: anchor.fh * frame.height,
            };
            return (
              <Fragment key={o.opId}>
                <PageBox transform={transform} box={box}>
                  <SignatureLook
                    preview={previewOf(content, previews)}
                    role="initials"
                  />
                </PageBox>
                <HitArea
                  transform={transform}
                  box={box}
                  label={`Initials on page ${pageNumber}, on several pages`}
                  pressed={ctx.selection.objects.has(o.opId)}
                  onActivate={() => ctx.selection.selectObjects([o.opId])}
                />
              </Fragment>
            );
          })
        : null}
    </>
  );
}
