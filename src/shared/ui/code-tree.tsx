import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/shared/lib/cn';
import {
  branchOf,
  expandableSiblingIds,
  findPath,
  flattenVisible,
  indexOfId,
  isExpandable,
  typeAheadIndex,
  type FlatTreeRow,
  type TreeNodeData,
} from './code-tree-model';
import { CodeTreeRow, type CodeTreeRowStyle } from './code-tree-row';
import { isEditableTarget } from './virtual-list-keys';
import {
  VirtualList,
  type ScrollAlign,
  type VirtualListHandle,
  type VirtualRowProps,
} from './virtual-list';

export type { CodeTreeRowStyle } from './code-tree-row';

export interface CodeTreeHandle {
  /** Scrolls a visible node into view; false when it is not visible. */
  scrollToId(id: string, align?: ScrollAlign): boolean;
  /** Expands the ancestors of `id` and scrolls to it; false if not found. */
  expandTo(id: string): boolean;
  /** Moves keyboard focus to a visible node. */
  focusId(id: string): boolean;
}

export interface CodeTreeSearch {
  ids: ReadonlySet<string>;
  activeId?: string | null;
}

export interface CodeTreeProps {
  roots: readonly TreeNodeData[];
  /** Expanded node ids. Pass a new Set on every change. */
  expanded: ReadonlySet<string>;
  onExpandedChange(next: Set<string>): void;
  selectedId?: string | null;
  onSelect?(id: string): void;
  /** Moving focus with the keyboard also selects. Default false. */
  selectionFollowsFocus?: boolean;
  /** Matches get a highlight; `activeId` gets the current-match style. */
  search?: CodeTreeSearch;
  ariaLabel: string;
  /** Row height in px. Default 22. */
  rowHeight?: number;
  /** `code` renders `label: value,` with syntax colours; `plain` drops the punctuation. */
  rowStyle?: CodeTreeRowStyle;
  className?: string;
  height?: number | string;
  ref?: React.Ref<CodeTreeHandle>;
}

const TYPE_AHEAD_MS = 500;
const NO_COLUMNS: ReadonlySet<number> = new Set();

/**
 * Code-like foldable tree over `VirtualList` (a million visible rows stay
 * windowed). Rows read like code (`"key": value,`) with syntax colours, indent
 * guides, fold chevrons and summary chips on folded nodes. The ancestors of
 * the selection carry `data-active-branch` and an accent guide.
 *
 * Keyboard (WAI-ARIA tree): ArrowUp and ArrowDown, Home and End, PageUp and
 * PageDown move; ArrowRight expands, then moves to the first child; ArrowLeft
 * collapses, then moves to the parent; `*` expands all siblings; Enter and
 * Space select; typing letters jumps to the next matching label.
 *
 * State is controlled: pair `expanded` with `onExpandedChange` and the
 * pure helpers in `code-tree-model` (`expandAll`, `expandToDepth`,
 * `expandToIds`, `collapseAll`). Children are lazy and read on expand.
 */
