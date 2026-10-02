import { HitArea, ShapeLayer, type OverlayTransform } from '@/shared/ui';
import type { PageRef } from '@/pdf/doc/types';
import type { ModeProps } from '../types';
import { placeAtTarget, useSignTargets } from './sign-places';
import { fillSign, useFillSign } from './store';

/**
 * While a signature or initials is being placed: the places to sign on
 * this page as dotted outlines, each a button that places it there.
 */
export function SignTargetsOverlay({
  ctx,
  page,
  transform,
  width,
  height,
}: {
  ctx: ModeProps;
  page: PageRef;
  transform: OverlayTransform;
  width: number;
  height: number;
}) {
  const placing = useFillSign((s) => s.placing);
  const sig = useFillSign((s) => (s.placing ? s.ready[s.placing] : null));
  const targets = useSignTargets(page).filter((t) => t.kind !== 'date');
  if (!placing || !sig || !targets.length) return null;
  return (
    <>
      <ShapeLayer
        width={width}
        height={height}
        transform={transform}
        className="pointer-events-none"
        shapes={targets.map((t) => ({
          kind: 'rect' as const,
          box: t.rect,
          stroke: { token: 'info' as const },
          width: 1.5,
          dash: 'dotted' as const,
        }))}
      />
      {targets.map((t) => (
        <HitArea
          key={t.id}
          transform={transform}
          box={t.rect}
          label={`Signature place: ${t.label}`}
          onActivate={() => {
            fillSign.set({ placing: null, signCursor: t.id });
            placeAtTarget(ctx, page, t, sig, placing);
          }}
        />
      ))}
    </>
  );
}
