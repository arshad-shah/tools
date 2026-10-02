import { IconTrash } from '@/shared/ui/icons';
import { Button, InspectorSection } from '@/shared/ui';
import type { ModeProps } from '../types';

/** The Fill & Sign inspector: the selected signature. */
export function FillSignInspector(ctx: ModeProps) {
  const { doc, selection } = ctx;
  const signatures = [...selection.objects].filter((id) =>
    [...doc.view.overlays.values()].some((items) =>
      items.some((o) => o.opId === id && o.type === 'sign.place'),
    ),
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
