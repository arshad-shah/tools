import type { PDFObject } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import type { PdfTail } from './tail';
import { ascii, concatBytes } from './syntax';

/** One indirect object of an increment: the full "n g obj ... endobj\n". */
export interface IncrementObject {
  num: number;
  gen: number;
  bytes: Uint8Array;
}

/** A pdf-lib object written as an indirect object, the way pdf-lib saves it. */
export function serializeObject(
  num: number,
  gen: number,
  obj: PDFObject,
): Uint8Array {
  const body = new Uint8Array(obj.sizeInBytes());
  obj.copyBytesInto(body, 0);
  return concatBytes([ascii(`${num} ${gen} obj\n`), body, ascii('\nendobj\n')]);
}

const pad = (n: number, w: number) => String(n).padStart(w, '0');

/** Runs of consecutive object numbers: [first, count][]. */
function subsections(nums: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const n of [...nums].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && last[0] + last[1] === n) last[1]++;
    else out.push([n, 1]);
  }
  return out;
}

const refStr = (r: { num: number; gen: number }) => `${r.num} ${r.gen} R`;

/**
 * Appends an incremental update (ISO 32000-1 §7.5.6): the new or changed
 * objects, then a cross-reference section of the same kind as the file's
 * last one, chained with /Prev. The original bytes stay an exact prefix,
 * so earlier signatures keep covering what they signed.
 */
export function appendIncrement(
  original: Uint8Array,
  objects: IncrementObject[],
  tail: PdfTail,
): Uint8Array {
  if (tail.encrypted)
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'Encrypted PDFs cannot be signed here. Remove the password first.',
    );
  const parts: Uint8Array[] = [original];
  let offset = original.length;
  const last = original[original.length - 1];
  if (last !== 0x0a && last !== 0x0d) {
    parts.push(ascii('\n'));
    offset++;
  }
  const entries = new Map<number, { offset: number; gen: number }>();
  for (const o of objects) {
    entries.set(o.num, { offset, gen: o.gen });
    parts.push(o.bytes);
    offset += o.bytes.length;
  }
  const maxNum = Math.max(0, ...entries.keys());
  const trailerKeys = (size: number) =>
    [
      `/Size ${size}`,
      `/Root ${refStr(tail.root)}`,
      tail.info ? `/Info ${refStr(tail.info)}` : '',
      tail.id ? `/ID [<${tail.id[0]}><${tail.id[1]}>]` : '',
      `/Prev ${tail.startxref}`,
    ]
      .filter(Boolean)
      .join(' ');

  if (tail.kind === 'table') {
    const size = Math.max(tail.size, maxNum + 1);
    let xref = 'xref\n';
    for (const [first, count] of subsections([...entries.keys()])) {
      xref += `${first} ${count}\n`;
      for (let n = first; n < first + count; n++) {
        const e = entries.get(n)!;
        xref += `${pad(e.offset, 10)} ${pad(e.gen, 5)} n\r\n`;
      }
    }
    parts.push(
      ascii(
        `${xref}trailer\n<< ${trailerKeys(size)} >>\nstartxref\n${offset}\n%%EOF\n`,
      ),
    );
    return concatBytes(parts);
  }

  // Cross-reference stream: it lists itself too.
  const self = Math.max(tail.size, maxNum + 1);
  entries.set(self, { offset, gen: 0 });
  const sections = subsections([...entries.keys()]);
  const rows = new Uint8Array(entries.size * 7);
  let r = 0;
  for (const [first, count] of sections)
    for (let n = first; n < first + count; n++) {
      const e = entries.get(n)!;
      rows[r] = 1;
      new DataView(rows.buffer).setUint32(r + 1, e.offset);
      new DataView(rows.buffer).setUint16(r + 5, e.gen);
      r += 7;
    }
  const index = sections.map(([f, c]) => `${f} ${c}`).join(' ');
  parts.push(
    ascii(
      `${self} 0 obj\n<< /Type /XRef ${trailerKeys(self + 1)} /W [1 4 2] /Index [${index}] /Length ${rows.length} >>\nstream\n`,
    ),
    rows,
    ascii(`\nendstream\nendobj\nstartxref\n${offset}\n%%EOF\n`),
  );
  return concatBytes(parts);
}
