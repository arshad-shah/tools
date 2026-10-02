import { PageRail, type RailPage } from '@/shared/ui';
import type { PageId } from '@/pdf/doc/types';
import { deletePages } from './modes/organize/actions';
import type { ModeModule, ModeProps } from './modes/types';
import { displaySize } from './page-display';
import { PageImage } from './PageImage';
import type { SourceDocs } from './source-docs';

export interface PageRailPanelProps {
  mode: ModeProps;
  module: ModeModule | null;
  sourceDocs: SourceDocs;
  current: PageId | null;
  width: number;
  onActivate(id: PageId): void;
  onCurrent(id: PageId): void;
}

/**
 * Page thumbnails (spec §6.1): select (Shift for a range, Ctrl or Cmd to
 * toggle), Enter to show a page, Alt+ArrowUp/Down or drag to move pages,
 * Delete to remove them. Thumbnails render at rail priority.
 */
export function PageRailPanel({
  mode,
  module,
  sourceDocs,
  current,
  width,
  onActivate,
  onCurrent,
}: PageRailPanelProps) {
  const { doc, selection } = mode;
  const { view, state } = doc;
  const Badge = module?.RailBadge;
  const pages: RailPage[] = view.pages.map((p, i) => {
    const size = displaySize(p, state.sources);
    return { id: p.id, label: String(i + 1), aspect: size.width / size.height };
  });
  const byId = new Map(view.pages.map((p, i) => [p.id, { page: p, i }]));
  return (
    <PageRail
      label="Pages"
      pages={pages}
      selected={selection.pages}
      current={current}
      width={width}
      onSelect={(id, mods) => {
        selection.selectPages(
          [id],
          mods.shift ? 'range' : mods.meta ? 'toggle' : 'replace',
        );
        onCurrent(id);
      }}
      onActivate={onActivate}
      onMove={(ids, to) =>
        doc.dispatch({ type: 'page.reorder', params: { pageIds: ids, to } })
      }
      onDelete={(ids) => deletePages(mode, ids)}
      renderThumb={(rail, thumbWidth) => {
        const entry = byId.get(rail.id);
        if (!entry) return null;
        const { page, i } = entry;
        const handle = page.blank ? null : sourceDocs.get(page.source);
        const size = displaySize(page, state.sources);
        return (
          <PageImage
            page={page}
            sources={state.sources}
            docId={handle?.docId ?? null}
            error={handle?.error?.message ?? null}
            scale={thumbWidth / size.width}
            visible
            priority={1}
            label={`Page ${i + 1} thumbnail`}
          />
        );
      }}
      renderBadge={
        Badge
          ? (rail) => {
              const entry = byId.get(rail.id);
              return entry ? <Badge page={entry.page} doc={doc} /> : null;
            }
          : undefined
      }
    />
  );
}
