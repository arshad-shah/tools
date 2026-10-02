import {
  FontPreview,
  FontSample,
  Image,
  PageBox,
  Text,
  VectorSample,
  type ObjectChange,
  type OverlayTransform,
} from '@/shared/ui';
import type { SignPlaceParams } from '@/pdf/doc/ops/fill-sign';
import type { PageRef } from '@/pdf/doc/types';
import type { ModeProps } from '../types';
import { frameRotation } from '../../objects/useObjectSelection';
import { placedSignatures } from './signatures';
import { previewOf, useFillSign, type SignaturePreview } from './store';

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
 * What the signatures placed on this page look like, following a drag or
 * resize live (`preview`); the page's object layer picks and moves them.
 */
export function PlacedSignatures({
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
  return (
    <>
      {placedSignatures(ctx, page.id).map((o) => {
        const p = o.params as SignPlaceParams;
        const live = preview?.get(o.opId);
        const rotate = live ? live.rotate : frameRotation(p.rotate);
        return (
          <PageBox
            key={o.opId}
            transform={transform}
            box={live?.box ?? p.rect}
            rotate={rotate || undefined}
          >
            <SignatureLook
              preview={previewOf(p.content, previews)}
              role={p.role}
            />
          </PageBox>
        );
      })}
    </>
  );
}
