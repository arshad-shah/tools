import * as asn1js from 'asn1js';
import { ownBuffer } from '@/shared/lib/bytes';
import { hex } from './names';
import { EXTENSIONS, KEY_ALGS, NAME_ATTRS, SIGNATURE_ALGS } from './oids';

export interface Asn1Node {
  id: string;
  label: string;
  /** A short value: a string, number, OID name or the first bytes. */
  value: string | null;
  children?: Asn1Node[];
}

/** Nodes at most, so a huge input stays responsive. */
export const NODE_CAP = 2000;
const PREVIEW_BYTES = 24;

const OID_NAMES = {
  ...NAME_ATTRS,
  ...SIGNATURE_ALGS,
  ...KEY_ALGS,
  ...EXTENSIONS,
};

const UNIVERSAL: Record<number, string> = {
  1: 'BOOLEAN',
  2: 'INTEGER',
  3: 'BIT STRING',
  4: 'OCTET STRING',
  5: 'NULL',
  6: 'OBJECT IDENTIFIER',
  10: 'ENUMERATED',
  12: 'UTF8String',
  16: 'SEQUENCE',
  17: 'SET',
  19: 'PrintableString',
  20: 'T61String',
  22: 'IA5String',
  23: 'UTCTime',
  24: 'GeneralizedTime',
  30: 'BMPString',
};

function tagName(b: asn1js.BaseBlock): string {
  const { tagClass, tagNumber } = b.idBlock;
  if (tagClass === 1) return UNIVERSAL[tagNumber] ?? `UNIVERSAL ${tagNumber}`;
  if (tagClass === 3) return `[${tagNumber}]`;
  if (tagClass === 2) return `APPLICATION ${tagNumber}`;
  return `PRIVATE ${tagNumber}`;
}

const preview = (bytes: Uint8Array) =>
  bytes.length > PREVIEW_BYTES
    ? `${hex(bytes.subarray(0, PREVIEW_BYTES), ' ')} ... (${bytes.length} bytes)`
    : hex(bytes, ' ');

function valueOf(b: asn1js.BaseBlock): string | null {
  if (b instanceof asn1js.ObjectIdentifier) {
    const oid = b.valueBlock.toString();
    return OID_NAMES[oid] ? `${OID_NAMES[oid]} (${oid})` : oid;
  }
  if (b instanceof asn1js.Integer) {
    const bytes = b.valueBlock.valueHexView;
    return bytes.length <= 6 ? String(b.valueBlock.valueDec) : preview(bytes);
  }
  if (b instanceof asn1js.Boolean) return String(b.valueBlock.value);
  if (b instanceof asn1js.Null) return null;
  if (b instanceof asn1js.UTCTime || b instanceof asn1js.GeneralizedTime)
    return b.toDate().toISOString();
  const v = (b.valueBlock as { value?: unknown }).value;
  if (typeof v === 'string') return v;
  const view = (b.valueBlock as { valueHexView?: Uint8Array }).valueHexView;
  if (view && view.length) return preview(view);
  return null;
}

/** The ASN.1 blocks a block's value holds (not OID arcs and the like). */
function blocksIn(b: asn1js.BaseBlock): asn1js.BaseBlock[] | null {
  const inner = (b.valueBlock as { value?: unknown }).value;
  if (!Array.isArray(inner)) return null;
  const blocks = inner.filter(
    (x): x is asn1js.BaseBlock => x instanceof asn1js.BaseBlock,
  );
  return blocks.length ? blocks : null;
}

/** Children of a primitive OCTET or BIT STRING that holds DER itself. */
function encapsulated(b: asn1js.BaseBlock): asn1js.BaseBlock[] | null {
  if (!(b instanceof asn1js.OctetString || b instanceof asn1js.BitString))
    return null;
  if (b.idBlock.isConstructed) return null;
  return blocksIn(b);
}

/**
 * The DER as a tree of tags, values and nested structures (contents of
 * OCTET and BIT STRINGs that hold DER are opened too). Returns null when
 * the bytes are not BER.
 */
export function asn1Tree(
  der: Uint8Array,
): { root: Asn1Node[]; truncated: boolean } | null {
  const parsed = asn1js.fromBER(ownBuffer(der));
  if (parsed.offset === -1) return null;
  let count = 0;
  let truncated = false;
  const walk = (b: asn1js.BaseBlock, path: string): Asn1Node => {
    count++;
    const node: Asn1Node = { id: path, label: tagName(b), value: valueOf(b) };
    const kids =
      encapsulated(b) ?? (b.idBlock.isConstructed ? blocksIn(b) : null);
    if (kids && kids.length) {
      node.children = [];
      for (let i = 0; i < kids.length; i++) {
        if (count >= NODE_CAP) {
          truncated = true;
          break;
        }
        node.children.push(walk(kids[i], `${path}.${i}`));
      }
      node.label = `${node.label} (${kids.length})`;
      if (encapsulated(b)) node.value = 'encapsulates';
    }
    return node;
  };
  return { root: [walk(parsed.result, '0')], truncated };
}
