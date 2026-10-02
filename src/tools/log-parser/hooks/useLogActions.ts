import { useCallback, useRef } from 'react';
import { useClipboard } from '@/shared/lib/clipboard';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { sendTo } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useToolCommands } from '@/shared/lib/tool-commands';
import type { VirtualListHandle } from '@/shared/ui';
import { diffPairPayload } from '@/tools/text-diff-checker/lib/handoff';
import type { LogFilter } from '../lib/filter';
import { comparePair } from '../lib/handoff';
import type { LogEntry } from '../lib/model';
import type { ExportFormat, LogSource } from './useLogSource';

const EXPORT: Record<
  ExportFormat,
  { ext: string; mime: string; label: string }
> = {
  text: { ext: 'txt', mime: 'text/plain;charset=utf-8', label: 'text' },
  json: { ext: 'json', mime: 'application/json', label: 'JSON' },
  csv: { ext: 'csv', mime: 'text/csv;charset=utf-8', label: 'CSV' },
};

export interface LogActionsOptions {
  source: LogSource;
  filter: LogFilter;
  listRef: React.RefObject<VirtualListHandle | null>;
  selected: ReadonlyMap<number, LogEntry>;
  navigate(to: string): void;
  onClear(): void;
  onSample(): void;
  onNewFormat(): void;
  onClearFilters(): void;
  /** The opened file's name, for export names (default "log"). */
  fileName?: string;
}

/**
 * The viewer's actions (jump to next error, export, copy, compare) and
 * their Mod+K commands and shortcuts.
 */
export function useLogActions({
  source,
  filter,
  listRef,
  selected,
  navigate,
  onClear,
  onSample,
  onNewFormat,
  onClearFilters,
  fileName,
}: LogActionsOptions) {
  const cursor = useRef(-1);
  const { copy } = useClipboard();
  const hasLog = source.status === 'ready';
  const { nextMatch, exportAs: exportText } = source;

  const setCursor = useCallback((position: number) => {
    cursor.current = position;
  }, []);

  const nextError = useCallback(async () => {
    try {
      const from = cursor.current;
      let hit = await nextMatch(from, filter, 'error');
      if (!hit && from >= 0) hit = await nextMatch(-1, filter, 'error');
      if (!hit) {
        notify.info('No errors in the shown entries');
        return;
      }
      cursor.current = hit.position;
      listRef.current?.focusIndex(hit.position, 'center');
    } catch (e) {
      notify.error(toToolError(e));
    }
  }, [nextMatch, filter, listRef]);

  const exportAs = useCallback(
    async (fmt: ExportFormat) => {
      try {
        const text = await exportText(filter, fmt);
        const { ext, mime, label } = EXPORT[fmt];
        saveBlob(
          new Blob([text], { type: mime }),
          deriveFilename(fileName ?? 'log', 'export', ext),
        );
        notify.success(`Exported as ${label}`);
      } catch (e) {
        notify.error(toToolError(e));
      }
    },
    [exportText, filter, fileName],
  );

  const copyShown = useCallback(async () => {
    try {
      await copy(await exportText(filter, 'text'));
    } catch (e) {
      notify.error(toToolError(e));
    }
  }, [copy, exportText, filter]);

  const compare = useCallback(() => {
    const [a, b] = [...selected.values()].sort((x, y) => x.index - y.index);
    if (!a || !b) return;
    try {
      sendTo(
        navigate,
        'text-diff-checker',
        diffPairPayload(comparePair(a.raw, b.raw), 'log-parser'),
      );
    } catch (e) {
      notify.error(toToolError(e));
    }
  }, [selected, navigate]);

  useToolCommands('log-parser', [
    {
      id: 'next-error',
      label: 'Jump to next error',
      shortcut: 'e',
      enabled: hasLog,
      run: () => void nextError(),
    },
    {
      id: 'export-csv',
      label: 'Export as CSV',
      group: 'Export',
      enabled: hasLog,
      run: () => void exportAs('csv'),
    },
    {
      id: 'export-json',
      label: 'Export as JSON',
      group: 'Export',
      enabled: hasLog,
      run: () => void exportAs('json'),
    },
    {
      id: 'export-text',
      label: 'Export as text',
      group: 'Export',
      enabled: hasLog,
      run: () => void exportAs('text'),
    },
    {
      id: 'copy',
      label: 'Copy shown entries',
      enabled: hasLog,
      run: () => void copyShown(),
    },
    {
      id: 'compare',
      label: 'Compare selected entries',
      enabled: selected.size === 2,
      run: compare,
    },
    {
      id: 'clear-filters',
      label: 'Clear filters',
      enabled: hasLog,
      run: onClearFilters,
    },
    { id: 'custom-format', label: 'New custom format', run: onNewFormat },
    { id: 'sample', label: 'Load sample', run: onSample },
    { id: 'clear', label: 'Clear log', run: onClear },
  ]);

  return {
    nextError: () => void nextError(),
    exportAs: (fmt: ExportFormat) => void exportAs(fmt),
    compare,
    setCursor,
  };
}
