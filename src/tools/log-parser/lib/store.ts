import { toCsv } from '@/shared/lib/data-formats/csv-write';
import { ToolError } from '@/shared/lib/errors';
import type { JobProgress } from '@/shared/state/useJob';
import { compileCustomFormat } from './custom-format';
import { detectFormat } from './formats/detect';
import { getFormat, plain } from './formats/index';
import { isContinuation } from './group';
import {
  compileFilter,
  filterKey,
  isEmptyFilter,
  NO_LEVEL,
  type LogFilter,
} from './filter';
import type { FormatRef, FormatSpec, LogEntry } from './model';

/** Hard cap on a log file (spec §8.1). */
export const MAX_LOG_BYTES = 2 * 1024 ** 3;
export const CHUNK_BYTES = 1024 * 1024;
const SEGMENT_CHARS = 4 * 1024 * 1024;
const SAMPLE_LINES = 200;

export interface OpenSource {
  file?: Blob;
  text?: string;
}

export interface OpenResult {
  total: number;
  levels: Record<string, number>;
  range: [number, number] | null;
  format: string;
}

export interface StoreContext {
  signal?: AbortSignal;
  progress?(p: JobProgress): void;
}

/** A growable typed column. */
class Column<T extends Int32Array | Float64Array | Uint16Array> {
  data: T;
  constructor(private readonly make: (n: number) => T) {
    this.data = make(1024);
  }
  set(i: number, v: number) {
    if (i >= this.data.length) {
      const next = this.make(this.data.length * 2);
      next.set(this.data);
      this.data = next;
    }
    this.data[i] = v;
  }
}

const cancelled = () => new ToolError('CANCELLED', 'Cancelled');

/**
 * The Log Viewer's entries, held in the worker as compact columns (offsets
 * into a few large text segments, plus level, time and component ids) so a
 * multi-gigabyte log never becomes millions of objects. The UI asks for
 * windows of parsed entries.
 */
export class LogStore {
  private format: FormatSpec = plain;
  private segments: string[] = [];
  private pieces: string[] = [];
  private pieceChars = 0;
  private count = 0;
  private readonly seg = new Column((n) => new Int32Array(n));
  private readonly start = new Column((n) => new Int32Array(n));
  private readonly len = new Column((n) => new Int32Array(n));
  private readonly lineNo = new Column((n) => new Int32Array(n));
  private readonly level = new Column((n) => new Uint16Array(n));
  private readonly ts = new Column((n) => new Float64Array(n));
  private readonly comp = new Column((n) => new Int32Array(n));
  private readonly levelNames: string[] = [NO_LEVEL];
  private readonly compNames: string[] = [];
  private readonly compIds = new Map<string, number>();
  private levelCounts: Record<string, number> = {};
  private t0 = Infinity;
  private t1 = -Infinity;
  private cache: { key: string; positions: Int32Array | null } | null = null;

  get total(): number {
    return this.count;
  }

  async open(
    source: OpenSource,
    ref: FormatRef,
    ctx: StoreContext = {},
    { chunkBytes = CHUNK_BYTES }: { chunkBytes?: number } = {},
  ): Promise<OpenResult> {
    if (source.file && source.file.size > MAX_LOG_BYTES)
      throw new ToolError(
        'TOO_LARGE',
        'This log is larger than the 2 GB limit',
      );
    let pending: string[] = [];
    let pendingLine = 0;
    let lineNo = 0;
    let prev: string | undefined;
    let sample: string[] | null = ref.kind === 'auto' ? [] : null;
    if (ref.kind !== 'auto') this.format = this.resolve(ref);

    const flush = () => {
      if (pending.length > 0) this.commit(pending, pendingLine);
      pending = [];
    };
    const feed = (line: string) => {
      lineNo++;
      if (pending.length > 0 && isContinuation(line, prev)) pending.push(line);
      else if (line.trim() === '' && pending.length === 0) {
        // Blank lines between entries are not entries.
      } else if (line.trim() === '') {
        flush();
      } else {
        flush();
        pending = [line];
        pendingLine = lineNo;
      }
      prev = line;
    };
    // Auto-detect holds back the first lines until the format is known.
    const take = (line: string) => {
      if (sample) {
        sample.push(line);
        if (sample.length >= SAMPLE_LINES) release();
      } else feed(line);
    };
    const release = () => {
      if (!sample) return;
      const held = sample;
      sample = null;
      this.format = this.resolve({
        kind: 'builtin',
        id: detectFormat(held)[0]?.id ?? 'plain',
      });
      held.forEach(feed);
    };

    if (source.file) {
      const file = source.file;
      const decoder = new TextDecoder('utf-8');
      let carry = '';
      for (let offset = 0; offset < file.size; offset += chunkBytes) {
        if (ctx.signal?.aborted) throw cancelled();
        const buf = await file.slice(offset, offset + chunkBytes).arrayBuffer();
        if (ctx.signal?.aborted) throw cancelled();
        const text =
          carry + decoder.decode(new Uint8Array(buf), { stream: true });
        const lines = text.split('\n');
        carry = lines.pop()!;
        for (const l of lines) take(l.endsWith('\r') ? l.slice(0, -1) : l);
        ctx.progress?.({
          done: Math.min(offset + chunkBytes, file.size),
          total: file.size,
        });
      }
      carry += decoder.decode();
      if (carry !== '') take(carry.endsWith('\r') ? carry.slice(0, -1) : carry);
    } else {
      const text = source.text ?? '';
      const lines = text.split(/\r?\n/);
      if (lines[lines.length - 1] === '') lines.pop();
      lines.forEach(take);
      ctx.progress?.({ done: text.length, total: text.length });
    }
    release();
    flush();
    this.seal();
    return {
      total: this.count,
      levels: { ...this.levelCounts },
      range: this.t0 <= this.t1 ? [this.t0, this.t1] : null,
      format: this.format.id,
    };
  }

