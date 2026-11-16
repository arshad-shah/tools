import {
  Button,
  Card,
  CompareSlider,
  Grid,
  Image,
  Select,
  Stack,
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
  const before = useBlobUrl(file);
  const after = useObjectUrl(
    result?.bytes ?? null,
    result?.mime ?? 'image/png',
  );
  if (!result) return null;
  // Both sides at the original's shape, so the divider compares like for like.
  const ratio =
    row.before.width && row.before.height
      ? row.before.width / row.before.height
      : undefined;
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
              <Grid columns="1fr">
                <Image
                  src={before}
                  alt={`${row.name}, original`}
                  ratio={ratio}
                  fit="contain"
                />
              </Grid>
            }
            after={
              <Grid columns="1fr">
                <Image
                  src={after}
                  alt={`${row.name}, compressed`}
                  ratio={ratio}
                  fit="contain"
                />
              </Grid>
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
