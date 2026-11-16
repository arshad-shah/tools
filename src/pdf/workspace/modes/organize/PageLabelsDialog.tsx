import { useState } from 'react';
import { newId } from '@/shared/lib/id';
import {
  Button,
  Card,
  Dialog,
  IconButton,
  Inline,
  NumberField,
  Select,
  Stack,
  TextField,
} from '@arshad-shah/cynosure';
import { plus, trash } from '@arshad-shah/cynosure/icons';
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
  /** Stable React key: removing a row never shifts another's inputs. */
  key: string;
  /** 1-based page where the range starts. */
  from: number;
  style: string;
  prefix: string;
  first: number;
}

const toRows = (ranges: readonly PageLabelRange[] | null): Row[] =>
  ranges?.length
    ? ranges.map((r) => ({
        key: newId(),
        from: r.start + 1,
        style: r.style ?? 'none',
        prefix: r.prefix ?? '',
        first: r.first ?? 1,
      }))
    : [{ key: newId(), from: 1, style: 'D', prefix: '', first: 1 }];

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
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Page labels"
      description="Each range numbers pages from its first page until the next range."
      actions={
        <>
          <Button variant="ghost" onClick={() => apply([])}>
            Remove labels
          </Button>
          <Button variant="solid" tone="accent" onClick={() => apply(ranges())}>
            Save labels
          </Button>
        </>
      }
    >
      <Stack gap="4">
        {rows.map((r, i) => (
          <Card
            key={r.key}
            as="section"
            variant="outline"
            padding="md"
            title={`Range ${i + 1}`}
            headingLevel={3}
            aria-label={`Range ${i + 1}`}
            actions={
              <IconButton
                variant="ghost"
                size="sm"
                label={`Remove range ${i + 1}`}
                icon={trash}
                disabled={rows.length === 1}
                onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
              />
            }
          >
            <Inline gap="3" wrap align="end">
              <NumberField
                label="From page"
                value={r.from}
                min={1}
                max={count}
                onChange={(from) => from !== null && patch(i, { from })}
              />
              <Select
                label="Style"
                value={r.style}
                options={STYLES}
                onChange={(style) => patch(i, { style })}
              />
              <TextField
                label="Prefix"
                width="sm"
                value={r.prefix}
                onChange={(prefix) => patch(i, { prefix })}
              />
              <NumberField
                label="Start at"
                value={r.first}
                min={1}
                onChange={(first) => first !== null && patch(i, { first })}
              />
            </Inline>
          </Card>
        ))}
        <Inline>
          <Button
            variant="outline"
            size="sm"
            icon={plus}
            onClick={() =>
              setRows((rs) => [
                ...rs,
                {
                  key: newId(),
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
        </Inline>
      </Stack>
    </Dialog>
  );
}
