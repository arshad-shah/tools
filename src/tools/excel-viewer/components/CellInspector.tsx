import {
  Badge,
  Card,
  DescriptionList,
  Inline,
  Text,
  type DescriptionItem,
} from '@arshad-shah/cynosure';
import { cellAddress, inRange, rangeAddress, type CellPos } from '../lib/refs';
import type { Sheet } from '../lib/sheet';
import type { Styles } from '../lib/styles';

const TYPE_LABEL = {
  string: 'Text',
  number: 'Number',
  boolean: 'Boolean',
  date: 'Date',
  error: 'Error',
} as const;

interface CellInspectorProps {
  sheet: Sheet;
  pos: CellPos | null;
  formatOf: Styles['formatOf'];
}

/** The selected cell: address, type, value, stored value and formula. */
export function CellInspector({ sheet, pos, formatOf }: CellInspectorProps) {
  if (!pos)
    return (
      <Card as="section" title="Cell" headingLevel={3} padding="sm">
        <Text size="sm" tone="muted">
          Select a cell to see its value, type and formula.
        </Text>
      </Card>
    );
  const cell = sheet.rows[pos.row]?.[pos.col];
  const merge = sheet.merges.find((m) => inRange(m, pos));
  const items: DescriptionItem[] = [];
  if (cell) {
    items.push({ term: 'Value', detail: cell.text || 'Empty text' });
    if (cell.formula)
      items.push({
        term: 'Formula',
        detail: <Text variant="code" size="sm">{`=${cell.formula}`}</Text>,
      });
    if (cell.sharedFrom)
      items.push({ term: 'Shared from', detail: cell.sharedFrom });
    items.push({
      term: 'Stored',
      detail: (
        <Text variant="code" size="sm">
          {cell.raw === '' ? 'Nothing' : cell.raw}
        </Text>
      ),
    });
    if (cell.style !== undefined)
      items.push({ term: 'Number format', detail: formatOf(cell.style) });
  }
  if (merge)
    items.push({
      term: 'Merged',
      detail:
        merge.start.row === pos.row && merge.start.col === pos.col
          ? `Spans ${rangeAddress(merge)}`
          : `Part of ${rangeAddress(merge)}; the value is in ${cellAddress(merge.start)}`,
    });
  return (
    <Card
      as="section"
      title={`Cell ${cellAddress(pos)}`}
      headingLevel={3}
      padding="sm"
      actions={
        <Inline gap="1">
          <Badge
            size="sm"
            variant="soft"
            tone={cell?.type === 'error' ? 'danger' : 'accent'}
          >
            {cell ? TYPE_LABEL[cell.type] : 'Empty'}
          </Badge>
          {cell?.formula ? (
            <Badge size="sm" variant="outline">
              Formula
            </Badge>
          ) : null}
        </Inline>
      }
    >
      {items.length ? (
        <DescriptionList items={items} size="sm" layout="inline" />
      ) : (
        <Text size="sm" tone="muted">
          This cell is empty.
        </Text>
      )}
    </Card>
  );
}
