import { useState } from 'react';
import { IconPlus, IconTrash } from '@/shared/ui/icons';
import {
  Button,
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  IconButton,
  Input,
  Label,
  NumberInput,
  Select,
} from '@/shared/ui';
import type { PageLabelRange } from '@/pdf/doc/types';
import type { ModeProps } from '../types';

const STYLES = [
  { value: 'D', label: 'Numbers (1, 2, 3)' },
  { value: 'r', label: 'Roman (i, ii, iii)' },
  { value: 'R', label: 'Roman capitals (I, II, III)' },
  { value: 'a', label: 'Letters (a, b, c)' },
  { value: 'A', label: 'Capital letters (A, B, C)' },
  { value: 'none', label: 'Prefix only' },
];

interface Row {
  /** 1-based page where the range starts. */
  from: number;
  style: string;
  prefix: string;
  first: number;
}

const toRows = (ranges: readonly PageLabelRange[] | null): Row[] =>
  ranges?.length
    ? ranges.map((r) => ({
        from: r.start + 1,
        style: r.style ?? 'none',
        prefix: r.prefix ?? '',
        first: r.first ?? 1,
      }))
    : [{ from: 1, style: 'D', prefix: '', first: 1 }];

/** "Page labels": the numbers viewers show for pages (e.g. i, ii, then 1, 2). */
export function PageLabelsDialog({
  open,
  onOpenChange,
  ctx,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  ctx: ModeProps;
}) {
  const count = ctx.doc.view.pages.length;
  const [rows, setRows] = useState<Row[]>(() =>
    toRows(ctx.doc.view.pageLabels),
  );
  const patch = (i: number, p: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const apply = (ranges: PageLabelRange[]) => {
    if (ctx.doc.dispatch({ type: 'page.label', params: { ranges } }).length)
      onOpenChange(false);
  };
  const ranges = (): PageLabelRange[] =>
    [...rows]
      .sort((a, b) => a.from - b.from)
      .map((r) => ({
        start: r.from - 1,
        style: r.style === 'none' ? null : (r.style as PageLabelRange['style']),
        ...(r.prefix ? { prefix: r.prefix } : {}),
        ...(r.first !== 1 ? { first: r.first } : {}),
      }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="lg">
      <DialogHeader>
        <DialogTitle>Page labels</DialogTitle>
        <DialogDescription>
          Each range numbers pages from its first page until the next range.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <fieldset
            key={i}
            className="flex flex-wrap items-end gap-3 rounded-md border border-line p-3"
          >
            <legend className="px-1 text-sm font-medium text-fg">
              Range {i + 1}
            </legend>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`label-from-${i}`}>From page</Label>
              <NumberInput
                id={`label-from-${i}`}
                value={r.from}
                min={1}
                max={count}
                onValueChange={(from) => patch(i, { from })}
              />
            </div>
            <div className="flex min-w-48 flex-col gap-1">
              <Label htmlFor={`label-style-${i}`}>Style</Label>
              <Select
                id={`label-style-${i}`}
                value={r.style}
                items={STYLES}
                onValueChange={(style) => patch(i, { style })}
              />
            </div>
            <div className="flex w-28 flex-col gap-1">
              <Label htmlFor={`label-prefix-${i}`}>Prefix</Label>
              <Input
                id={`label-prefix-${i}`}
                value={r.prefix}
                onChange={(prefix) => patch(i, { prefix })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`label-first-${i}`}>Start at</Label>
              <NumberInput
                id={`label-first-${i}`}
                value={r.first}
                min={1}
                onValueChange={(first) => patch(i, { first })}
              />
            </div>
            <IconButton
              variant="ghost"
              label={`Remove range ${i + 1}`}
              icon={IconTrash}
              disabled={rows.length === 1}
              onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
            />
          </fieldset>
        ))}
        <div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<IconPlus size="sm" />}
            onClick={() =>
              setRows((rs) => [
                ...rs,
                {
                  from: Math.min(count, (rs.at(-1)?.from ?? 0) + 1),
                  style: 'D',
                  prefix: '',
                  first: 1,
                },
              ])
            }
          >
            Add range
          </Button>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={() => apply([])}>
          Remove labels
        </Button>
        <Button variant="primary" onClick={() => apply(ranges())}>
          Save labels
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
