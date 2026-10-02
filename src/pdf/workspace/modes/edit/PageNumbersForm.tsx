import { useState } from 'react';
import { Button, Label, NumberInput, Select, Stack } from '@/shared/ui';
import {
  EDGE_ANCHOR_OPTIONS,
  trySelectPages,
  type EdgeAnchor,
} from '@/pdf/edit/geometry';
import type { PageNumberFormat } from '@/pdf/edit/markup-layout';
import { PageRangeField } from '@/pdf/components/PageRangeField';
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
      <Stack gap="1">
        <Label htmlFor="pn-format">Format</Label>
        <Select
          id="pn-format"
          value={format}
          onValueChange={(v) => setFormat(v as PageNumberFormat)}
          items={FORMATS}
        />
      </Stack>
      <Stack gap="1">
        <Label htmlFor="pn-position">Position</Label>
        <Select
          id="pn-position"
          value={position}
          onValueChange={(v) => setPosition(v as EdgeAnchor)}
          items={EDGE_ANCHOR_OPTIONS}
        />
      </Stack>
      <Stack gap="1">
        <Label htmlFor="pn-start">Start at</Label>
        <NumberInput
          id="pn-start"
          value={startAt}
          onValueChange={setStartAt}
          min={0}
          max={9999}
        />
      </Stack>
      <Stack gap="1">
        <Label htmlFor="pn-size">Font size</Label>
        <NumberInput
          id="pn-size"
          value={fontSize}
          onValueChange={setFontSize}
          min={6}
          max={72}
        />
      </Stack>
      <PageRangeField
        id="pn"
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
            variant="secondary"
            size="sm"
            onClick={() => removeMarkup(doc, TYPE)}
          >
            Remove page numbers
          </Button>
        ) : null}
      </div>
    </Stack>
  );
}
