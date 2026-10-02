import { useEffect, useRef, useState } from 'react';
import {
  parseJsonWithLocations,
  parseXml,
  parseYaml,
  type JsonWarning,
} from '@/shared/lib/data-formats';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { createTextWorker } from '@/shared/workers/text-client';
import type { DocFormat } from '../lib/detect-format';
import {
  fromFlat,
  fromJson,
  fromValue,
  fromXml,
  type DocNode,
} from '../lib/doc-model';

/** Inputs over this many UTF-16 units parse in the text worker. */
export const WORKER_THRESHOLD = 1_000_000;
export const PARSE_DEBOUNCE_MS = 150;

export type ParseError = ToolError & { line?: number; column?: number };

export interface ParsedDocument {
  doc: DocNode | null;
  value: unknown;
  xml: Document | null;
  error: ParseError | null;
  warnings: JsonWarning[];
  parsing: boolean;
}

const EMPTY: ParsedDocument = {
  doc: null,
  value: undefined,
  xml: null,
  error: null,
  warnings: [],
  parsing: false,
};

/** Line and column from the error's fields, or from its message. */
export function withPosition(e: unknown): ParseError {
  const err = toToolError(e) as ParseError;
  if (err.line === undefined) {
    const m = /at line (\d+), column (\d+)/.exec(err.message);
    if (m) {
      err.line = Number(m[1]);
      err.column = Number(m[2]);
    }
  }
  return err;
}

let worker: ReturnType<typeof createTextWorker> | null = null;

/**
 * The viewer's own killable worker: a JSON parse cannot observe its abort
 * signal, so a superseded parse is stopped by terminating this instance,
 * never another tool's shared worker.
 */
function parseWorker() {
  worker ??= createTextWorker();
  return worker;
}

async function parse(
  text: string,
  format: DocFormat,
  signal: AbortSignal,
): Promise<Omit<ParsedDocument, 'parsing' | 'error'>> {
  if (format === 'xml') {
    const xml = parseXml(text);
    return { doc: fromXml(xml, text), value: undefined, xml, warnings: [] };
  }
  if (format === 'yaml') {
    const value = await parseYaml(text);
    return { doc: fromValue(value), value, xml: null, warnings: [] };
  }
  if (text.length > WORKER_THRESHOLD) {
    // The worker validates and returns offsets as typed arrays; the value
    // comes from the native parser, far cheaper than cloning it back.
    const { flat, warnings } = await parseWorker().call(
      'json.parseFlat',
      [text],
      { signal },
    );
    const value: unknown = JSON.parse(text);
    return { doc: fromFlat(value, flat), value, xml: null, warnings };
  }
  const { value, root, warnings } = parseJsonWithLocations(text);
  return { doc: fromJson(value, root), value, xml: null, warnings };
}

/**
 * Live, debounced parsing of the editor text (spec §7.2). Large JSON parses
 * in the text worker; a result for text that has since changed is dropped.
 * While a new parse runs, the previous document stays with `parsing: true`.
 */
export function useParsedDocument(
  text: string,
  format: DocFormat,
): ParsedDocument {
  const [state, setState] = useState<ParsedDocument>(EMPTY);
  const run = useRef(0);

  useEffect(() => {
    const id = ++run.current;
    const ctrl = new AbortController();
    if (!text.trim()) {
      const t = setTimeout(() => setState(EMPTY), 0);
      return () => clearTimeout(t);
    }
    const mark = setTimeout(
      () => setState((s) => (s.parsing ? s : { ...s, parsing: true })),
      0,
    );
    const timer = setTimeout(() => {
      parse(text, format, ctrl.signal).then(
        (r) => {
          if (id === run.current)
            setState({ ...r, error: null, parsing: false });
        },
        (e: unknown) => {
          if (id !== run.current || ctrl.signal.aborted) return;
          setState({ ...EMPTY, error: withPosition(e) });
        },
      );
    }, PARSE_DEBOUNCE_MS);
    return () => {
      clearTimeout(mark);
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text, format]);

  return state;
}
