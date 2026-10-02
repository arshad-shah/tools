import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
  IconButton,
  Inline,
  SearchInput,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import { IconDownload, IconStar } from '@/shared/ui/icons';
import { saveBlob } from '@/shared/lib/download';
import type { HistoryEntry } from '../settings';

interface HistoryPanelProps {
  history: HistoryEntry[];
  saved: HistoryEntry[];
  onHistoryChange(history: HistoryEntry[]): void;
  onSavedChange(saved: HistoryEntry[]): void;
  /** Insert a result into the active line. */
  onUse(text: string): void;
  /** The memory registers, shown in their own tab. */
  memory: React.ReactNode;
}

const same = (a: HistoryEntry, b: HistoryEntry) =>
  a.expression === b.expression && a.result === b.result;

/** The history as a plain-text tape, oldest first. */
function tapeText(history: HistoryEntry[]): string {
  return history.map((h) => `${h.expression} = ${h.result}`).join('\n') + '\n';
}

const Entry: React.FC<{
  entry: HistoryEntry;
  starred: boolean;
  onUse(): void;
  onStar(): void;
}> = ({ entry, starred, onUse, onStar }) => (
  <Inline
    justify="between"
    align="center"
    gap="2"
    className="rounded-md border border-line px-3 py-2"
  >
    <Stack gap="0" className="min-w-0">
      <Text size="sm" mono className="break-all">
        {entry.expression}
      </Text>
      <Text size="sm" mono weight="semibold" className="break-all">
        = {entry.result}
      </Text>
    </Stack>
    <Inline gap="1" className="shrink-0">
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Use ${entry.result}`}
        onClick={onUse}
      >
        Use
      </Button>
      <IconButton
        size="sm"
        variant="ghost"
        label={starred ? 'Remove from favourites' : 'Add to favourites'}
        aria-pressed={starred}
        // A favourite is a toggle state, never a primary action: a filled star.
        icon={
          <IconStar
            size="sm"
            className={starred ? 'fill-current text-accent-fg' : undefined}
          />
        }
        onClick={onStar}
      />
    </Inline>
  </Inline>
);

/**
 * History (newest first, searchable, tape export), favourites and the
 * memory registers in one card.
 */
export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  saved,
  onHistoryChange,
  onSavedChange,
  onUse,
  memory,
}) => {
  const [tab, setTab] = useState('history');
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
    <Card>
      <CardHeader>
        <Inline justify="between" align="center" gap="2" wrap>
          <CardTitle as="h2">History</CardTitle>
          <Inline gap="1">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<IconDownload size="sm" />}
              disabled={history.length === 0}
              onClick={() =>
                saveBlob(
                  new Blob([tapeText(history)], { type: 'text/plain' }),
                  'calculator-tape.txt',
                )
              }
            >
              Export tape
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={history.length === 0}
              onClick={() => onHistoryChange([])}
            >
              Clear history
            </Button>
          </Inline>
        </Inline>
      </CardHeader>
      <CardBody>
        <Tabs value={tab} onValueChange={setTab} variant="soft" fullWidth>
          <TabsList aria-label="History views">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="saved">Favourites</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
          </TabsList>
          <TabsContent value="history">
            <Stack gap="2" className="pt-3">
              <SearchInput
                value={query}
                onChange={setQuery}
                aria-label="Search history"
                placeholder="Search history"
              />
              {filtered.length === 0 ? (
                <EmptyState>
                  <EmptyStateTitle>
                    {history.length === 0
                      ? 'No calculations yet'
                      : 'No matches'}
                  </EmptyStateTitle>
                  <EmptyStateDescription>
                    Press Enter or = on a line to record it here.
                  </EmptyStateDescription>
                </EmptyState>
              ) : (
                <Stack gap="2" className="max-h-96 overflow-auto">
                  {filtered.map((h, i) => (
                    <Entry
                      key={`${h.at}-${i}`}
                      entry={h}
                      starred={isSaved(h)}
                      onUse={() => onUse(h.result)}
                      onStar={() => toggleStar(h)}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          </TabsContent>
          <TabsContent value="saved">
            <Stack gap="2" className="max-h-96 overflow-auto pt-3">
              {saved.length === 0 ? (
                <EmptyState>
                  <EmptyStateTitle>No favourites yet</EmptyStateTitle>
                  <EmptyStateDescription>
                    Star a history entry to keep it here.
                  </EmptyStateDescription>
                </EmptyState>
              ) : (
                saved.map((s, i) => (
                  <Entry
                    key={`${s.expression}-${i}`}
                    entry={s}
                    starred
                    onUse={() => onUse(s.result)}
                    onStar={() => toggleStar(s)}
                  />
                ))
              )}
            </Stack>
          </TabsContent>
          <TabsContent value="memory">
            <Stack gap="2" className="pt-3">
              {memory}
            </Stack>
          </TabsContent>
        </Tabs>
      </CardBody>
    </Card>
  );
};
