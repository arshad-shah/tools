import { useEffect, useState } from 'react';
import { Dialog, ErrorState, type ToolGroup } from '@/shared/ui';
import {
  IconRedactApply,
  IconRedactArea,
  IconRedactSearch,
} from '@/shared/ui/icons';
import { ModeToolbar } from '../../ModeToolbar';
import type { DocumentApi, ModeProps } from '../types';
import { applyBlocked, applyRedactions, askApply, toggleArea } from './actions';
import { ApplyConfirm } from './ApplyConfirm';
import { AREA_TOOL, markTotals } from './marks';
import { setRedactUi, useRedactUi } from './ui-store';

/** Whether the current base document is tagged (asked when the confirm opens). */
function useTagged(doc: DocumentApi, asking: boolean): boolean {
  const [tagged, setTagged] = useState(false);
  const sourceId = doc.state.checkpoints.find(
    (c) => c.id === doc.view.checkpoint,
  )?.sourceId;
  const docId = sourceId ? doc.sources[sourceId]?.docId : null;
  useEffect(() => {
    if (!asking || !docId) return;
    let live = true;
    doc.render.isTagged(docId).then(
      (t) => live && setTagged(t),
      () => live && setTagged(false),
    );
    return () => {
      live = false;
    };
  }, [asking, docId, doc.render]);
  return asking && tagged;
}

/** Redact tools: mark an area, find and mark, apply (spec 10.1). */
export function RedactToolbar(ctx: ModeProps) {
  const { doc, tool } = ctx;
  const ui = useRedactUi();
  const totals = markTotals(doc.view);
  const tagged = useTagged(doc, ui.confirmOpen);
  const groups: ToolGroup[] = [
    {
      id: 'mark',
      label: 'Mark',
      items: [
        {
          id: 'area',
          label: 'Mark area',
          icon: IconRedactArea,
          kind: 'toggle',
          pressed: tool.id === AREA_TOOL,
          onSelect: () => toggleArea(ctx),
        },
        {
          id: 'find',
          label: 'Find and mark',
          icon: IconRedactSearch,
          shortcut: 'Mod+F',
          kind: 'toggle',
          pressed: ui.searchOpen,
          onSelect: () => setRedactUi({ searchOpen: !ui.searchOpen }),
        },
      ],
    },
    {
      id: 'apply',
      label: 'Apply',
      items: [
        {
          id: 'apply',
          label: 'Apply redactions',
          icon: IconRedactApply,
          kind: 'button',
          disabled: applyBlocked(doc) ?? false,
          onSelect: () => askApply(doc),
        },
      ],
    },
  ];
  return (
    <>
      <ModeToolbar groups={groups} />
      <ApplyConfirm
        open={ui.confirmOpen}
        areas={totals.areas}
        pages={totals.pages}
        tagged={tagged}
        onCancel={() => setRedactUi({ confirmOpen: false })}
        onApply={() => void applyRedactions(doc)}
      />
      <Dialog
        open={ui.failure !== null}
        onOpenChange={(o) => !o && setRedactUi({ failure: null })}
        label="Redaction not applied"
      >
        {ui.failure ? (
          <ErrorState
            error={ui.failure}
            headingLevel={2}
            actions={[
              {
                label: 'Close',
                variant: 'primary',
                onClick: () => setRedactUi({ failure: null }),
              },
            ]}
          />
        ) : null}
      </Dialog>
    </>
  );
}
