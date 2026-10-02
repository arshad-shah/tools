import { useEffect, useRef, useState } from 'react';
import { ToolError, toToolError } from '@/shared/lib/errors';
import type { KillableClient } from '@/shared/lib/killable-client';
import { useJob } from '@/shared/state/useJob';
import type { TextHandlers } from '@/shared/workers/handlers';
import type { CsvParseResult } from '@/shared/workers/handlers/csv';
import { createTextWorker } from '@/shared/workers/text-client';
import type { TextEncodingChoice } from '../lib/decode';
import {
  edit,
  isModified,
  redo,
  startHistory,
  undo,
  type EditHistory,
  type EditOp,
} from '../lib/edit';
import type { DelimiterChoice } from '../lib/parse';

export type CsvSource =
  | { kind: 'file'; file: File }
  | { kind: 'text'; text: string; name: string };

export interface ParseChoices {
  delimiter: DelimiterChoice;
  encoding: TextEncodingChoice;
  header: boolean;
  quoteChar: '"' | "'";
  keepText: string[];
}

export interface Loaded extends CsvParseResult {
  name: string;
}

const EXTENSIONS = ['csv', 'tsv', 'txt', 'tab'];

function checkExtension(file: File) {
  const ext = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase()
    : '';
  // Dropped files skip the accept filter.
  if (!EXTENSIONS.includes(ext))
    throw new ToolError(
      'INVALID_FILE',
      `${file.name} is not a supported text file (.csv, .tsv, .txt)`,
    );
}

/**
 * Loading in a dedicated killable worker (cancelling a large parse kills
 * only it), re-parsing when a parse option changes, and the edit history.
 */
export function useCsvTable(
  defaults: Pick<ParseChoices, 'delimiter' | 'encoding'>,
) {
  const [source, setSource] = useState<CsvSource | null>(null);
  const [choices, setChoices] = useState<ParseChoices>({
    ...defaults,
    header: true,
    quoteChar: '"',
    keepText: [],
  });
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [history, setHistory] = useState<EditHistory | null>(null);
  const [editError, setEditError] = useState<ToolError | null>(null);

  const workerRef = useRef<KillableClient<TextHandlers> | null>(null);
  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  const job = useJob(
    async (ctx, src: CsvSource, c: ParseChoices): Promise<Loaded> => {
      if (src.kind === 'file') checkExtension(src.file);
      workerRef.current ??= createTextWorker();
      const r = await workerRef.current.call(
        'csv.parse',
        [
          src.kind === 'file' ? src.file : src.text,
          {
            delimiter: c.delimiter,
            encoding: c.encoding,
            header: c.header,
            quoteChar: c.quoteChar,
            keepText: c.keepText,
          },
        ],
        { signal: ctx.signal, onProgress: ctx.progress },
      );
      return { ...r, name: src.kind === 'file' ? src.file.name : src.name };
    },
  );

  const load = async (src: CsvSource, c: ParseChoices = choices) => {
    const r = await job.run(src, c);
    if (!r) return false;
    setSource(src);
    setChoices(c);
    setLoaded(r);
    setHistory(startHistory({ columns: r.columns, rows: r.data }));
    setEditError(null);
    return true;
  };

  /** Re-parses the current source with new options (edits start over). */
  const changeChoices = (patch: Partial<ParseChoices>) => {
    const next = { ...choices, ...patch };
    setChoices(next);
    if (source) void load(source, next);
  };

  const apply = (op: EditOp): boolean => {
    if (!history) return false;
    try {
      setHistory(edit(history, op));
      setEditError(null);
      return true;
    } catch (e) {
      setEditError(toToolError(e));
      return false;
    }
  };

  const clear = () => {
    job.cancel();
    job.reset();
    setSource(null);
    setLoaded(null);
    setHistory(null);
    setEditError(null);
  };

  return {
    source,
    choices,
    loaded,
    table: history?.table ?? null,
    modified: history ? isModified(history) : false,
    canUndo: (history?.undo.length ?? 0) > 0,
    canRedo: (history?.redo.length ?? 0) > 0,
    job,
    editError,
    clearEditError: () => setEditError(null),
    load,
    changeChoices,
    apply,
    undo: () => {
      if (history) setHistory(undo(history));
    },
    redo: () => {
      if (history) setHistory(redo(history));
    },
    clear,
  };
}

export type CsvTable = ReturnType<typeof useCsvTable>;
