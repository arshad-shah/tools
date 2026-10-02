import { ToolError } from '@/shared/lib/errors';
import {
  indexOf,
  lastIndexOf,
  readValue,
  skipWs,
  toHex,
  type PdfValue,
} from './syntax';

/** The last cross-reference section of a file, which an increment chains to. */
export interface PdfTail {
  /** Offset of the last xref section. */
  startxref: number;
  kind: 'table' | 'stream';
  /** Trailer /Size. */
  size: number;
  root: { num: number; gen: number };
  info: { num: number; gen: number } | null;
  /** Hex strings without brackets. */
  id: [string, string] | null;
  /** The trailer has /Encrypt. */
  encrypted: boolean;
}

const unreadable = (cause?: unknown) =>
  new ToolError(
    'INVALID_FILE',
    "This PDF's structure could not be read for signing",
    { cause },
  );

const ref = (v: PdfValue | undefined) =>
  v?.t === 'ref' ? { num: v.num, gen: v.gen } : null;

/** Reads `startxref`, then the trailer (table) or the xref stream dictionary there. */
export function readTail(bytes: Uint8Array): PdfTail {
  try {
    const at = lastIndexOf(bytes, 'startxref');
    if (at < 0 || at < bytes.length - 2048) throw unreadable();
    const [off] = readValue(bytes, at + 'startxref'.length);
    if (off.t !== 'num' || off.v < 0 || off.v >= bytes.length)
      throw unreadable();
    const startxref = off.v;
    const i = skipWs(bytes, startxref);
    let kind: PdfTail['kind'];
    let dict: Map<string, PdfValue>;
    if (indexOf(bytes, 'xref', i) === i) {
      kind = 'table';
      const t = indexOf(bytes, 'trailer', i);
      if (t < 0) throw unreadable();
      const [d] = readValue(bytes, t + 'trailer'.length);
      if (d.t !== 'dict') throw unreadable();
      dict = d.v;
    } else {
      kind = 'stream';
      // "n g obj << ... >>"
      const [num, a] = readValue(bytes, i);
      const [gen, b] = readValue(bytes, a);
      const o = skipWs(bytes, b);
      if (num.t !== 'num' || gen.t !== 'num' || indexOf(bytes, 'obj', o) !== o)
        throw unreadable();
      const [d] = readValue(bytes, o + 3);
      const type = d.t === 'dict' ? d.v.get('Type') : undefined;
      if (d.t !== 'dict' || type?.t !== 'name' || type.v !== 'XRef')
        throw unreadable();
      dict = d.v;
    }
    const size = dict.get('Size');
    const root = ref(dict.get('Root'));
    if (size?.t !== 'num' || !root) throw unreadable();
    const idArr = dict.get('ID');
    const id =
      idArr?.t === 'arr' &&
      idArr.v.length === 2 &&
      idArr.v.every((x) => x.t === 'str')
        ? ([
            toHex((idArr.v[0] as { v: Uint8Array }).v),
            toHex((idArr.v[1] as { v: Uint8Array }).v),
          ] as [string, string])
        : null;
    return {
      startxref,
      kind,
      size: size.v,
      root,
      info: ref(dict.get('Info')),
      id,
      encrypted: dict.has('Encrypt'),
    };
  } catch (e) {
    if (e instanceof ToolError) throw e;
    throw unreadable(e);
  }
}
