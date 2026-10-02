import { useRef, useState } from 'react';
import {
  FontPreview,
  FontSample,
  HitArea,
  Image,
  PageBox,
  SelectionFrame,
  Text,
  VectorSample,
  type OverlayTransform,
} from '@/shared/ui';
import type { SignPlaceParams } from '@/pdf/doc/ops/fill-sign';
import type { Box, OpId, PageRef } from '@/pdf/doc/types';
import type { ModeProps } from '../types';
import { FocusOnMount } from './FocusOnMount';
import { snapNear, useSignTargets } from './sign-places';
import {
  fillSign,
  previewOf,
  useFillSign,
  type SignaturePreview,
} from './store';

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
  if (preview?.kind === 'ink')
    return (
      <VectorSample
        decorative
        d={preview.vector.d}
        width={preview.vector.width}
        height={preview.vector.height}
        color={preview.color}
        evenOdd={preview.evenOdd}
        className="size-full"
      />
    );
  if (preview?.kind === 'text' && preview.slant)
    return (
      <FontPreview
        family={preview.family}
        text={preview.text}
        slant={preview.slant}
        color={preview.color}
        label={preview.text}
        className="size-full text-2xl"
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
 * selection frame for the selected one: move, resize keeping the aspect
 * and rotate, by pointer or keyboard (arrows 1pt, Shift 10pt, Alt+arrows
 * resize, [ and ] rotate 15 degrees). A pointer drag that ends near a
 * place to sign snaps to it.
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
  const [preview, setPreview] = useState<{
    id: OpId;
    box: Box;
    rotate: number;
  } | null>(null);
  const targets = useSignTargets(page);
  // Snapping follows pointer drags only: keyboard nudges stay exact.
  const dragging = useRef(false);
  const items = (ctx.doc.view.overlays.get(page.id) ?? []).filter(
    (o) => o.type === 'sign.place' && !ctx.doc.view.hidden.has(o.opId),
  );
  return (
    <>
      {items.map((o) => {
        const p = o.params as SignPlaceParams;
        const selected = ctx.selection.objects.has(o.opId);
        const live = preview?.id === o.opId ? preview : null;
        const box = live?.box ?? p.rect;
        const rotate = live?.rotate ?? p.rotate;
        const name = `${p.role === 'initials' ? 'Initials' : 'Signature'} on page ${pageNumber}`;
        return (
          <FocusOnMount
            key={o.opId}
            active={justPlaced === o.opId}
            onFocused={() => fillSign.set({ justPlaced: null })}
          >
            <PageBox
              transform={transform}
              box={box}
              rotate={rotate || undefined}
            >
              <SignatureLook
                preview={previewOf(p.content, previews)}
                role={p.role}
              />
            </PageBox>
            {selected ? (
              <div
                className="contents"
                onPointerDownCapture={() => {
                  dragging.current = true;
                }}
              >
                <SelectionFrame
                  transform={transform}
                  box={box}
                  rotate={rotate}
                  resizable
                  rotatable
                  keepAspect
                  label={name}
                  onChange={(b, r) =>
                    setPreview({ id: o.opId, box: b, rotate: r })
                  }
                  onCommit={(b, r) => {
                    const dragged = dragging.current;
                    dragging.current = false;
                    const snap = dragged ? snapNear(targets, page, b) : null;
                    setPreview(null);
                    const moved = ctx.doc.dispatch({
                      type: 'object.move',
                      params: {
                        targetId: o.opId,
                        rect: snap?.box ?? b,
                        rotate: r,
                      },
                    });
                    if (moved.length && snap?.target)
                      ctx.doc.announce(`Snapped to ${snap.target.label}`);
                  }}
                />
              </div>
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
