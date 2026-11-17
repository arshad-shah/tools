import { ColorField } from './ColorField';
import { useState } from 'react';
import {
  Button,
  Grid,
  Inline,
  NumberField,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { trySelectPages } from '@/pdf/edit/geometry';
import type { Slots } from '@/pdf/doc/ops/markup';
import { PageRangeField } from '../../ui/PageRangeField';
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
      {ALIGN.map(([key, word]) => (
        <TextField
          key={key}
          label={`${name} ${word}`}
          size="sm"
          value={value[key]}
          maxLength={200}
          onChange={(v) => onChange({ ...value, [key]: v })}
        />
      ))}
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
      <Text as="p" size="sm" tone="muted">
        {'Use {n}, {total}, {date} and {filename}'}
      </Text>
      <SlotFields name="Header" value={header} onChange={setHeader} />
      <SlotFields name="Footer" value={footer} onChange={setFooter} />
      <Grid columns={3} gap="2">
        {(['top', 'bottom', 'side'] as const).map((k) => (
          <NumberField
            key={k}
            label={`${k[0].toUpperCase()}${k.slice(1)} margin`}
            size="sm"
            value={margin[k]}
            onChange={(v) => v !== null && setMargin({ ...margin, [k]: v })}
            min={0}
            max={500}
          />
        ))}
      </Grid>
      <NumberField
        label="Font size"
        size="sm"
        value={fontSize}
        onChange={(v) => v !== null && setFontSize(v)}
        min={4}
        max={72}
      />
      <ColorField label="Colour" value={color} onChange={setColor} />
      <PageRangeField
        mode={pageMode}
        text={ranges}
        onModeChange={setPageMode}
        onTextChange={setRanges}
        error={error}
      />
      <Inline gap="2" wrap>
        <Button
          variant="solid"
          tone="accent"
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
            variant="ghost"
            size="sm"
            onClick={() => removeMarkup(doc, TYPE)}
          >
            Remove header and footer
          </Button>
        ) : null}
      </Inline>
    </Stack>
  );
}
