import { useCallback, useMemo, useState } from 'react';

export interface SelectionMods {
  /** Shift: select the range from the anchor. */
  shift: boolean;
  /** Ctrl or Cmd: toggle one item, keeping the rest. */
  meta: boolean;
}

export interface PageSelectionState {
  selected: ReadonlySet<string>;
  /** Last plain or ctrl-clicked item; start of a shift range. */
  anchor: string | null;
}

/**
 * What a plain click does: `replace` selects only that item (file-manager
 * style, clicking the sole selected item clears it); `toggle` adds or
 * removes it, for tools where clicking pages builds up a selection.
 */
export type PlainClick = 'replace' | 'toggle';

export const emptySelection: PageSelectionState = {
  selected: new Set(),
  anchor: null,
};

/** Keys between `anchor` and `key` (inclusive), in display order. */
export function rangeSelect(
  keys: readonly string[],
  anchor: string | null,
  key: string,
): Set<string> {
  const to = keys.indexOf(key);
  if (to < 0) return new Set();
  const from = anchor === null ? -1 : keys.indexOf(anchor);
  if (from < 0) return new Set([key]);
  const [lo, hi] = from < to ? [from, to] : [to, from];
  return new Set(keys.slice(lo, hi + 1));
}

/** Pure selection update for a click (or Space/Enter) on `key`. */
export function nextSelection(
  state: PageSelectionState,
  keys: readonly string[],
  key: string,
  mods: SelectionMods,
  plain: PlainClick = 'replace',
): PageSelectionState {
  const { selected, anchor } = state;
  if (mods.shift) {
    const range = rangeSelect(keys, anchor, key);
    return {
      selected: new Set([...selected, ...range]),
      anchor: anchor ?? key,
    };
  }
  if (mods.meta || plain === 'toggle') {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return { selected: next, anchor: key };
  }
  const onlyThis = selected.has(key) && selected.size === 1;
  return { selected: onlyThis ? new Set() : new Set([key]), anchor: key };
}

/** Drops keys (and an anchor) that are no longer present. */
function prune(
  state: PageSelectionState,
  keys: readonly string[],
): PageSelectionState {
  const present = new Set(keys);
  return {
    selected: new Set([...state.selected].filter((k) => present.has(k))),
    anchor:
      state.anchor !== null && present.has(state.anchor) ? state.anchor : null,
  };
}

/**
 * Shared multi-select model for page grids: plain/ctrl/shift clicks with an
 * anchor. Keys that disappear from `keys` (deleted pages) drop out of the
 * selection automatically.
 */
export function usePageSelection(
  keys: readonly string[],
  { plain = 'replace' }: { plain?: PlainClick } = {},
) {
  const [state, setState] = useState<PageSelectionState>(emptySelection);

  const selected = useMemo(() => {
    const present = new Set(keys);
    const live = [...state.selected].filter((k) => present.has(k));
    return live.length === state.selected.size ? state.selected : new Set(live);
  }, [keys, state.selected]);
  const anchor =
    state.anchor !== null && keys.includes(state.anchor) ? state.anchor : null;

  const toggle = useCallback(
    (key: string, mods: SelectionMods) =>
      setState((s) => nextSelection(prune(s, keys), keys, key, mods, plain)),
    [keys, plain],
  );
  const selectAll = useCallback(
    () => setState({ selected: new Set(keys), anchor: null }),
    [keys],
  );
  const clear = useCallback(() => setState(emptySelection), []);

  return { selected, anchor, toggle, selectAll, clear };
}
