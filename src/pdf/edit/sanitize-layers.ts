import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFName,
  PDFRawStream,
  PDFRef,
  PDFStream,
  type PDFDocument,
  type PDFObject,
} from 'pdf-lib';
import { parseContent } from '@/pdf/edit/content/lexer';
import { resolve } from '@/pdf/edit/content/pdf-obj';
import { serializeContent } from '@/pdf/edit/content/serialize';
import type { ContentOp, ParsedContent } from '@/pdf/edit/content/tokens';
import { pageContentBytes, setPageContent } from '@/pdf/redact/page';

/*
 * Sanitise "Hidden layers" (plan E-10, review I3): optional content that is
 * OFF by default goes, wherever it is drawn (page content, Form XObjects,
 * XObjects and annotations carrying /OC), whether named directly or through
 * an optional content membership dictionary (OCMD). A group leaves
 * /OCProperties only once nothing references it any more.
 */

const N = PDFName.of;
const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

const dict = (doc: PDFDocument, o: PDFObject | undefined) => {
  const v = resolve(doc, o);
  if (v instanceof PDFStream) return v.dict;
  return v instanceof PDFDict ? v : undefined;
};

const refs = (doc: PDFDocument, o: PDFObject | undefined): PDFRef[] => {
  if (o instanceof PDFRef) {
    const v = doc.context.lookup(o);
    // A ref to an array of groups is resolved; a ref to a group is the group.
    return v instanceof PDFArray ? refs(doc, v) : [o];
  }
  if (o instanceof PDFArray) return o.asArray().flatMap((x) => refs(doc, x));
  return [];
};

/** Whether `/OC` value `o` (a group or an OCMD) is hidden by default. */
function makeHidden(doc: PDFDocument, off: Set<string>) {
  const isOff = (r: PDFRef) => off.has(r.tag);
  return (o: PDFObject | undefined): boolean => {
    if (!o) return false;
    if (o instanceof PDFRef && off.has(o.tag)) return true;
    const d = dict(doc, o);
    if (!d || d.get(N('Type')) !== N('OCMD')) return false;
    const groups = refs(doc, d.get(N('OCGs')));
    if (!groups.length) return false;
    const policy = resolve(doc, d.get(N('P')));
    const p = policy instanceof PDFName ? policy.decodeText() : 'AnyOn';
    const on = groups.map((g) => !isOff(g));
    const visible =
      p === 'AllOn'
        ? on.every(Boolean)
        : p === 'AnyOff'
          ? on.some((v) => !v)
          : p === 'AllOff'
            ? on.every((v) => !v)
            : on.some(Boolean);
    return !visible;
  };
}

type Hidden = ReturnType<typeof makeHidden>;

interface Walk {
  doc: PDFDocument;
  hidden: Hidden;
  seen: Set<string>;
  failed: boolean;
}

/** Strips hidden blocks and draws from `ops`; recurses into forms in place. */
function stripOps(
  w: Walk,
  ops: ContentOp[],
  resources: PDFDict | undefined,
  depth: number,
): ContentOp[] {
  const { doc, hidden } = w;
  const props = dict(doc, resources?.get(N('Properties')));
  const xobjects = dict(doc, resources?.get(N('XObject')));
  const stack: boolean[] = [];
  const out: ContentOp[] = [];
  for (const op of ops) {
    const inHidden = stack.some(Boolean);
    if (op.op === 'BDC' || op.op === 'BMC') {
      const [tag, prop] = op.operands;
      const isHidden =
        op.op === 'BDC' &&
        tag?.t === 'name' &&
        tag.v === 'OC' &&
        prop?.t === 'name' &&
        hidden(props?.get(N(prop.v)));
      stack.push(isHidden);
      if (!inHidden && !isHidden) out.push(op);
      continue;
    }
    if (op.op === 'EMC') {
      const was = stack.pop();
      if (!inHidden || (!was && !stack.some(Boolean))) out.push(op);
      continue;
    }
    if (inHidden) continue;
    if (op.op === 'Do' && op.operands[0]?.t === 'name') {
      const ref = xobjects?.get(N(op.operands[0].v));
      const x = dict(doc, ref);
      if (x && hidden(x.get(N('OC')))) continue;
      if (x && x.get(N('Subtype')) === N('Form') && ref instanceof PDFRef)
        stripForm(w, ref, resources, depth + 1);
    }
    out.push(op);
  }
  return out;
}

/** Hidden content inside a form goes everywhere the form is used (in place). */
function stripForm(
  w: Walk,
  ref: PDFRef,
  inherited: PDFDict | undefined,
  depth: number,
) {
  if (w.seen.has(ref.tag) || depth > 12) return;
  w.seen.add(ref.tag);
  const stream = w.doc.context.lookup(ref);
  if (!(stream instanceof PDFRawStream)) return;
  let parsed: ParsedContent;
  try {
    parsed = parseContent(decodePDFRawStream(stream).decode());
  } catch {
    w.failed = true;
    return;
  }
  const own = dict(w.doc, stream.dict.get(N('Resources')));
  const res = own ?? inherited;
  const ops = stripOps(w, parsed.ops, res, depth);
  // The form's content no longer names its hidden groups.
  const props = dict(w.doc, own?.get(N('Properties')));
  for (const [key, value] of props?.entries() ?? [])
    if (w.hidden(value)) props!.delete(key);
  if (ops.length === parsed.ops.length) return;
  const next = w.doc.context.flateStream(
    serializeContent({ ops, tail: parsed.tail }),
  );
  for (const [k, v] of stream.dict.entries())
    if (!['Filter', 'DecodeParms', 'Length'].includes(k.decodeText()))
      next.dict.set(k, v);
  w.doc.context.assign(ref, next);
}

