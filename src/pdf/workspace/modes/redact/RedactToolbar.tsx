import { useEffect, useState } from 'react';
import { Button, Dialog } from '@arshad-shah/cynosure';
import { type ToolGroup } from '../../ui/tool-groups';
import {
  redactApply,
  redactArea,
  redactSearch,
  settings,
} from '@arshad-shah/cynosure/icons';
import { ModeToolbar } from '../../ModeToolbar';
import { ErrorNotice } from '../../ui/states';
import { ToolbarPanel } from '../../ToolbarPanel';
import type { DocumentApi, ModeProps } from '../types';
import {
  applyBlocked,
  applyRedactions,
  askApply,
  openSearch,
  toggleArea,
} from './actions';
import { ApplyConfirm } from './ApplyConfirm';
import { RedactOptions } from './RedactOptions';
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
          icon: redactArea,
          kind: 'toggle',
          pressed: tool.id === AREA_TOOL,
          onSelect: () => toggleArea(ctx),
        },
        {
          id: 'find',
          label: 'Find and mark',
          icon: redactSearch,
          shortcut: 'Mod+F',
          kind: 'toggle',
          pressed: ui.searchOpen,
          onSelect: () =>
            ui.searchOpen ? setRedactUi({ searchOpen: false }) : openSearch(),
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
          icon: redactApply,
          kind: 'button',
          disabled: applyBlocked(doc) ?? false,
          onSelect: () => askApply(doc),
        },
      ],
    },
  ];
  return (
    <>
      <ModeToolbar
        groups={groups}
        trailing={
          // Fill, overlay text, image quality and snapping (backlog P5-E).
          <ToolbarPanel
            layout={ctx.layout}
            label="Redaction options"
            text="Options"
            icon={settings}
            title="Redaction options"
          >
            <RedactOptions />
          </ToolbarPanel>
        }
      />
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
        title="Redaction not applied"
        actions={
          <Button
            variant="solid"
            tone="accent"
            onClick={() => setRedactUi({ failure: null })}
          >
            Close
          </Button>
        }
      >
        {ui.failure ? <ErrorNotice error={ui.failure} /> : null}
      </Dialog>
    </>
  );
}
