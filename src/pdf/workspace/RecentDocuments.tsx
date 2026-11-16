import {
  IconButton,
  IconTile,
  Heading,
  Image,
  ListRow,
  ListRows,
  Stack,
} from '@arshad-shah/cynosure';
import { fileText, trash } from '@arshad-shah/cynosure/icons';
import { useEffect, useMemo } from 'react';
import type { RecentDocument } from '@/pdf/doc/recent';
import { relativeTime } from './relative-time';

export interface RecentDocumentsProps {
  docs: RecentDocument[];
  onOpen(id: string): void;
  onRemove(id: string): void;
  headingLevel?: 2 | 3;
}

/** The first page saved with the document, or a file icon. */
function Thumb({ blob }: { blob?: Blob | null }) {
  const src = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => void (src && URL.revokeObjectURL(src)), [src]);
  if (!blob || !src)
    return <IconTile icon={fileText} size="sm" tone="neutral" />;
  return (
    <Image src={src} alt="" width={36} ratio={3 / 4} fit="cover" radius="sm" />
  );
}

/** Autosaved documents with thumbnail, page count and age (spec §5.2). */
export function RecentDocuments({
  docs,
  onOpen,
  onRemove,
  headingLevel = 2,
}: RecentDocumentsProps) {
  if (docs.length === 0) return null;
  return (
    <Stack as="section" gap="3" aria-labelledby="recent-documents">
      <Heading id="recent-documents" level={headingLevel} size="md">
        Recent documents
      </Heading>
      <ListRows label="Recent documents" divided>
        {docs.map((d) => (
          <ListRow
            key={d.id}
            label={d.name}
            description={
              d.restorable
                ? `${d.pageCount} ${d.pageCount === 1 ? 'page' : 'pages'}, edited ${relativeTime(d.updatedAt)}`
                : "Can't be restored by this version"
            }
            dimmed={!d.restorable}
            leading={<Thumb blob={d.thumb} />}
            onClick={d.restorable ? () => onOpen(d.id) : undefined}
            actions={
              <IconButton
                variant="ghost"
                size="sm"
                tone={d.restorable ? 'neutral' : 'danger'}
                label={
                  d.restorable
                    ? `Remove ${d.name} from this device`
                    : `Delete ${d.name}`
                }
                icon={trash}
                onClick={() => onRemove(d.id)}
              />
            }
          />
        ))}
      </ListRows>
    </Stack>
  );
}
