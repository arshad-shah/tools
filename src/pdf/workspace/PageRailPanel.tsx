import {
  Inline,
  Stack,
  Text,
  VirtualList,
  type VirtualListHandle,
} from '@arshad-shah/cynosure';
import { useEffect, useRef } from 'react';
import type { PageId, PageRef } from '@/pdf/doc/types';
import { PageImage } from '@/shared/surfaces/pdf/PageImage';
import { deletePages } from './modes/organize/actions';
import type { ModeModule, ModeProps } from './modes/types';
import { displaySize } from './page-display';
import type { SourceDocs } from './source-docs';

export interface PageRailPanelProps {
  mode: ModeProps;
  module: ModeModule | null;
  sourceDocs: SourceDocs;
  current: PageId | null;
  width: number;
  /** The list's height: the rail's column, or a share of a phone sheet. */
  height?: string;
  onActivate(id: PageId): void;
  onCurrent(id: PageId): void;
}

/** Space the row keeps around a thumbnail, px. */
const ROW_PADDING = 32;

/**
 * Which keys were held at the last press, and what pressed: VirtualList
 * reports only the new selection, so a plain click (replace), Shift
 * (range) and Ctrl or Cmd (toggle) are told apart from the press itself.
 */
function usePressNote() {
  const note = useRef({ shift: false, toggle: false, via: 'key' as string });
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      note.current = {
        shift: e.shiftKey,
        toggle: e.ctrlKey || e.metaKey,
        via: e.pointerType || 'mouse',
      };
    };
    const onKey = (e: KeyboardEvent) => {
      note.current = { shift: e.shiftKey, toggle: false, via: 'key' };
    };
    window.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, []);
  return note;
}

/**
 * Page thumbnails as a multi-select listbox (Cynosure VirtualList): click
 * to select and show a page (Shift for a range, Ctrl or Cmd to toggle),
 * Enter or a double-click to go to it, Alt+ArrowUp/Down or a drag to move
 * pages, Delete to remove them. Thumbnails render at rail priority.
 */
export function PageRailPanel({
  mode,
  module,
  sourceDocs,
  current,
  width,
  height = '100%',
  onActivate,
  onCurrent,
}: PageRailPanelProps) {
  const { doc, selection } = mode;
  const { view, state } = doc;
  const Badge = module?.RailBadge;
  const press = usePressNote();
  const list = useRef<VirtualListHandle>(null);
  const box = useRef<HTMLElement>(null);
  const thumbWidth = Math.max(48, width - ROW_PADDING);
  const index = new Map(view.pages.map((p, i) => [p.id, i]));

  // The current page stays in view as the document scrolls.
  const at = current ? (index.get(current) ?? -1) : -1;
  useEffect(() => {
    if (at >= 0) list.current?.scrollToIndex(at);
  }, [at]);

  // Delete and Backspace remove the selected pages (or the focused one).
  const latest = useRef({ mode, selected: selection.pages });
  useEffect(() => {
    latest.current = { mode, selected: selection.pages };
  });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const row = (e.target as HTMLElement).closest('[role="option"]');
      if (!row) return;
      e.preventDefault();
      const { mode: m, selected } = latest.current;
      const focused = m.doc.view.pages[Number(row.getAttribute('data-index'))];
      const ids = m.doc.view.pages
        .map((p) => p.id)
        .filter((id) => selected.has(id));
      deletePages(m, ids.length ? ids : focused ? [focused.id] : []);
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, []);

  const select = (keys: string[]) => {
    const before = selection.pages;
    const added = keys.filter((k) => !before.has(k));
    const removed = [...before].filter((k) => !keys.includes(k));
    const n = press.current;
    if (n.via === 'key') {
      selection.selectPages(keys, 'replace');
      return;
    }
    const clicked = added[0] ?? removed[0];
    if (!clicked) return;
    selection.selectPages(
      [clicked],
      n.shift ? 'range' : n.toggle ? 'toggle' : 'replace',
    );
    onCurrent(clicked);
    // A tap on a phone goes to the page.
    if (n.via === 'touch') onActivate(clicked);
  };

  const thumb = (page: PageRef, i: number) => {
    const handle = page.blank ? null : sourceDocs.get(page.source);
    const size = displaySize(page, state.sources);
    const isCurrent = page.id === current;
    return (
      <Stack gap="1" align="center" paddingBlock="2" grow>
        <PageImage
          page={page}
          sources={state.sources}
          docId={handle?.docId ?? null}
          error={handle?.error?.message ?? null}
          scale={thumbWidth / size.width}
          visible
          priority={1}
          label={`Page ${i + 1} of ${view.pages.length}`}
        />
        <Inline gap="2" align="center">
          <Text
            size="sm"
            numeric
            weight={isCurrent ? 'bold' : 'regular'}
            tone={isCurrent ? 'accent' : 'muted'}
          >
            {isCurrent ? `${i + 1} (current)` : String(i + 1)}
          </Text>
          {Badge ? <Badge page={page} doc={doc} /> : null}
        </Inline>
      </Stack>
    );
  };

  return (
    <Stack ref={box} fill minSize="0">
      <VirtualList
        label="Pages"
        items={view.pages}
        getKey={(p) => p.id}
        renderItem={(p, s) => thumb(p, s.index)}
        wrap
        handle={list}
        selectionMode="multiple"
        selected={view.pages
          .filter((p) => selection.pages.has(p.id))
          .map((p) => p.id)}
        onSelectionChange={select}
        onAction={(p) => onActivate(p.id)}
        onMove={(ids, to) =>
          doc.dispatch({ type: 'page.reorder', params: { pageIds: ids, to } })
        }
        labels={{
          moved: (count, position, total) =>
            count > 1
              ? `Moved ${count} pages to position ${position} of ${total}`
              : `Moved to position ${position} of ${total}`,
        }}
        style={{ blockSize: height }}
      />
    </Stack>
  );
}
