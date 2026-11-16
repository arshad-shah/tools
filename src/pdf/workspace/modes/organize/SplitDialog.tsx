import { useState } from 'react';
import { saveZip, deriveFilename } from '@/shared/lib/download';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import { Button, NumberField, RadioGroup, Stack } from '@arshad-shah/cynosure';
import type { ModeProps } from '../types';
import { ToolDialog } from '../../ui/ToolDialog';
import type { OrganizeSurface } from './surface';
import { useWorkspace } from '../../workspace-context';
import { splitDocument, splitGroups } from './split-extract';

/** "Split": new files at the selected pages or every N pages, saved as a ZIP. */
export function SplitDialog({
  open,
  onOpenChange,
  ctx,
  surface,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  ctx: ModeProps;
  /** Where it shows: by its tool (popover) or as a phone sheet. */
  surface?: OrganizeSurface;
}) {
  const ws = useWorkspace();
  const [how, setHow] = useState<'selected' | 'every'>('every');
  const [every, setEvery] = useState(1);
  const split = async () => {
    const { model, blobs, services } = ws.session;
    const at = how === 'selected' ? 'selected' : { every };
    try {
      // A choice that makes no parts keeps the dialog open to fix it.
      splitGroups(
        model.getView().pages.map((p) => p.id),
        at,
        ctx.selection.pages,
      );
    } catch (e) {
      return notify.error(toToolError(e));
    }
    onOpenChange(false);
    try {
      const parts = await ws.runJob('Splitting', (job) =>
        splitDocument(model, blobs, at, ctx.selection.pages, {
          ...job,
          services,
        }),
      );
      if (!parts) return;
      await saveZip(
        parts.map((p) => ({ name: p.name, data: p.bytes })),
        deriveFilename(model.getState().name, 'split', 'zip'),
      );
      notify.success(`Saved ${parts.length} files`);
    } catch (e) {
      notify.error(toToolError(e));
    }
  };
  return (
    <ToolDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Split into files"
      description="Makes new PDFs from this document. The document itself does not change."
      surface={surface}
      actions={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="solid" tone="accent" onClick={() => void split()}>
            Split
          </Button>
        </>
      }
    >
      <Stack gap="4">
        <RadioGroup
          label="Where to split"
          value={how}
          onChange={(v) => setHow(v as typeof how)}
          options={[
            { value: 'selected', label: 'At selected pages' },
            { value: 'every', label: 'Every N pages' },
          ]}
        />
        {how === 'every' ? (
          <NumberField
            label="Pages per file"
            value={every}
            min={1}
            onChange={(v) => v !== null && setEvery(v)}
          />
        ) : null}
      </Stack>
    </ToolDialog>
  );
}
