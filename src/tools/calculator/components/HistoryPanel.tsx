import {
  Card,
  EmptyState,
  IconButton,
  Inline,
  ListRow,
  ListRows,
  ScrollArea,
  SearchField,
  SegmentedControl,
  Stack,
} from '@arshad-shah/cynosure';
import {
  cornerDownLeft,
  download,
  history as historyIcon,
  star,
  starOff,
  trash,
} from '@arshad-shah/cynosure/icons';
import React, { useMemo, useState } from 'react';
import { saveBlob } from '@/shared/lib/download';
import type { HistoryEntry } from '../settings';

interface HistoryPanelProps {
  history: HistoryEntry[];
  saved: HistoryEntry[];
  onHistoryChange(history: HistoryEntry[]): void;
  onSavedChange(saved: HistoryEntry[]): void;
  /** Insert a result into the active line. */
  onUse(text: string): void;
  /** The memory registers, shown in their own view. */
  memory: React.ReactNode;
}

type View = 'history' | 'saved' | 'memory';

const same = (a: HistoryEntry, b: HistoryEntry) =>
  a.expression === b.expression && a.result === b.result;

/** The history as a plain-text tape, oldest first. */
function tapeText(history: HistoryEntry[]): string {
  return history.map((h) => `${h.expression} = ${h.result}`).join('\n') + '\n';
}

function EntryRows({
  label,
  entries,
  isSaved,
  onUse,
  onStar,
}: {
  label: string;
  entries: HistoryEntry[];
  isSaved(e: HistoryEntry): boolean;
  onUse(e: HistoryEntry): void;
  onStar(e: HistoryEntry): void;
}) {
  return (
    <ScrollArea maxHeight="28rem">
      <ListRows label={label} divided>
        {entries.map((h, i) => {
          const starred = isSaved(h);
          return (
            <ListRow
              key={`${h.at}-${h.expression}-${i}`}
              label={`= ${h.result}`}
              description={h.expression}
              mono="description"
              actions={
                <>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={cornerDownLeft}
                    label={`Use ${h.result}`}
                    onClick={() => onUse(h)}
                  />
                  <IconButton
                    size="sm"
                    variant="ghost"
                    tone={starred ? 'accent' : 'neutral'}
                    icon={starred ? star : starOff}
                    label={
                      starred ? 'Remove from favourites' : 'Add to favourites'
                    }
                    aria-pressed={starred}
                    onClick={() => onStar(h)}
                  />
                </>
              }
            />
          );
        })}
      </ListRows>
    </ScrollArea>
  );
}

/**
 * History (newest first, searchable, tape export), favourites and the
 * memory registers in one card beside the sheet.
 */
export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  saved,
  onHistoryChange,
  onSavedChange,
  onUse,
  memory,
}) => {
  // A SegmentedControl, not Tabs: Tabs throw when a kept-alive page is shown
  // again (docs/cynosure-gaps.md, 11).
  const [view, setView] = useState<View>('history');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...history].reverse();
    return q
      ? list.filter(
          (h) =>
            h.expression.toLowerCase().includes(q) ||
            h.result.toLowerCase().includes(q),
        )
      : list;
  }, [history, query]);

  const isSaved = (e: HistoryEntry) => saved.some((s) => same(s, e));
  const toggleStar = (e: HistoryEntry) =>
    onSavedChange(
      isSaved(e) ? saved.filter((s) => !same(s, e)) : [...saved, e],
    );

  return (
    <Card
      as="section"
      title="History"
      actions={
        // The tape actions act on the history, so they show with it.
        view === 'history' && history.length > 0 ? (
          <Inline gap="1">
            <IconButton
              size="sm"
              variant="ghost"
              icon={download}
              label="Export tape"
              onClick={() =>
                saveBlob(
                  new Blob([tapeText(history)], { type: 'text/plain' }),
                  'calculator-tape.txt',
                )
              }
            />
            <IconButton
              size="sm"
              variant="ghost"
              tone="danger"
              icon={trash}
              label="Clear history"
              onClick={() => onHistoryChange([])}
            />
          </Inline>
        ) : undefined
      }
    >
      <Stack gap="4">
        <SegmentedControl
          label="History views"
          size="sm"
          fullWidth
          value={view}
          onChange={(v) => setView(v as View)}
          options={[
            { value: 'history', label: 'History' },
            { value: 'saved', label: 'Favourites' },
            { value: 'memory', label: 'Memory' },
          ]}
        />
        {view === 'history' ? (
          <Stack gap="3">
            {history.length > 0 ? (
              <SearchField
                label="Search history"
                labelHidden
                placeholder="Search history"
                size="sm"
                value={query}
                onChange={setQuery}
              />
            ) : null}
            {filtered.length === 0 ? (
              <EmptyState
                size="sm"
                icon={historyIcon}
                title={
                  history.length === 0 ? 'No calculations yet' : 'No matches'
                }
                description="Press Enter or = on a line to record it here."
              />
            ) : (
              <EntryRows
                key={query}
                label="History"
                entries={filtered}
                isSaved={isSaved}
                onUse={(h) => onUse(h.result)}
                onStar={toggleStar}
              />
            )}
          </Stack>
        ) : null}
        {view === 'saved' ? (
          saved.length === 0 ? (
            <EmptyState
              size="sm"
              icon={star}
              title="No favourites yet"
              description="Star a history entry to keep it here."
            />
          ) : (
            <EntryRows
              label="Favourites"
              entries={saved}
              isSaved={() => true}
              onUse={(h) => onUse(h.result)}
              onStar={toggleStar}
            />
          )
        ) : null}
        {view === 'memory' ? memory : null}
      </Stack>
    </Card>
  );
};
