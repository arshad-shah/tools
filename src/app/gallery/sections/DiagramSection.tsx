import { useState } from 'react';
import type { Diagram } from '@/shared/diagram';
import { DiagramCanvas, Text } from '@/shared/ui';
import { Section } from '../Section';

/** A small document as typed record cards: every row kind, a link chip, a more row. */
const SAMPLE: Diagram = {
  nodes: [
    {
      id: '$',
      eyebrow: 'object',
      title: '$',
      rows: [
        { key: 'name', value: 'Ada Lovelace', kind: 'string' },
        { key: 'born', value: '1815', kind: 'number' },
        { key: 'active', value: 'true', kind: 'boolean' },
        { key: 'spouse', value: 'null', kind: 'null' },
        { key: 'notes', value: '3', kind: 'array', role: 'link' },
        { key: 'address', value: '2', kind: 'object', role: 'link' },
      ],
    },
    {
      id: '$.notes',
      eyebrow: 'array[3]',
      title: '$.notes',
      rows: [
        { key: '0', value: 'Note A', kind: 'string' },
        { key: '1', value: 'Note G', kind: 'string' },
        { key: '+1 more', value: '', kind: 'more' },
      ],
    },
    {
      id: '$.address',
      eyebrow: 'object',
      title: '$.address',
      badge: '2',
      rows: [
        { key: 'city', value: 'London', kind: 'string' },
        { key: 'street', value: 'St James Square', kind: 'string' },
      ],
    },
  ],
  edges: [
    { id: 'notes', from: '$.notes', to: '$', toRow: 4 },
    { id: 'address', from: '$.address', to: '$', toRow: 5, style: 'dashed' },
  ],
};

/** DiagramCanvas with its controls and minimap. */
export function DiagramSection() {
  const [selected, setSelected] = useState<string | null>('$.address');
  return (
    <Section name="diagram" title="Diagram">
      <div className="h-96 overflow-hidden rounded-lg shadow-e1">
        <DiagramCanvas
          diagram={SAMPLE}
          selectedId={selected}
          onSelect={(id) => setSelected(id)}
          ariaLabel="Sample document map"
          ariaSummary="Map of 3 objects, 2 levels deep."
        />
      </div>
      <Text size="xs" tone="subtle" mono>
        selected: {selected ?? 'none'}
      </Text>
    </Section>
  );
}