/** Group refs still named by reachable objects: /OC, /Properties and OCMD /OCGs. */
function referencedGroups(doc: PDFDocument): Set<string> {
  const out = new Set<string>();
  const note = (o: PDFObject | undefined) => {
    for (const r of refs(doc, o)) {
      const d = dict(doc, r);
      if (d?.get(N('Type')) === N('OCMD'))
        refs(doc, d.get(N('OCGs'))).forEach((g) => out.add(g.tag));
      else out.add(r.tag);
    }
  };
  const seen = new Set<string>();
  // The catalog's /OCProperties lists every group: not a use.
  const stack: PDFObject[] = doc.catalog
    .entries()
    .filter(([k]) => k.decodeText() !== 'OCProperties')
    .map(([, v]) => v);
  while (stack.length) {
    const o = stack.pop()!;
    if (o instanceof PDFRef) {
      if (seen.has(o.tag)) continue;
      seen.add(o.tag);
      const v = doc.context.lookup(o);
      if (v) stack.push(v);
      continue;
    }
    const d = o instanceof PDFStream ? o.dict : o instanceof PDFDict ? o : null;
    if (d) {
      note(d.get(N('OC')));
      const props = dict(doc, d.get(N('Properties')));
      for (const v of props?.values() ?? []) note(v);
      stack.push(...d.values());
    } else if (o instanceof PDFArray) stack.push(...o.asArray());
  }
  return out;
}

export function removeHiddenLayers(
  doc: PDFDocument,
  out: string[],
  notes: string[],
) {
  const oc = dict(doc, doc.catalog.get(N('OCProperties')));
  const d = dict(doc, oc?.get(N('D')));
  const offRefs = refs(doc, d?.get(N('OFF')));
  if (!oc || offRefs.length === 0) return;
  const hidden = makeHidden(doc, new Set(offRefs.map((r) => r.tag)));
  const w: Walk = { doc, hidden, seen: new Set(), failed: false };
  let pages = 0;
  let annots = 0;
  doc.getPages().forEach((page, i) => {
    const a = resolve(doc, page.node.get(N('Annots')));
    if (a instanceof PDFArray) {
      const kept = a
        .asArray()
        .filter((r) => !hidden(dict(doc, r)?.get(N('OC'))));
      if (kept.length !== a.size()) {
        annots += a.size() - kept.length;
        page.node.set(N('Annots'), doc.context.obj(kept));
      }
    }
    const bytes = pageContentBytes(doc, page);
    let parsed: ParsedContent;
    try {
      if (!bytes) throw new Error('unreadable');
      parsed = parseContent(bytes);
    } catch {
      notes.push(
        `Hidden layers were left on page ${i + 1}: its content could not be read safely`,
      );
      return;
    }
    const resources = page.node.Resources();
    const ops = stripOps(w, parsed.ops, resources, 0);
    const props = dict(doc, resources?.get(N('Properties')));
    for (const [key, value] of props?.entries() ?? [])
      if (hidden(value)) props!.delete(key);
    if (ops.length === parsed.ops.length) return;
    setPageContent(doc, page, { ops, tail: parsed.tail });
    pages++;
  });
  if (w.failed)
    notes.push(
      'Some hidden layer content inside a form could not be read safely and was left',
    );
  // Groups still named somewhere stay: their content was not all removed.
  const still = referencedGroups(doc);
  const gone = new Set(
    offRefs.filter((r) => !still.has(r.tag)).map((r) => r.tag),
  );
  const drop = (o: PDFObject | undefined): PDFObject[] | null => {
    const v = resolve(doc, o);
    if (!(v instanceof PDFArray)) return null;
    return v
      .asArray()
      .filter((x) => !(x instanceof PDFRef && gone.has(x.tag)))
      .map((x) => {
        const inner = x instanceof PDFArray ? drop(x) : null;
        return inner ? doc.context.obj(inner) : x;
      });
  };
  for (const target of [oc, d]) {
    if (!target) continue;
    for (const key of ['OCGs', 'Order', 'ON', 'OFF', 'Locked', 'RBGroups']) {
      const kept = drop(target.get(N(key)));
      if (kept) target.set(N(key), doc.context.obj(kept));
    }
  }
  if (pages) out.push(`Hidden layer content on ${plural(pages, 'page')}`);
  if (annots)
    out.push(
      plural(
        annots,
        'annotation in a hidden layer',
        'annotations in hidden layers',
      ),
    );
  if (gone.size) out.push(plural(gone.size, 'hidden layer'));
  if (gone.size < offRefs.length)
    notes.push(
      `${plural(offRefs.length - gone.size, 'hidden layer')} kept: still used by content that could not be cleaned`,
    );
}
