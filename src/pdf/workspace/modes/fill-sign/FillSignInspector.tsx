import { IconTrash } from '@/shared/ui/icons';
import { Button, InspectorSection } from '@/shared/ui';
import type { ModeProps } from '../types';

const SIGNING = new Set(['sign.place', 'sign.block', 'sign.initialPages']);

/** The Fill & Sign inspector: the selected signature, block or initials. */
export function FillSignInspector(ctx: ModeProps) {
  const { doc, selection } = ctx;
  const all = [...doc.view.overlays.values(), doc.view.docOverlays].flat();
  const signatures = [...selection.objects].filter((id) =>
    all.some((o) => o.opId === id && SIGNING.has(o.type)),
  );
  if (!signatures.length) return null;
  return (
    <InspectorSection title="Placed signature">
      <div className="flex flex-col gap-2 p-3">
        <Button
          variant="danger"
          size="sm"
          leftIcon={<IconTrash size="sm" />}
          onClick={() => {
            const ops = doc.dispatch(
              signatures.map((targetId) => ({
                type: 'object.remove',
                params: { targetId },
              })),
            );
            if (ops.length) selection.clear();
          }}
        >
          Remove
        </Button>
      </div>
    </InspectorSection>
  );
}
