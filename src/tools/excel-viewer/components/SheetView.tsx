import {
  Badge,
  Inline,
  Notice,
  SearchField,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { useDeferredValue, useMemo, useState } from 'react';
import { searchRows } from '../lib/export';
import { MAX_CELLS, MAX_COLUMNS, MAX_ROWS, type Sheet } from '../lib/sheet';
import type { CellPos } from '../lib/refs';
import { CellInspector } from './CellInspector';
import { SheetGrid } from './SheetGrid';

interface SheetViewProps {
  sheet: Sheet;
  name: string;
  hidden: boolean;
  formatOf(style: number): string;
}

const n = (v: number) => v.toLocaleString('en-US');
const count = (v: number, one: string) => `${n(v)} ${one}${v === 1 ? '' : 's'}`;

/** One sheet: search, counts, the cell inspector and the grid. */
export function SheetView({ sheet, name, hidden, formatOf }: SheetViewProps) {
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search.trim().toLowerCase());
  const [selected, setSelected] = useState<CellPos | null>(null);
  const indices = useMemo(() => searchRows(sheet, query), [sheet, query]);

  return (
    <Stack gap="3">
      <Inline gap="2" align="center" justify="between" wrap>
        <Inline gap="2" align="center" wrap>
          <Badge size="sm" variant="soft" tone="accent">
            {count(sheet.rowCount, 'row')}
          </Badge>
          <Badge size="sm" variant="soft" tone="accent">
            {count(sheet.colCount, 'column')}
          </Badge>
          <Badge size="sm" variant="soft" tone="neutral">
            {count(sheet.cellCount, 'cell')}
          </Badge>
          {sheet.merges.length ? (
            <Badge size="sm" variant="soft" tone="neutral">
              {`${count(sheet.merges.length, 'merged range')}`}
            </Badge>
          ) : null}
          {hidden ? (
            <Badge size="sm" variant="soft" tone="warning">
              Hidden sheet
            </Badge>
          ) : null}
        </Inline>
        <SearchField
          size="sm"
          label="Search cells"
          labelHidden
          placeholder="Search cells and formulas"
          value={search}
          onChange={setSearch}
        />
      </Inline>
      {sheet.skipped > 0 ? (
        <Notice tone="warning" title="Part of this sheet is not shown">
          {`${n(sheet.skipped)} cells lie past the first ${n(MAX_ROWS)} rows, ${n(MAX_COLUMNS)} columns or ${n(MAX_CELLS)} cells this viewer shows, and are left out of the grid and exports.`}
        </Notice>
      ) : null}
      <Inline aria-live="polite">
        {query ? (
          <Text size="sm" tone="muted">
            {`${n(indices.length)} of ${n(sheet.rowCount)} rows match`}
          </Text>
        ) : null}
      </Inline>
      <CellInspector sheet={sheet} pos={selected} formatOf={formatOf} />
      {sheet.rowCount === 0 ? (
        <Text tone="muted">This sheet is empty.</Text>
      ) : (
        <SheetGrid
          sheet={sheet}
          name={name}
          rowIndices={indices}
          selected={selected}
          onSelect={setSelected}
          query={query}
        />
      )}
    </Stack>
  );
}
