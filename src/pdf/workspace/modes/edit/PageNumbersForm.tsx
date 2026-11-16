import { useState } from 'react';
import {
  Button,
  Inline,
  NumberField,
  Select,
  Stack,
} from '@arshad-shah/cynosure';
import {
  EDGE_ANCHOR_OPTIONS,
  trySelectPages,
  type EdgeAnchor,
} from '@/pdf/edit/geometry';
import type { PageNumberFormat } from '@/pdf/edit/markup-layout';
import { PageRangeField } from '../../ui/PageRangeField';
import type { ModeProps } from '../types';
import { activeMarkup } from './markup-state';
import {
  activeMarkupId,
  applyMarkup,
  removeMarkup,
  selectionOf,
} from './form-helpers';

const TYPE = 'markup.pageNumbers';
const FORMATS: { value: PageNumberFormat; label: string }[] = [
  { value: 'n', label: '1, 2, 3' },
  { value: 'n-of-total', label: '1 / 10' },
  { value: 'page-n', label: 'Page 1' },
];

/** The old Page numbers tool's fields, applied as a workspace operation. */
export function PageNumbersForm({ doc }: ModeProps) {
  const current = activeMarkup(doc).pageNumbers;
  const [format, setFormat] = useState<PageNumberFormat>(
    current?.format ?? 'n',
  );
  const [position, setPosition] = useState<EdgeAnchor>(
    current?.position ?? 'bottom-center',
  );
  const [startAt, setStartAt] = useState(current?.startAt ?? 1);
  const [fontSize, setFontSize] = useState(current?.fontSize ?? 10);
  const [pageMode, setPageMode] = useState<'all' | 'ranges'>(
    current?.pages.mode ?? 'all',
  );
  const [ranges, setRanges] = useState(
    current?.pages.mode === 'ranges' ? current.pages.text : '',
  );
  const pages = selectionOf(pageMode, ranges);
  const { error } = trySelectPages(pages, doc.view.pages.length);
  return (
    <Stack gap="3">
      <Select
        label="Format"
        size="sm"
        value={format}
        onChange={(v) => setFormat(v as PageNumberFormat)}
        options={FORMATS}
      />
      <Select
        label="Position"
        size="sm"
        value={position}
        onChange={(v) => setPosition(v as EdgeAnchor)}
        options={EDGE_ANCHOR_OPTIONS}
      />
      <NumberField
        label="Start at"
        size="sm"
        value={startAt}
        onChange={(v) => v !== null && setStartAt(v)}
        min={0}
        max={9999}
      />
      <NumberField
        label="Font size"
        size="sm"
        value={fontSize}
        onChange={(v) => v !== null && setFontSize(v)}
        min={6}
        max={72}
      />
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
          disabled={!!error}
          onClick={() =>
            applyMarkup(doc, TYPE, {
              format,
              position,
              startAt,
              fontSize,
              margin: 24,
              pages,
            })
          }
        >
          {current ? 'Update page numbers' : 'Add page numbers'}
        </Button>
        {activeMarkupId(doc, TYPE) ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeMarkup(doc, TYPE)}
          >
            Remove page numbers
          </Button>
        ) : null}
      </Inline>
    </Stack>
  );
}
