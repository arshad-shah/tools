import { useState } from 'react';
import {
  Button,
  Inline,
  NumberField,
  RadioGroup,
  Stack,
} from '@arshad-shah/cynosure';
import type { PageId } from '@/pdf/doc/types';
import type { ModeProps } from '../types';
import { ToolDialog } from '../../ui/ToolDialog';
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
    <ToolDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Page size"
      description={`Changes the size of ${n === 1 ? 'the current page' : `${n} pages`}. Content is not scaled.`}
      surface={surface}
      actions={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            tone="accent"
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
        </>
      }
    >
      <Stack gap="4">
        <RadioGroup
          label="Size"
          value={choice}
          onChange={(v) => setChoice(v as typeof choice)}
          options={[
            { value: 'a4', label: 'A4 (210 x 297 mm)' },
            { value: 'letter', label: 'Letter (8.5 x 11 in)' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        {choice === 'custom' ? (
          <Inline gap="3" wrap>
            <NumberField
              label="Width in points"
              value={custom.width}
              min={1}
              max={14400}
              onChange={(width) =>
                width !== null && setCustom((c) => ({ ...c, width }))
              }
            />
            <NumberField
              label="Height in points"
              value={custom.height}
              min={1}
              max={14400}
              onChange={(height) =>
                height !== null && setCustom((c) => ({ ...c, height }))
              }
            />
          </Inline>
        ) : null}
      </Stack>
    </ToolDialog>
  );
}
