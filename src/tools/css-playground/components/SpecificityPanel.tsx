import { Badge, Stack, Table, Text } from '@arshad-shah/cynosure';
import type { SelectorInfo } from '../lib/types';

const score = (s: SelectorInfo['specificity']) =>
  s[0] * 1_000_000 + s[1] * 1_000 + s[2];

const tone = (s: SelectorInfo['specificity']) =>
  s[0] > 0 ? 'danger' : s[1] >= 4 ? 'warning' : 'neutral';

/** Every selector with its specificity (the most specific wins a tie). */
export function SpecificityPanel({ selectors }: { selectors: SelectorInfo[] }) {
  const rows = selectors.map((s, i) => ({ ...s, id: String(i) }));
  return (
    <Stack gap="3">
      <Text size="sm" tone="muted">
        Specificity is counted as IDs, then classes, attributes and
        pseudo-classes, then elements and pseudo-elements. When two rules set
        the same property, the higher one wins; on a tie, the later one does.
      </Text>
      <Table
        caption="Selectors by specificity"
        captionHidden
        size="sm"
        stickyHeader
        getRowId={(s) => s.id}
        rows={rows}
        defaultSort={{ key: 'specificity', direction: 'descending' }}
        labels={{ empty: 'No selectors yet' }}
        columns={[
          {
            key: 'selector',
            header: 'Selector',
            rowHeader: true,
            sortable: true,
            sortValue: (s) => s.selector,
            cell: (s) => (
              <Text variant="code" wrap="break">
                {s.selector}
              </Text>
            ),
          },
          {
            key: 'specificity',
            header: 'Specificity',
            sortable: true,
            sortValue: (s) => score(s.specificity),
            cell: (s) => (
              <Badge size="sm" tone={tone(s.specificity)}>
                {s.specificity.join(', ')}
              </Badge>
            ),
          },
          {
            key: 'context',
            header: 'Inside',
            cell: (s) => (
              <Text size="sm" tone="muted" wrap="break">
                {s.context || 'Top level'}
              </Text>
            ),
          },
          {
            key: 'line',
            header: 'Line',
            align: 'end',
            sortable: true,
            sortValue: (s) => s.line ?? 0,
            cell: (s) => (s.line ? String(s.line) : ''),
          },
        ]}
      />
    </Stack>
  );
}
