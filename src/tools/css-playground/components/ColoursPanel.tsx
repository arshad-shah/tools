import {
  ColorSwatches,
  CopyButton,
  EmptyState,
  Stack,
  Table,
  Text,
} from '@arshad-shah/cynosure';
import { useState } from 'react';

export interface ColourUse {
  value: string;
  count: number;
}

/** Every colour the stylesheet writes, as swatches and with its uses. */
export function ColoursPanel({ colours }: { colours: ColourUse[] }) {
  const [chosen, setChosen] = useState<string | undefined>();
  if (colours.length === 0)
    return (
      <EmptyState
        size="sm"
        title="No colours"
        description="Hex values, colour functions and colour names show up here."
      />
    );
  return (
    <Stack gap="4">
      <ColorSwatches
        label="Colours in this stylesheet"
        swatches={colours.map((c) => ({
          value: c.value,
          label: `${c.value}, used ${c.count} ${c.count === 1 ? 'time' : 'times'}`,
        }))}
        value={chosen}
        onChange={setChosen}
      />
      <Table
        caption="Colours"
        captionHidden
        size="sm"
        stickyHeader
        getRowId={(c) => c.value}
        rows={colours}
        columns={[
          {
            key: 'value',
            header: 'Colour',
            rowHeader: true,
            cell: (c) => (
              <Text variant="code" wrap="break">
                {c.value}
              </Text>
            ),
          },
          {
            key: 'count',
            header: 'Uses',
            align: 'end',
            cell: (c) => String(c.count),
          },
          {
            key: 'copy',
            header: 'Copy',
            align: 'end',
            cell: (c) => (
              <CopyButton
                size="sm"
                variant="ghost"
                value={c.value}
                labels={{ copy: `Copy ${c.value}` }}
              />
            ),
          },
        ]}
      />
      <Text size="sm" tone="muted">
        {`${colours.length} distinct ${colours.length === 1 ? 'colour' : 'colours'}. Many near-identical values are a sign the palette could move into custom properties.`}
      </Text>
    </Stack>
  );
}
