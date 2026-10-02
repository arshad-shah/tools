import { useContext } from 'react';
import { IconTrash } from '@/shared/ui/icons';
import { Button, InspectorSection } from '@/shared/ui';
import { useDocumentSignatures } from '../../signatures';
import { WorkspaceContext } from '../../workspace-context';
import type { ModeProps } from '../types';
import { SignaturesPanel } from './SignaturesPanel';

const SIGNING = new Set(['sign.place', 'sign.block', 'sign.initialPages']);

/** The Fill & Sign inspector: the selected signature, block or initials. */
function PlacedSection(ctx: ModeProps) {
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
