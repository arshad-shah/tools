import * as asn1js from 'asn1js';
import type * as pkijs from 'pkijs';
import { NAME_ATTRS } from './oids';

export interface NameAttr {
  /** Short name (CN, O) or the OID. */
  short: string;
  oid: string;
  value: string;
}

/** Bytes as lower-case hex, optionally separated. */
export const hex = (bytes: Uint8Array, sep = '') =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(sep);

/** The text of an ASN.1 string value (any string type), else its hex. */
export function valueText(v: unknown): string {
  const block = (v as { valueBlock?: { value?: unknown } })?.valueBlock;
  if (typeof block?.value === 'string') return block.value;
  if (v instanceof asn1js.BaseBlock)
    return `#${hex(new Uint8Array(v.toBER(false)))}`;
  return String(v ?? '');
}

export function nameAttrs(name: pkijs.RelativeDistinguishedNames): NameAttr[] {
  return name.typesAndValues.map((t) => ({
    short: NAME_ATTRS[t.type] ?? t.type,
    oid: t.type,
    value: valueText(t.value),
  }));
}

/** "CN=example.com, O=Example" in the certificate's order. */
export const nameText = (attrs: NameAttr[]) =>
  attrs.map((a) => `${a.short}=${a.value}`).join(', ');

/** The first value of an attribute, such as the common name. */
export const attr = (attrs: NameAttr[], short: string) =>
  attrs.find((a) => a.short === short)?.value ?? '';

/** IPv4 or IPv6 bytes as text (an iPAddress general name). */
export function ipText(bytes: Uint8Array): string {
  if (bytes.length === 4) return Array.from(bytes).join('.');
  if (bytes.length === 16) {
    const groups: string[] = [];
    for (let i = 0; i < 16; i += 2)
      groups.push(((bytes[i] << 8) | bytes[i + 1]).toString(16));
    return groups.join(':').replace(/(^|:)0(:0)+(:|$)/, '::');
  }
  // Name constraints carry an address and a mask (8 or 32 bytes).
  if (bytes.length === 8 || bytes.length === 32) {
    const half = bytes.length / 2;
    return `${ipText(bytes.subarray(0, half))}/${ipText(bytes.subarray(half))}`;
  }
  return hex(bytes, ':');
}

export interface GeneralNameView {
  type: 'DNS' | 'IP' | 'Email' | 'URI' | 'Directory' | 'Other';
  value: string;
}

/** A GeneralName (SAN entry, AIA location) in words. */
export function generalName(g: pkijs.GeneralName): GeneralNameView {
  switch (g.type) {
    case 1:
      return { type: 'Email', value: String(g.value) };
    case 2:
      return { type: 'DNS', value: String(g.value) };
    case 6:
      return { type: 'URI', value: String(g.value) };
    case 7: {
      const os = g.value as asn1js.OctetString;
      return { type: 'IP', value: ipText(os.valueBlock.valueHexView) };
    }
    case 4:
      return {
        type: 'Directory',
        value: nameText(nameAttrs(g.value as pkijs.RelativeDistinguishedNames)),
      };
    default:
      return { type: 'Other', value: `type ${g.type}` };
  }
}
