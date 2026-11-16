import { useState } from 'react';
import { Button, Checkbox, Dialog, Stack, Text } from '@arshad-shah/cynosure';
import type { NewOperation } from '@/pdf/doc/types';

export interface AutofillRow {
  fieldId: string;
  label: string;
  value: string;
}

const fields = (n: number) => `${n} ${n === 1 ? 'field' : 'fields'}`;

/**
 * Rows of one source field shown on several pages (a duplicated page) are
 * one row: same label, same value, same detector id after the page id.
 */
const groupKey = (r: AutofillRow) => {
  const slash = r.fieldId.indexOf('/');
  const field = slash >= 0 ? r.fieldId.slice(slash + 1) : r.fieldId;
  return [r.label, r.value, field].join('\u0000');
};

function groupRows(rows: AutofillRow[]) {
  const groups = new Map<string, AutofillRow[]>();
  for (const r of rows) {
    const k = groupKey(r);
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  return [...groups.entries()].map(([key, members]) => ({ key, members }));
}

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
  const groups = groupRows(rows);
  const chosen = rows.filter((r) => !off.has(groupKey(r)));
  const apply = () => {
    const ops = chosen.flatMap((r) => toOp(r) ?? []);
    if (ops.length) dispatch(ops, `Fill ${fields(ops.length)} from My details`);
    setOff(new Set());
    onOpenChange(false);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Fill from My details"
      description={
        rows.length
          ? 'Check the values to fill. Nothing is filled until you confirm.'
          : 'No empty field matches your details.'
      }
      actions={
        <>
          <Button variant="ghost" onClick={onEditDetails}>
            Edit my details
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            tone="accent"
            disabled={chosen.length === 0}
            onClick={apply}
          >
            {`Fill ${fields(chosen.length)}`}
          </Button>
        </>
      }
    >
      <Stack gap="3">
        {groups.map(({ key, members }) => {
          const r = members[0];
          return (
            <Checkbox
              key={key}
              label={`${r.label}: ${r.value}`}
              description={
                members.length > 1 ? `${members.length} places` : undefined
              }
              checked={!off.has(key)}
              onChange={(checked) =>
                setOff((s) => {
                  const next = new Set(s);
                  if (checked) next.delete(key);
                  else next.add(key);
                  return next;
                })
              }
            />
          );
        })}
        {rows.length === 0 ? (
          <Text as="p" size="sm" tone="muted">
            Add more details, or fill the fields by hand.
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  );
}
