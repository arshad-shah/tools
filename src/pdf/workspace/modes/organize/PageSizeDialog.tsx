import { useState } from 'react';
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
import type { PageId } from '@/pdf/doc/types';
import type { ModeProps } from '../types';
import type { OrganizeSurface } from './surface';

const SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
};

/** "Page size": A4, Letter or custom points; content is not scaled. */
export function PageSizeDialog({
  open,
  onOpenChange,
  ctx,
  pageIds,
  surface,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  ctx: ModeProps;
  pageIds: PageId[];
  /** Where it shows: by its tool (popover) or as a phone sheet. */
  surface?: OrganizeSurface;
}) {
  const [choice, setChoice] = useState<'a4' | 'letter' | 'custom'>('a4');
  const [custom, setCustom] = useState({ width: 612, height: 792 });
  const size = choice === 'custom' ? custom : SIZES[choice];
  const n = pageIds.length;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Page size"
      {...surface}
    >
      <DialogHeader>
        <DialogTitle>Page size</DialogTitle>
        <DialogDescription>
          {`Changes the size of ${n === 1 ? 'the current page' : `${n} pages`}. Content is not scaled.`}
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-4">
        <RadioGroup
          label="Size"
          value={choice}
          onValueChange={(v) => setChoice(v as typeof choice)}
          options={[
            { value: 'a4', label: 'A4 (210 x 297 mm)' },
            { value: 'letter', label: 'Letter (8.5 x 11 in)' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        {choice === 'custom' ? (
          <div className="flex gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="page-size-width">Width in points</Label>
              <NumberInput
                id="page-size-width"
                value={custom.width}
                min={1}
                max={14400}
                onValueChange={(width) => setCustom((c) => ({ ...c, width }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="page-size-height">Height in points</Label>
              <NumberInput
                id="page-size-height"
                value={custom.height}
                min={1}
                max={14400}
                onValueChange={(height) => setCustom((c) => ({ ...c, height }))}
              />
            </div>
          </div>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={n === 0}
          onClick={() => {
            const ok = ctx.doc.dispatch({
              type: 'page.resize',
              params: { pageIds, ...size },
            });
            if (ok.length) onOpenChange(false);
          }}
        >
          Change size
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
