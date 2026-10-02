import React, { useState } from 'react';
import { IconDownload } from '@/shared/ui/icons';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CompareSlider,
  Inline,
  Label,
  SegmentedControl,
  Select,
  Stack,
  type SegmentedOption,
} from '@/shared/ui';
import type { BatchEntry } from '../useBatch';

export interface ComparePanelProps {
  /** Finished entries that can be compared. */
  entries: readonly BatchEntry[];
  selected: BatchEntry;
  onSelect(id: string): void;
  onDownload(entry: BatchEntry): void;
}

type Zoom = 'fit' | '1:1';

const ZOOM_OPTIONS: SegmentedOption<Zoom>[] = [
  { value: 'fit', label: 'Fit' },
  { value: '1:1', label: 'Actual size' },
];

/** Before and after for one file, with its own download. */
export const ComparePanel: React.FC<ComparePanelProps> = ({
  entries,
  selected,
  onSelect,
  onDownload,
}) => {
  const [zoom, setZoom] = useState<Zoom>('fit');
  const { row, result } = selected;
  if (!result) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Compare</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack gap="3">
          <Inline gap="3" align="end" wrap justify="between">
            <Stack gap="1">
              <Label htmlFor="image-compare-file">File</Label>
              <Select
                id="image-compare-file"
                value={row.id}
                onValueChange={onSelect}
                items={entries.map((e) => ({
                  value: e.row.id,
                  label: e.row.name,
                }))}
              />
            </Stack>
            <SegmentedControl<Zoom>
              label="Zoom"
              size="sm"
              value={zoom}
              onChange={(v) => setZoom(v)}
              options={ZOOM_OPTIONS}
            />
          </Inline>
          <CompareSlider
            key={row.id}
            before={{ src: selected.file }}
            after={{ src: result.bytes, mime: result.mime }}
            labels={['Original', 'Compressed']}
            zoom={zoom}
            label={`Compare ${row.name}`}
          />
          <Inline gap="2">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<IconDownload size="sm" />}
              onClick={() => onDownload(selected)}
            >
              Download this file
            </Button>
          </Inline>
        </Stack>
      </CardBody>
    </Card>
  );
};
