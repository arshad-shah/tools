import { useState } from 'react';
import { saveZip, deriveFilename } from '@/shared/lib/download';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import {
  Button,
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  NumberInput,
  RadioGroup,
} from '@/shared/ui';
import type { ModeProps } from '../types';
import { useWorkspace } from '../../workspace-context';
import { splitDocument } from './split-extract';

/** "Split": new files at the selected pages or every N pages, saved as a ZIP. */
export function SplitDialog({
  open,
  onOpenChange,
  ctx,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  ctx: ModeProps;
}) {
  const ws = useWorkspace();
  const [how, setHow] = useState<'selected' | 'every'>('every');
  const [every, setEvery] = useState(1);
  const split = async () => {
    onOpenChange(false);
    const { model, blobs, services } = ws.session;
    try {
      const parts = await ws.runJob('Splitting', (job) =>
        splitDocument(
          model,
          blobs,
          how === 'selected' ? 'selected' : { every },
          ctx.selection.pages,
          { ...job, services },
        ),
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Split into files</DialogTitle>
        <DialogDescription>
          Makes new PDFs from this document. The document itself does not
          change.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-4">
        <RadioGroup
          label="Where to split"
          value={how}
          onValueChange={(v) => setHow(v as typeof how)}
          options={[
            { value: 'selected', label: 'At selected pages' },
            { value: 'every', label: 'Every N pages' },
          ]}
        />
        {how === 'every' ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor="split-every">Pages per file</Label>
            <NumberInput
              id="split-every"
              value={every}
              min={1}
              onValueChange={setEvery}
            />
          </div>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => void split()}>
          Split
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
