import { ColorField } from './ColorField';
import { useState } from 'react';
import { Button, Input, Label, NumberInput, Stack, Text } from '@/shared/ui';
import { trySelectPages } from '@/pdf/edit/geometry';
import type { Slots } from '@/pdf/doc/ops/markup';
import { PageRangeField } from '@/pdf/components/PageRangeField';
import type { ModeProps } from '../types';
import { activeMarkup } from './markup-state';
import {
  activeMarkupId,
  applyMarkup,
  removeMarkup,
  selectionOf,
} from './form-helpers';

const TYPE = 'markup.headerFooter';
const ALIGN = [
  ['left', 'left'],
  ['center', 'centre'],
  ['right', 'right'],
] as const;

function SlotFields({
  name,
  value,
  onChange,
}: {
  name: 'Header' | 'Footer';
  value: Slots;
  onChange(v: Slots): void;
}) {
  return (
    <Stack gap="2">
      {ALIGN.map(([key, word]) => {
        const id = `hf-${name.toLowerCase()}-${key}`;
        return (
          <Stack key={key} gap="1">
            <Label htmlFor={id}>{`${name} ${word}`}</Label>
            <Input
              id={id}
              value={value[key]}
              maxLength={200}
              onChange={(v) => onChange({ ...value, [key]: v })}
            />
          </Stack>
        );
      })}
    </Stack>
  );
}

/** Six slots with tokens, margins, size, colour and pages (spec §9.2). */
export function HeaderFooterForm({ doc }: ModeProps) {
  const current = activeMarkup(doc).headerFooter;
  const empty = { left: '', center: '', right: '' };
  const [header, setHeader] = useState<Slots>(current?.header ?? empty);
  const [footer, setFooter] = useState<Slots>(
    current?.footer ?? { ...empty, center: 'Page {n} of {total}' },
  );
  const [fontSize, setFontSize] = useState(current?.fontSize ?? 10);
  const [color, setColor] = useState(current?.color ?? '#374151');
  const [margin, setMargin] = useState(
    current?.margin ?? { top: 24, bottom: 24, side: 36 },
  );
  const [pageMode, setPageMode] = useState<'all' | 'ranges'>(
    current?.pages.mode ?? 'all',
  );
  const [ranges, setRanges] = useState(
    current?.pages.mode === 'ranges' ? current.pages.text : '',
  );
  const pages = selectionOf(pageMode, ranges);
  const { error } = trySelectPages(pages, doc.view.pages.length);
  const anything = [header, footer].some((s) => s.left || s.center || s.right);
  return (
    <Stack gap="3">
      <Text size="xs" tone="muted">
        Use {'{n}'}, {'{total}'}, {'{date}'} and {'{filename}'}
      </Text>
      <SlotFields name="Header" value={header} onChange={setHeader} />
      <SlotFields name="Footer" value={footer} onChange={setFooter} />
      <div className="grid grid-cols-3 gap-2">
        {(['top', 'bottom', 'side'] as const).map((k) => (
          <Stack key={k} gap="1">
            <Label
              htmlFor={`hf-margin-${k}`}
            >{`${k[0].toUpperCase()}${k.slice(1)} margin`}</Label>
            <NumberInput
              id={`hf-margin-${k}`}
              value={margin[k]}
              onValueChange={(v) => setMargin({ ...margin, [k]: v })}
              min={0}
              max={500}
            />
          </Stack>
        ))}
      </div>
      <Stack gap="1">
        <Label htmlFor="hf-size">Font size</Label>
        <NumberInput
          id="hf-size"
          value={fontSize}
          onValueChange={setFontSize}
          min={4}
          max={72}
        />
      </Stack>
      <ColorField label="Colour" value={color} onChange={setColor} />
      <PageRangeField
        id="hf"
        mode={pageMode}
        text={ranges}
        onModeChange={setPageMode}
        onTextChange={setRanges}
        error={error}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={!!error || !anything}
          onClick={() =>
            applyMarkup(doc, TYPE, {
              header,
              footer,
              fontSize,
              color,
              margin,
              pages,
              filename: doc.state.name,
              date: Date.now(),
            })
          }
        >
          {current ? 'Update header and footer' : 'Add header and footer'}
        </Button>
        {activeMarkupId(doc, TYPE) ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => removeMarkup(doc, TYPE)}
          >
            Remove header and footer
          </Button>
        ) : null}
      </div>
    </Stack>
  );
}