  private resolve(ref: FormatRef): FormatSpec {
    if (ref.kind === 'custom') return compileCustomFormat(ref);
    if (ref.kind === 'builtin') return getFormat(ref.id) ?? plain;
    return plain;
  }

  private parseHead(line: string): Partial<LogEntry> {
    try {
      return this.format.parse(line) ?? plain.parse(line)!;
    } catch {
      return plain.parse(line)!;
    }
  }

  private commit(lines: string[], line: number) {
    const raw = lines.join('\n');
    if (this.pieceChars + raw.length > SEGMENT_CHARS && this.pieceChars > 0)
      this.seal();
    const i = this.count++;
    this.seg.set(i, this.segments.length);
    this.start.set(i, this.pieceChars);
    this.len.set(i, raw.length);
    this.lineNo.set(i, line);
    this.pieces.push(raw, '\n');
    this.pieceChars += raw.length + 1;

    const head = this.parseHead(lines[0]);
    const level = head.level ?? NO_LEVEL;
    let id = this.levelNames.indexOf(level);
    if (id < 0) id = this.levelNames.push(level) - 1;
    this.level.set(i, id);
    this.levelCounts[level] = (this.levelCounts[level] ?? 0) + 1;
    const ts = head.ts ?? NaN;
    this.ts.set(i, ts);
    if (ts < this.t0) this.t0 = ts;
    if (ts > this.t1) this.t1 = ts;
    let c = -1;
    if (head.component !== undefined) {
      c = this.compIds.get(head.component) ?? -1;
      if (c < 0) {
        c = this.compNames.push(head.component) - 1;
        this.compIds.set(head.component, c);
      }
    }
    this.comp.set(i, c);
  }

  private seal() {
    if (this.pieces.length === 0) return;
    this.segments.push(this.pieces.join(''));
    this.pieces = [];
    this.pieceChars = 0;
  }

  private raw(i: number): string {
    const s = this.start.data[i];
    return this.segments[this.seg.data[i]].slice(s, s + this.len.data[i]);
  }

  /** The light view of entry `i` used by filters. */
  private lite(i: number) {
    const lvl = this.levelNames[this.level.data[i]];
    const ts = this.ts.data[i];
    const c = this.comp.data[i];
    return {
      level: lvl === NO_LEVEL ? undefined : lvl,
      ts: Number.isNaN(ts) ? undefined : ts,
      component: c < 0 ? undefined : this.compNames[c],
      raw: this.raw(i),
    };
  }

  /** The fully parsed entry `i`. */
  entry(i: number): LogEntry {
    const lite = this.lite(i);
    const nl = lite.raw.indexOf('\n');
    const first = nl < 0 ? lite.raw : lite.raw.slice(0, nl);
    const head = this.parseHead(first);
    const rest = nl < 0 ? '' : lite.raw.slice(nl);
    const out: LogEntry = {
      index: i,
      line: this.lineNo.data[i],
      message: (head.message ?? first) + rest,
      raw: lite.raw,
    };
    if (lite.ts !== undefined) out.ts = lite.ts;
    if (lite.level !== undefined) out.level = lite.level;
    if (lite.component !== undefined) out.component = lite.component;
    if (head.fields && Object.keys(head.fields).length > 0)
      out.fields = head.fields;
    return out;
  }

