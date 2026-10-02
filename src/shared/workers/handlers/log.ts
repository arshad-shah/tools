import type { RpcContext } from '@/shared/lib/worker-rpc';
import {
  compileCustomFormat,
  type CustomFormatDef,
} from '@/tools/log-parser/lib/custom-format';
import type { LogFilter } from '@/tools/log-parser/lib/filter';
import type { FormatRef } from '@/tools/log-parser/lib/model';
import { LogStore, type OpenSource } from '@/tools/log-parser/lib/store';

// One store per worker instance: the Log Viewer uses a dedicated
// createTextWorker(), so entries live in the worker and the UI asks for
// windows.
let store = new LogStore();

/** Log Viewer handlers (spec §8.1). */
export default {
  'log.open': (ctx: RpcContext, source: OpenSource, format: FormatRef) => {
    store = new LogStore();
    return store.open(source, format, ctx);
  },
  'log.window': (
    _ctx: RpcContext,
    start: number,
    count: number,
    filter: LogFilter,
  ) => store.window(start, count, filter),
  'log.histogram': (_ctx: RpcContext, buckets: number, filter: LogFilter) =>
    store.histogram(buckets, filter),
  'log.nextMatch': (
    _ctx: RpcContext,
    from: number,
    filter: LogFilter,
    predicate: 'error' | { regex: string },
  ) => store.nextMatch(from, filter, predicate),
  'log.export': (
    _ctx: RpcContext,
    filter: LogFilter,
    fmt: 'text' | 'json' | 'csv',
  ) => store.export(filter, fmt),
  /** Parses sample lines with a custom format (the inline test). */
  'log.testFormat': (
    _ctx: RpcContext,
    def: CustomFormatDef,
    lines: string[],
  ) => {
    const spec = compileCustomFormat(def);
    return lines.map((l) => spec.parse(l));
  },
};
