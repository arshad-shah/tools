import { Text } from '@arshad-shah/cynosure';
import type { OverlayTransform } from '@/shared/surfaces/page/overlay-layer';
import { BytesImage } from '@/shared/surfaces/pdf/BytesImage';
import { InkSample, TypedSample } from '@/shared/surfaces/pdf/InkSample';
import { boxRect } from '@/shared/surfaces/pdf/geometry';
import { Place, Placeholder } from '@/shared/surfaces/pdf/layers';
import type { ObjectChange } from '@/shared/surfaces/pdf/ObjectLayer';
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
      <BytesImage bytes={preview.bytes} mime={preview.mime} fit="contain" />
    );
  if (preview?.kind === 'ink')
    return (
      <InkSample
        d={preview.vector.d}
        width={preview.vector.width}
        height={preview.vector.height}
        color={preview.color}
        evenOdd={preview.evenOdd}
      />
    );
  if (preview?.kind === 'text')
    return (
      <TypedSample
        family={preview.family}
        text={preview.text}
        slant={preview.slant ?? 0}
        color={preview.color}
        size={24}
        label={preview.text}
      />
    );
  return (
    <Placeholder>
      <Text size="xs" tone="muted">
        {role === 'initials' ? 'Initials' : 'Signature'}
      </Text>
    </Placeholder>
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
          <Place
            key={o.opId}
            {...boxRect(transform, live?.box ?? p.rect)}
            rotate={rotate || undefined}
            passive
          >
            <SignatureLook
              preview={previewOf(p.content, previews)}
              role={p.role}
            />
          </Place>
        );
      })}
    </>
  );
}
