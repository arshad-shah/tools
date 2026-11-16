import {
  Button,
  Card,
  CompareSlider,
  Image,
  Select,
  Stack,
} from '@arshad-shah/cynosure';
import { download } from '@arshad-shah/cynosure/icons';
import { useEffect, useMemo } from 'react';
import { useObjectUrl } from '@/shared/lib/object-url';
import type { BatchEntry } from '../useBatch';

export interface ComparePanelProps {
  /** Finished entries that can be compared. */
  entries: readonly BatchEntry[];
  selected: BatchEntry;
  onSelect(id: string): void;
  onDownload(entry: BatchEntry): void;
}

/** An object URL of a picked file, revoked when it changes. */
function useFileUrl(file: File): string {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return url;
}

/** Before and after for one file, with its own download. */
export function ComparePanel({
  entries,
  selected,
  onSelect,
  onDownload,
}: ComparePanelProps) {
  const { row, result, file } = selected;
  const before = useFileUrl(file);
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
          <CompareSlider
            key={row.id}
            before={
              <Image src={before} alt={`${row.name}, original`} fit="contain" />
            }
            after={
              <Image
                src={after}
                alt={`${row.name}, compressed`}
                fit="contain"
              />
            }
            labels={{ before: 'Original', after: 'Compressed' }}
          />
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