export function CodeTree({
  roots,
  expanded,
  onExpandedChange,
  selectedId = null,
  onSelect,
  selectionFollowsFocus = false,
  search,
  ariaLabel,
  rowHeight = 22,
  rowStyle = 'code',
  className,
  height,
  ref,
}: CodeTreeProps) {
  const rows = useMemo(
    () => flattenVisible(roots, expanded),
    [roots, expanded],
  );
  const listRef = useRef<VirtualListHandle>(null);

  const selIndex = useMemo(
    () => indexOfId(rows, selectedId),
    [rows, selectedId],
  );

  // The active (roving) row is tracked by id; its last index is a lookup hint.
  const [active, setActive] = useState<{ id: string; at: number } | null>(null);
  const setActiveId = useCallback((id: string, at = -1) => {
    setActive((cur) => (cur?.id === id && cur.at === at ? cur : { id, at }));
  }, []);
  const found = useMemo(
    () => (active ? indexOfId(rows, active.id, active.at) : -1),
    [rows, active],
  );
  const activeIndex = found >= 0 ? found : Math.max(0, selIndex);

  const branch = useMemo(() => branchOf(rows, selIndex), [rows, selIndex]);
  const branchSet = useMemo(() => new Set(branch), [branch]);

  const live = useRef({ rows, expanded, activeIndex });
  useLayoutEffect(() => {
    live.current = { rows, expanded, activeIndex };
  });

  const setExpandedIds = useCallback(
    (ids: readonly string[], open: boolean) => {
      const cur = live.current.expanded;
      const next = new Set(cur);
      for (const id of ids) {
        if (open) next.add(id);
        else next.delete(id);
      }
      if (next.size !== cur.size) onExpandedChange(next);
    },
    [onExpandedChange],
  );

  const focusRow = useCallback(
    (index: number) => {
      const row = live.current.rows[index];
      if (!row) return;
      setActiveId(row.node.id, index);
      // focusIndex reports back through onActiveIndexChange (and selects
      // there when selection follows focus).
      listRef.current?.focusIndex(index);
    },
    [setActiveId],
  );

  const pendingScroll = useRef<string | null>(null);
  useEffect(() => {
    const id = pendingScroll.current;
    if (id === null) return;
    const i = indexOfId(rows, id);
    if (i < 0) return;
    pendingScroll.current = null;
    listRef.current?.scrollToIndex(i, 'center');
  }, [rows]);

  const scrollToId = useCallback((id: string, align?: ScrollAlign) => {
    const i = indexOfId(live.current.rows, id);
    if (i < 0) return false;
    listRef.current?.scrollToIndex(i, align);
    return true;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      scrollToId,
      focusId(id) {
        const i = indexOfId(live.current.rows, id);
        if (i < 0) return false;
        setActiveId(id, i);
        listRef.current?.focusIndex(i);
        return true;
      },
      expandTo(id) {
        const path = findPath(roots, id);
        if (!path) return false;
        const cur = live.current.expanded;
        if (path.every((p) => cur.has(p))) return scrollToId(id, 'center');
        pendingScroll.current = id;
        onExpandedChange(new Set([...cur, ...path]));
        return true;
      },
    }),
    [roots, onExpandedChange, scrollToId, setActiveId],
  );

  // Bring the current search match into view when it changes.
  const searchActive = search?.activeId ?? null;
  useEffect(() => {
    if (searchActive !== null) scrollToId(searchActive, 'center');
  }, [searchActive, scrollToId]);

  const typed = useRef({ text: '', at: 0 });

  const onRowKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey || isEditableTarget(e.target))
      return;
    const row = rows[index];
    const node = row.node;
    const open = expanded.has(node.id);
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        if (!isExpandable(node)) return;
        if (!open) setExpandedIds([node.id], true);
        else if (rows[index + 1]?.parentIndex === index) focusRow(index + 1);
        return;
      case 'ArrowLeft':
        e.preventDefault();
        if (open && isExpandable(node)) setExpandedIds([node.id], false);
        else if (row.parentIndex >= 0) focusRow(row.parentIndex);
        return;
      case '*':
        e.preventDefault();
        setExpandedIds(expandableSiblingIds(rows, roots, index), true);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        setActiveId(node.id, index);
        onSelect?.(node.id);
        return;
    }
    if (e.key.length !== 1 || e.key === ' ') return;
    e.preventDefault();
    const now = Date.now();
    const t = typed.current;
    const prev = now - t.at < TYPE_AHEAD_MS ? t.text : '';
    t.text = prev + e.key;
    t.at = now;
    // A repeated single letter cycles; a longer prefix may stay on this row.
    const same = [...t.text].every((ch) => ch === t.text[0]);
    let hit = same
      ? typeAheadIndex(rows, index, t.text[0])
      : typeAheadIndex(rows, index - 1, t.text);
    // No label continues the prefix: start a new search with this key.
    if (hit < 0 && t.text.length > 1) {
      t.text = e.key;
      hit = typeAheadIndex(rows, index, e.key);
    }
    if (hit >= 0) focusRow(hit);
  };

  const accentFor = (i: number, row: FlatTreeRow): ReadonlySet<number> => {
    if (selIndex < 0 || i > selIndex || i <= (branch[0] ?? selIndex))
      return NO_COLUMNS;
    const cols = new Set<number>();
    for (let d = 0; d < row.depth && d < branch.length; d++)
      if (branch[d] < i) cols.add(d);
    return cols;
  };

  const rowProps = (row: FlatTreeRow, i: number): VirtualRowProps => {
    const id = row.node.id;
    const selected = i === selIndex;
    const match = search?.ids.has(id) ?? false;
    const activeMatch = match && searchActive === id;
    // A row with no label (a document root) still needs a name: "root",
    // plus its value or summary when it has one.
    const unnamed = row.node.label === '';
    const tail = row.node.value?.text ?? row.node.summary;
    return {
      'aria-label': unnamed
        ? [row.depth === 0 ? 'root' : 'item', tail].filter(Boolean).join(', ')
        : undefined,
      'aria-level': row.depth + 1,
      'aria-setsize': row.setSize,
      'aria-posinset': row.posInSet,
      'aria-expanded': isExpandable(row.node) ? expanded.has(id) : undefined,
      'aria-selected': selected,
      'data-active-branch': branchSet.has(i) || undefined,
      'data-match': match ? (activeMatch ? 'active' : 'match') : undefined,
      className: cn(
        'cursor-default select-none',
        selected
          ? 'bg-accent-soft'
          : activeMatch
            ? 'bg-match-active-soft'
            : match
              ? 'bg-match-soft'
              : 'hover:bg-surface-2',
      ),
      onClick: () => {
        setActiveId(id, i);
        onSelect?.(id);
      },
      onKeyDown: (e) => onRowKeyDown(i, e),
    };
  };

  return (
    <VirtualList
      ref={listRef}
      items={rows}
      estimateSize={rowHeight}
      role="tree"
      ariaLabel={ariaLabel}
      getKey={(row) => row.node.id}
      activeIndex={activeIndex}
      onActiveIndexChange={(i) => {
        const id = rows[i]?.node.id;
        if (id === undefined) return;
        setActiveId(id, i);
        if (selectionFollowsFocus && id !== selectedId) onSelect?.(id);
      }}
      rowProps={rowProps}
      renderItem={(row, i) => (
        <CodeTreeRow
          row={row}
          expanded={expanded.has(row.node.id)}
          rowStyle={rowStyle}
          accentColumns={accentFor(i, row)}
          onToggle={() =>
            setExpandedIds([row.node.id], !expanded.has(row.node.id))
          }
        />
      )}
      className={cn('bg-surface', className)}
      height={height}
    />
  );
}
