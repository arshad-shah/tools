import { useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Text,
} from '@/shared/ui';
import type { NewOperation } from '@/pdf/doc/types';

export interface AutofillRow {
  fieldId: string;
  label: string;
  value: string;
}

const fields = (n: number) => `${n} ${n === 1 ? 'field' : 'fields'}`;

/**
 * The preview before "Fill from My details" (spec §8.6): every planned value
 * as a checked row; only the rows still checked are filled, as one undo step.
 */
export function AutofillPreview({
  open,
  onOpenChange,
  rows,
  toOp,
  dispatch,
  onEditDetails,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  rows: AutofillRow[];
  toOp(row: AutofillRow): NewOperation | null;
  dispatch(ops: NewOperation[], label: string): unknown;
  onEditDetails(): void;
}) {
  const [off, setOff] = useState<ReadonlySet<string>>(new Set());
  const chosen = rows.filter((r) => !off.has(r.fieldId));
  const apply = () => {
    const ops = chosen.flatMap((r) => toOp(r) ?? []);
    if (ops.length) dispatch(ops, `Fill ${fields(ops.length)} from My details`);
    setOff(new Set());
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Fill from My details</DialogTitle>
        <DialogDescription>
          {rows.length
            ? 'Check the values to fill. Nothing is filled until you confirm.'
            : 'No empty field matches your details.'}
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-2">
        {rows.map((r) => {
          const id = `autofill-${r.fieldId}`;
          return (
            <div key={r.fieldId} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={!off.has(r.fieldId)}
                onCheckedChange={(checked) =>
                  setOff((s) => {
                    const next = new Set(s);
                    if (checked) next.delete(r.fieldId);
                    else next.add(r.fieldId);
                    return next;
                  })
                }
              />
              <Label htmlFor={id}>{`${r.label}: ${r.value}`}</Label>
            </div>
          );
        })}
        {rows.length === 0 ? (
          <Text size="sm" tone="muted">
            Add more details, or fill the fields by hand.
          </Text>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onEditDetails}>
          Edit my details
        </Button>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={chosen.length === 0}
          onClick={apply}
        >
          {`Fill ${fields(chosen.length)}`}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
