import { useState } from 'react';
import {
  FontSample,
  HitArea,
  Image,
  PageBox,
  SelectionFrame,
  Text,
  type OverlayTransform,
} from '@/shared/ui';
import type { SignPlaceParams } from '@/pdf/doc/ops/fill-sign';
import type { Box, OpId, PageRef } from '@/pdf/doc/types';
import type { ModeProps } from '../types';
import { FocusOnMount } from './FocusOnMount';
import { fillSign, useFillSign, type SignaturePreview } from './store';

const assetOf = (p: SignPlaceParams) =>
  p.content.kind === 'image' ? p.content.assetId : p.content.fontAsset;

/** What a placed or ghosted signature looks like on the page. */
export function SignatureLook({
  preview,
  role,
}: {
  preview: SignaturePreview | undefined;
  role: SignPlaceParams['role'];
}) {
  if (preview?.kind === 'image')
    return (
      <Image
        src={preview.bytes}
        mime={preview.mime}
        decorative
        fit="contain"
        className="size-full"
      />
    );
  if (preview?.kind === 'text')
    return (
      <FontSample
        family={preview.family}
        color={preview.color}
        className="flex size-full items-center justify-center overflow-hidden text-2xl whitespace-nowrap"
      >
        {preview.text}
      </FontSample>
    );
  return (
    <Text
      size="xs"
      tone="muted"
      className="flex size-full items-center justify-center border border-dashed border-accent-fg"
    >
      {role === 'initials' ? 'Initials' : 'Signature'}
    </Text>
  );
}

/**
 * Signatures placed on this page: a button each to select it, and the
 * selection frame (move, resize keeping the aspect) for the selected one.
 */
export function PlacedSignatures({
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
  const justPlaced = useFillSign((s) => s.justPlaced);
  const [preview, setPreview] = useState<{ id: OpId; box: Box } | null>(null);
  const items = (ctx.doc.view.overlays.get(page.id) ?? []).filter(
    (o) => o.type === 'sign.place' && !ctx.doc.view.hidden.has(o.opId),
  );
  return (
    <>
      {items.map((o) => {
        const p = o.params as SignPlaceParams;
        const selected = ctx.selection.objects.has(o.opId);
        const box = preview?.id === o.opId ? preview.box : p.rect;
        const name = `${p.role === 'initials' ? 'Initials' : 'Signature'} on page ${pageNumber}`;
        return (
          <FocusOnMount
            key={o.opId}
            active={justPlaced === o.opId}
            onFocused={() => fillSign.set({ justPlaced: null })}
          >
            <PageBox transform={transform} box={box}>
              <SignatureLook preview={previews[assetOf(p)]} role={p.role} />
            </PageBox>
            {selected ? (
              <SelectionFrame
                transform={transform}
                box={box}
                resizable
                keepAspect
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
          </FocusOnMount>
        );
      })}
    </>
  );
}
