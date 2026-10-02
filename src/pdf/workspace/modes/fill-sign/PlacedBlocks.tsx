import {
  PageBox,
  Text,
  type ObjectChange,
  type OverlayTransform,
} from '@/shared/ui';
import type {
  SignBlockParams,
  SignInitialPagesParams,
} from '@/pdf/doc/ops/fill-sign';
import type { Box, PageRef } from '@/pdf/doc/types';
import { initialsBox, placedBlocks } from './signatures';
import { formatBlockDate, layoutBlock } from '@/pdf/sign/block';
import type { ModeProps } from '../types';
import { SignatureLook } from './PlacedSignatures';
import { previewOf, useFillSign } from './store';

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
 * What signature blocks and initials placed on several pages look like on
 * this page, blocks following a drag or resize live (`preview`). The page's
 * object layer picks them (initials on several pages are fixed: their spot
 * follows each page's size).
 */
export function PlacedBlocks({
  ctx,
  page,
  transform,
  preview,
}: {
  ctx: ModeProps;
  page: PageRef;
  transform: OverlayTransform;
  preview: ReadonlyMap<string, ObjectChange> | null;
}) {
  const previews = useFillSign((s) => s.previews);
  const { blocks, initials } = placedBlocks(ctx, page);
  return (
    <>
      {blocks.map((o) => {
        const p = o.params as SignBlockParams;
        return (
          <BlockLook
            key={o.opId}
            p={p}
            box={preview?.get(o.opId)?.box ?? p.rect}
            transform={transform}
          />
        );
      })}
      {initials.map((o) => {
        const p = o.params as SignInitialPagesParams;
        const box = initialsBox(ctx, page, p);
        return box ? (
          <PageBox key={o.opId} transform={transform} box={box}>
            <SignatureLook
              preview={previewOf(p.content, previews)}
              role="initials"
            />
          </PageBox>
        ) : null;
      })}
    </>
  );
}