  /** Entry indexes kept by `filter` (null: all of them), cached per filter. */
  private positions(filter: LogFilter): Int32Array | null {
    if (isEmptyFilter(filter)) return null;
    const key = filterKey(filter);
    if (this.cache?.key === key) return this.cache.positions;
    const f = compileFilter(filter);
    const out = new Int32Array(this.count);
    let n = 0;
    for (let i = 0; i < this.count; i++) {
      const e = f.needsFields ? this.entry(i) : this.lite(i);
      if (f.test(e)) out[n++] = i;
    }
    const positions = out.slice(0, n);
    this.cache = { key, positions };
    return positions;
  }

  private size(p: Int32Array | null) {
    return p ? p.length : this.count;
  }

  window(
    start: number,
    count: number,
    filter: LogFilter,
  ): { entries: LogEntry[]; filteredTotal: number } {
    const p = this.positions(filter);
    const total = this.size(p);
    const entries: LogEntry[] = [];
    for (let k = Math.max(0, start); k < Math.min(total, start + count); k++)
      entries.push(this.entry(p ? p[k] : k));
    return { entries, filteredTotal: total };
  }

  histogram(
    buckets: number,
    filter: LogFilter,
  ): { t0: number; t1: number; counts: Record<string, number[]> } | null {
    const p = this.positions(filter);
    const total = this.size(p);
    let t0 = Infinity;
    let t1 = -Infinity;
    for (let k = 0; k < total; k++) {
      const ts = this.ts.data[p ? p[k] : k];
      if (ts < t0) t0 = ts;
      if (ts > t1) t1 = ts;
    }
    if (!(t0 <= t1)) return null;
    const width = (t1 - t0) / buckets || 1;
    const counts: Record<string, number[]> = {};
    for (let k = 0; k < total; k++) {
      const i = p ? p[k] : k;
      const ts = this.ts.data[i];
      if (Number.isNaN(ts)) continue;
      const level = this.levelNames[this.level.data[i]];
      const b = Math.min(buckets - 1, Math.floor((ts - t0) / width));
      (counts[level] ??= new Array<number>(buckets).fill(0))[b]++;
    }
    return { t0, t1, counts };
  }

  /** The next kept entry after filtered position `from` that matches. */
  nextMatch(
    from: number,
    filter: LogFilter,
    predicate: 'error' | { regex: string },
  ): { position: number; index: number } | null {
    const p = this.positions(filter);
    const total = this.size(p);
    let test: (i: number) => boolean;
    if (predicate === 'error') {
      test = (i) => {
        const l = this.levelNames[this.level.data[i]];
        return l === 'error' || l === 'fatal';
      };
    } else {
      const re = compileFilter({
        levels: new Set(),
        exclude: [],
        fields: [],
        text: { value: predicate.regex, regex: true },
      });
      test = (i) => re.test(this.lite(i));
    }
    for (let k = Math.max(0, from + 1); k < total; k++) {
      const i = p ? p[k] : k;
      if (test(i)) return { position: k, index: i };
    }
    return null;
  }

  export(filter: LogFilter, fmt: 'text' | 'json' | 'csv'): string {
    const p = this.positions(filter);
    const total = this.size(p);
    const at = (k: number) => (p ? p[k] : k);
    if (fmt === 'text') {
      const out: string[] = [];
      for (let k = 0; k < total; k++) out.push(this.raw(at(k)));
      return out.length ? `${out.join('\n')}\n` : '';
    }
    const entries: LogEntry[] = [];
    for (let k = 0; k < total; k++) entries.push(this.entry(at(k)));
    if (fmt === 'json') return JSON.stringify(entries, null, 2);
    return toCsv(
      entries.map((e) => ({
        line: e.line,
        time: e.ts === undefined ? '' : new Date(e.ts).toISOString(),
        level: e.level ?? '',
        component: e.component ?? '',
        message: e.message,
        fields: e.fields ? JSON.stringify(e.fields) : '',
      })),
      { columns: ['line', 'time', 'level', 'component', 'message', 'fields'] },
    );
  }
}
