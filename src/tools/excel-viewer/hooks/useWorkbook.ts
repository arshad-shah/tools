import { useState } from 'react';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';
import { useJob, type JobContext } from '@/shared/state/useJob';
import type { Sheet } from '../lib/sheet';
import { readWorkbook, type Workbook } from '../lib/workbook';

/** Workbooks over this (compressed) are refused. */
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

export interface OpenWorkbook {
  name: string;
  size: number;
  workbook: Workbook;
}

export type SheetSlot = { sheet: Sheet } | { error: ToolError };

/** Lets the page paint (a "Reading" state) before synchronous parsing. */
const yieldToPaint = (signal: AbortSignal) =>
  new Promise<void>((resolve, reject) =>
    setTimeout(
      () =>
        signal.aborted
          ? reject(new ToolError('CANCELLED', 'Cancelled'))
          : resolve(),
      0,
    ),
  );

/**
 * The open workbook and its sheets, parsed on first view and kept. Parsing
 * needs DOMParser, so it runs on the main thread, one part at a time.
 */
export function useWorkbook() {
  const [active, setActive] = useState(0);
  const [sheets, setSheets] = useState<Map<number, SheetSlot>>(new Map());

  const open = useJob(
    async (ctx: JobContext, file: File): Promise<OpenWorkbook> => {
      if (!/\.(xlsx|xlsm)$/i.test(file.name))
        throw new ToolError(
          'INVALID_FILE',
          /\.xls$/i.test(file.name)
            ? `${file.name} is an older .xls workbook. Save it as .xlsx in your spreadsheet app, then open it here.`
            : `${file.name} is not an .xlsx or .xlsm workbook`,
        );
      if (file.size > MAX_FILE_BYTES)
        throw new ToolError(
          'TOO_LARGE',
          `${file.name} is larger than ${formatBytes(MAX_FILE_BYTES)}`,
        );
      ctx.progress({ done: 0, total: 1, label: `Reading ${file.name}` });
      const bytes = await readBytes(file);
      await yieldToPaint(ctx.signal);
      const workbook = readWorkbook(bytes);
      const first = Math.max(
        0,
        workbook.sheets.findIndex(
          (s) => s.state === 'visible' && s.kind === 'worksheet',
        ),
      );
      if (ctx.signal.aborted) throw new ToolError('CANCELLED', 'Cancelled');
      const map = new Map<number, SheetSlot>();
      map.set(first, load(workbook, first));
      setSheets(map);
      setActive(first);
      return { name: file.name, size: file.size, workbook };
    },
  );

  const wb = open.result?.workbook ?? null;
  const select = (index: number) => {
    setActive(index);
    if (wb && !sheets.has(index))
      setSheets((m) => new Map(m).set(index, load(wb, index)));
  };

  return {
    open,
    active,
    select,
    slot: sheets.get(active) ?? null,
    close: () => {
      open.reset();
      setSheets(new Map());
      setActive(0);
    },
  };
}

function load(workbook: Workbook, index: number): SheetSlot {
  try {
    return { sheet: workbook.loadSheet(index) };
  } catch (e) {
    return { error: toToolError(e) };
  }
}
