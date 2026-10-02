import { ToolError } from '@/shared/lib/errors';
import type { RpcContext } from '@/shared/lib/worker-rpc';
import {
  decodeBytes,
  type TextEncodingChoice,
  type TextEncodingName,
} from '@/tools/csv-viewer/lib/decode';
import type { ColumnType } from '@/tools/csv-viewer/lib/columns';
import {
  parseDelimited,
  type DelimiterChoice,
  type ParseResult,
} from '@/tools/csv-viewer/lib/parse';
import {
  profileTable,
  type ColumnProfile,
} from '@/tools/csv-viewer/lib/profile';

export interface CsvParseOptions {
  delimiter: DelimiterChoice;
  /** Only used for byte input (a file); text is already decoded. */
  encoding?: TextEncodingChoice;
  header?: boolean;
  quoteChar?: string;
  keepText?: string[];
}

export interface CsvParseResult extends ParseResult {
  /** The encoding the bytes were read as (`utf-8` for text input). */
  encoding: TextEncodingName;
}

/** Files above this size report read and parse progress. */
export const CSV_PROGRESS_BYTES = 5 * 1024 * 1024;

function checkAborted(signal: AbortSignal) {
  if (signal.aborted) throw new ToolError('CANCELLED', 'Cancelled');
}

/** Reads a Blob as bytes, reporting progress for large files. */
async function readBlob(blob: Blob, ctx: RpcContext): Promise<Uint8Array> {
  if (blob.size <= CSV_PROGRESS_BYTES)
    return new Uint8Array(await blob.arrayBuffer());
  const out = new Uint8Array(blob.size);
  const reader = blob.stream().getReader();
  let at = 0;
  for (;;) {
    checkAborted(ctx.signal);
    const { done, value } = await reader.read();
    if (done) break;
    out.set(value, at);
    at += value.length;
    ctx.progress({ done: at, total: blob.size * 2, label: 'Reading' });
  }
  return out;
}

export default {
  /**
   * Decode (files) and parse delimited text. Progress covers reading and
   * parsing as one bar, by bytes, for input over 5 MB.
   */
  'csv.parse': async (
    ctx: RpcContext,
    input: Blob | Uint8Array | string,
    opts: CsvParseOptions,
  ): Promise<CsvParseResult> => {
    let text: string;
    let encoding: TextEncodingName = 'utf-8';
    let size: number;
    if (typeof input === 'string') {
      text = input;
      size = input.length;
    } else {
      const bytes =
        input instanceof Uint8Array ? input : await readBlob(input, ctx);
      size = bytes.length;
      ({ text, encoding } = decodeBytes(bytes, opts.encoding ?? 'auto'));
    }
    checkAborted(ctx.signal);
    const large = size > CSV_PROGRESS_BYTES;
    const half = typeof input === 'string' ? 0 : size;
    const result = parseDelimited(text, opts.delimiter, {
      header: opts.header,
      quoteChar: opts.quoteChar,
      keepText: new Set(opts.keepText ?? []),
      onProgress: large
        ? (done, total) =>
            ctx.progress({
              done: half + Math.round((done / total) * size),
              total: half + size,
              label: 'Parsing',
            })
        : undefined,
    });
    return { ...result, encoding };
  },

  /** Column profiles over every given (filtered) row; progress per column. */
  'csv.profile': (
    ctx: RpcContext,
    rows: Record<string, unknown>[],
    types: Record<string, ColumnType>,
  ): Record<string, ColumnProfile> =>
    profileTable(rows, types, (done, total) => {
      checkAborted(ctx.signal);
      ctx.progress({ done, total, label: 'Profiling' });
    }),
};
