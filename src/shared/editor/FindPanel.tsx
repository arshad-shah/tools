import {
  Button,
  Checkbox,
  IconButton,
  Inline,
  LiveRegion,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { chevronDown, chevronUp, close } from '@arshad-shah/cynosure/icons';
import {
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  replaceAll,
  replaceNext,
  SearchQuery,
  setSearchQuery,
} from '@codemirror/search';
import type { EditorView } from '@codemirror/view';
import { useEffect, useRef, useState } from 'react';

/** Matches counted at most, so a huge file stays responsive. */
const COUNT_LIMIT = 9_999;

interface Spec {
  search: string;
  replace: string;
  caseSensitive: boolean;
  regexp: boolean;
  wholeWord: boolean;
}

function specOf(view: EditorView): Spec {
  const q = getSearchQuery(view.state);
  return {
    search: q.search,
    replace: q.replace,
    caseSensitive: q.caseSensitive,
    regexp: q.regexp,
    wholeWord: q.wholeWord,
  };
}

/** "3 of 12", "No matches", or "" before anything is typed. */
function countText(view: EditorView, query: SearchQuery): string {
  if (!query.search) return '';
  if (!query.valid) return 'Invalid pattern';
  const sel = view.state.selection.main;
  let n = 0;
  let current = 0;
  const cursor = query.getCursor(view.state);
  for (let m = cursor.next(); !m.done; m = cursor.next()) {
    n++;
    if (m.value.from === sel.from && m.value.to === sel.to) current = n;
    if (n > COUNT_LIMIT) return `More than ${COUNT_LIMIT.toLocaleString()}`;
  }
  if (n === 0) return 'No matches';
  return current
    ? `${current} of ${n.toLocaleString()}`
    : `${n.toLocaleString()} ${n === 1 ? 'match' : 'matches'}`;
}

export interface FindPanelProps {
  view: EditorView;
  readOnly: boolean;
  /** Bumped on every editor update, so the count follows edits and moves. */
  tick: number;
  /** Bumped when Mod+F asks for the find field again. */
  focusTick: number;
  label: string;
}

/**
 * Find and replace for the code editor, in Cynosure controls, drawn in
 * CodeMirror's top panel. Enter finds the next match, Shift+Enter the
 * previous one, Escape closes and returns to the text.
 */
export function FindPanel({
  view,
  readOnly,
  tick,
  focusTick,
  label,
}: FindPanelProps) {
  const [spec, setSpec] = useState<Spec>(() => specOf(view));
  const findRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findRef.current?.focus();
    findRef.current?.select();
  }, [focusTick]);

  const apply = (patch: Partial<Spec>) => {
    const next = { ...spec, ...patch };
    setSpec(next);
    view.dispatch({ effects: setSearchQuery.of(new SearchQuery(next)) });
  };
  const query = getSearchQuery(view.state);
  // `tick` re-renders this after each editor update; the count reads it.
  void tick;
  const count = countText(view, query);
  const closePanel = () => {
    closeSearchPanel(view);
    view.focus();
  };
  const keys = (e: React.KeyboardEvent, replace = false) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (replace) replaceNext(view);
      else if (e.shiftKey) findPrevious(view);
      else findNext(view);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePanel();
    }
  };

  return (
    <Stack gap="2" padding="2" role="search" aria-label={`Find in ${label}`}>
      <Inline gap="2" align="end" wrap>
        <TextField
          ref={findRef}
          label="Find"
          labelHidden
          size="sm"
          placeholder="Find"
          value={spec.search}
          onChange={(search) => apply({ search })}
          onKeyDown={(e) => keys(e)}
          spellCheck={false}
          autoComplete="off"
          addonEnd={
            count ? (
              <Text size="xs" tone="muted" numeric>
                {count}
              </Text>
            ) : undefined
          }
        />
        <Inline gap="1">
          <IconButton
            size="sm"
            variant="ghost"
            tone="neutral"
            icon={chevronUp}
            label="Previous match"
            onClick={() => findPrevious(view)}
            disabled={!spec.search}
          />
          <IconButton
            size="sm"
            variant="ghost"
            tone="neutral"
            icon={chevronDown}
            label="Next match"
            onClick={() => findNext(view)}
            disabled={!spec.search}
          />
          <IconButton
            size="sm"
            variant="ghost"
            tone="neutral"
            icon={close}
            label="Close find"
            onClick={closePanel}
          />
        </Inline>
      </Inline>
      {readOnly ? null : (
        <Inline gap="2" align="end" wrap>
          <TextField
            label="Replace with"
            labelHidden
            size="sm"
            placeholder="Replace with"
            value={spec.replace}
            onChange={(replace) => apply({ replace })}
            onKeyDown={(e) => keys(e, true)}
            spellCheck={false}
            autoComplete="off"
          />
          <Inline gap="1">
            <Button
              size="sm"
              variant="soft"
              tone="neutral"
              onClick={() => replaceNext(view)}
              disabled={!spec.search}
            >
              Replace
            </Button>
            <Button
              size="sm"
              variant="soft"
              tone="neutral"
              onClick={() => replaceAll(view)}
              disabled={!spec.search}
            >
              Replace all
            </Button>
          </Inline>
        </Inline>
      )}
      <Inline gap="4" wrap>
        <Checkbox
          size="sm"
          label="Match case"
          checked={spec.caseSensitive}
          onChange={(caseSensitive) => apply({ caseSensitive })}
        />
        <Checkbox
          size="sm"
          label="Whole word"
          checked={spec.wholeWord}
          onChange={(wholeWord) => apply({ wholeWord })}
        />
        <Checkbox
          size="sm"
          label="Regular expression"
          checked={spec.regexp}
          onChange={(regexp) => apply({ regexp })}
        />
      </Inline>
      <LiveRegion>{count}</LiveRegion>
    </Stack>
  );
}
