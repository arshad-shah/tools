import { IconFileText, IconTrash } from '@/shared/ui/icons';
import { Button, IconButton, Image, MetaList } from '@/shared/ui';
import type { RecentDocument } from '@/pdf/doc/recent';
import { relativeTime } from './relative-time';

export interface RecentDocumentsProps {
  docs: RecentDocument[];
  onOpen(id: string): void;
  onRemove(id: string): void;
  headingLevel?: 2 | 3;
}

/** Autosaved documents with thumbnail, size and age (spec §5.2, §13.3). */
export function RecentDocuments({
  docs,
  onOpen,
  onRemove,
  headingLevel = 2,
}: RecentDocumentsProps) {
  if (docs.length === 0) return null;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section aria-labelledby="recent-documents" className="flex flex-col gap-3">
      <Heading id="recent-documents" className="text-lg font-semibold text-fg">
        Recent documents
      </Heading>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
        {docs.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-3 rounded-lg bg-surface p-3 shadow-e1"
          >
            <span className="flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface-2 text-fg-subtle">
              {d.thumb ? (
                <Image
                  src={d.thumb}
                  decorative
                  fit="cover"
                  className="size-full"
                />
              ) : (
                <IconFileText size="lg" />
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {d.restorable ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto min-w-0 justify-start truncate px-0 text-left font-medium text-fg hover:underline"
                  onClick={() => onOpen(d.id)}
                >
                  {d.name}
                </Button>
              ) : (
                <span className="truncate text-sm font-medium text-fg">
                  {d.name}
                </span>
              )}
              <MetaList
                items={
                  d.restorable
                    ? [
                        `${d.pageCount} ${d.pageCount === 1 ? 'page' : 'pages'}`,
                        <span key="age" data-dynamic>
                          edited {relativeTime(d.updatedAt)}
                        </span>,
                      ]
                    : ["Can't be restored by this version"]
                }
              />
            </div>
            <IconButton
              variant="ghost"
              size="sm"
              tone={d.restorable ? undefined : 'danger'}
              label={
                d.restorable
                  ? `Remove ${d.name} from this device`
                  : `Delete ${d.name}`
              }
              icon={IconTrash}
              onClick={() => onRemove(d.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
