import { useState } from 'react';
import {
  Button,
  Card,
  CompareSlider,
  Select,
  Stack,
  ZoomControls,
  type ZoomSetting,
} from '@arshad-shah/cynosure';
import { download } from '@arshad-shah/cynosure/icons';
import { useBlobUrl, useObjectUrl } from '@/shared/lib/object-url';
import type { BatchEntry } from '../useBatch';

export interface ComparePanelProps {
  /** Finished entries that can be compared. */
  entries: readonly BatchEntry[];
  selected: BatchEntry;
  onSelect(id: string): void;
  onDownload(entry: BatchEntry): void;
}

/** Before and after for one file, with its own download. */
export function ComparePanel({
  entries,
  selected,
  onSelect,
  onDownload,
}: ComparePanelProps) {
  const { row, result, file } = selected;
  // Fit the frame by default; 100% is the picture's actual size (gap 16).
  const [zoom, setZoom] = useState<ZoomSetting>({ kind: 'fit-page' });
  const [scale, setScale] = useState(1);
  const before = useBlobUrl(file);
  const after = useObjectUrl(
    result?.bytes ?? null,
    result?.mime ?? 'image/png',
  );
  if (!result) return null;
  return (
    <Card as="section" title="Compare" headingLevel={2}>
      <Stack gap="5">
        <Select
          label="File"
          value={row.id}
          onChange={onSelect}
          options={entries.map((e) => ({ value: e.row.id, label: e.row.name }))}
        />
        {before && after ? (
          <Stack gap="3">
            <ZoomControls
              size="sm"
              zoom={zoom}
              percent={Math.round(scale * 100)}
              onZoomChange={setZoom}
              labels={{ group: 'Compare zoom' }}
            />
            <CompareSlider
              key={row.id}
              beforeSrc={before}
              beforeAlt={`${row.name}, original`}
              afterSrc={after}
              afterAlt={`${row.name}, compressed`}
              zoom={zoom}
              onZoomChange={setZoom}
              onScaleChange={setScale}
              zoomable
              labels={{ before: 'Original', after: 'Compressed' }}
            />
          </Stack>
        ) : null}
        <Button
          variant="soft"
          icon={download}
          onClick={() => onDownload(selected)}
        >
          Download this file
        </Button>
      </Stack>
    </Card>
  );
}
