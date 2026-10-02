import { useContext } from 'react';
import { IconTrash, IconType } from '@/shared/ui/icons';
import { Button, InspectorSection } from '@/shared/ui';
import { useDocumentSignatures } from '../../signatures';
import { WorkspaceContext } from '../../workspace-context';
import type { ModeProps } from '../types';
import { useViewFields } from './data';
import type { ViewField } from './fields';
import { FillSummary } from './FillSummary';
import { fillSign } from './store';
import { SignaturesPanel } from './SignaturesPanel';

const SIGNING = new Set(['sign.place', 'sign.block', 'sign.initialPages']);

const freeTitle = (x: ViewField) =>
  x.mark === 'cross'
    ? 'Cross'
    : x.type === 'tick'
      ? 'Tick'
      : x.type === 'date'
        ? 'Date'
        : 'Text box';

/** Selected free boxes: text settings (text and dates) and Delete. */
function FreeBoxSection({
  ctx,
  boxes,
}: {
  ctx: ModeProps;
  boxes: ViewField[];
}) {
  const { doc, selection } = ctx;
  const one = boxes.length === 1 ? boxes[0] : null;
  const typed = !!one && (one.type === 'text' || one.type === 'date');
  return (
    <InspectorSection
      title={one ? freeTitle(one) : `${boxes.length} boxes selected`}
    >
      <div className="flex flex-col gap-2 p-3">
        {typed ? (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<IconType size="sm" />}
            onClick={() =>
              fillSign.set({
                barClosed: null,
                barFocus: fillSign.get().barFocus + 1,
              })
            }
          >
            Text settings
          </Button>
        ) : null}
        <Button
          variant="danger"
          size="sm"
          leftIcon={<IconTrash size="sm" />}
          onClick={() => {
            const ops = doc.dispatch(
              boxes.map((x) => ({
                type: 'object.remove',
                params: { targetId: x.fillOpId! },
              })),
            );
            if (ops.length) selection.clear();
          }}
        >
          Delete
        </Button>
      </div>
    </InspectorSection>
  );
}

/**
 * The selected signature, block or initials, or the selected free boxes;
 * else the fill summary.
 */
function PlacedSection(ctx: ModeProps) {
  const { doc, selection } = ctx;
  const fields = useViewFields(doc);
  const all = [...doc.view.overlays.values(), doc.view.docOverlays].flat();
  const signatures = [...selection.objects].filter((id) =>
    all.some((o) => o.opId === id && SIGNING.has(o.type)),
  );
  const free = fields.filter(
    (x) =>
      x.origin === 'free' && !!x.fillOpId && selection.objects.has(x.fillOpId),
  );
  if (!signatures.length && free.length)
    return <FreeBoxSection ctx={ctx} boxes={free} />;
  if (!signatures.length) return <FillSummary {...ctx} />;
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

/** "Signatures in this document", shown when the original carries any. */
function SignaturesSection() {
  const ws = useContext(WorkspaceContext);
  const signatures = useDocumentSignatures(ws?.session ?? null);
  if (!signatures.error && !signatures.reports?.length) return null;
  return (
    <InspectorSection title="Signatures in this document">
      <SignaturesPanel signatures={signatures} />
    </InspectorSection>
  );
}

export function FillSignInspector(ctx: ModeProps) {
  return (
    <>
      <SignaturesSection />
      <PlacedSection {...ctx} />
    </>
  );
}
