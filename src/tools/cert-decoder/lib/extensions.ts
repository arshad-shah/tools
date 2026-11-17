import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import {
  ACCESS_METHODS,
  EKUS,
  EXTENSIONS,
  KEY_USAGE_BITS,
  named,
  POLICIES,
} from './oids';
import { generalName, hex, type GeneralNameView } from './names';

export interface ExtensionsView {
  sans: GeneralNameView[];
  keyUsage: string[];
  extKeyUsage: string[];
  basicConstraints: { ca: boolean; pathLen: number | null } | null;
  subjectKeyId: string | null;
  authorityKeyId: string | null;
  /** OCSP and CA issuer URLs: shown as text, never fetched. */
  aia: { method: string; location: string }[];
  crl: string[];
  policies: { oid: string; name: string }[];
  /** Every extension, with its name and whether it is critical. */
  all: { oid: string; name: string; critical: boolean; known: boolean }[];
}

const SAN = '2.5.29.17';
const KU = '2.5.29.15';
const EKU = '2.5.29.37';
const BC = '2.5.29.19';
const SKI = '2.5.29.14';
const AKI = '2.5.29.35';
const AIA = '1.3.6.1.5.5.7.1.1';
const CRL = '2.5.29.31';
const POL = '2.5.29.32';

/** Bits set in a BIT STRING, as indexes (0 is the first bit). */
function bitsSet(bits: asn1js.BitString): number[] {
  const bytes = bits.valueBlock.valueHexView;
  const out: number[] = [];
  bytes.forEach((byte, i) => {
    for (let b = 0; b < 8; b++) if (byte & (0x80 >> b)) out.push(i * 8 + b);
  });
  return out;
}

const pathLenOf = (bc: pkijs.BasicConstraints): number | null => {
  const len = bc.pathLenConstraint;
  if (typeof len === 'number') return len;
  if (len instanceof asn1js.Integer) return len.valueBlock.valueDec;
  return null;
};

/**
 * The extensions pkijs parses, in plain terms. Unparsed or unknown ones
 * still appear in `all`, so nothing is hidden.
 */
export function readExtensions(exts: pkijs.Extension[] = []): ExtensionsView {
  const view: ExtensionsView = {
    sans: [],
    keyUsage: [],
    extKeyUsage: [],
    basicConstraints: null,
    subjectKeyId: null,
    authorityKeyId: null,
    aia: [],
    crl: [],
    policies: [],
    all: [],
  };
  for (const e of exts) {
    const p = e.parsedValue as unknown;
    view.all.push({
      oid: e.extnID,
      name: named(EXTENSIONS, e.extnID),
      critical: !!e.critical,
      known: e.extnID in EXTENSIONS,
    });
    if (!p) continue;
    switch (e.extnID) {
      case SAN:
        view.sans = (p as pkijs.AltName).altNames.map(generalName);
        break;
      case KU:
        view.keyUsage = bitsSet(p as asn1js.BitString).map(
          (i) => KEY_USAGE_BITS[i] ?? `Bit ${i}`,
        );
        break;
      case EKU:
        view.extKeyUsage = (p as pkijs.ExtKeyUsage).keyPurposes.map((o) =>
          EKUS[o] ? `${EKUS[o]} (${o})` : o,
        );
        break;
      case BC: {
        const bc = p as pkijs.BasicConstraints;
        view.basicConstraints = { ca: !!bc.cA, pathLen: pathLenOf(bc) };
        break;
      }
      case SKI:
        view.subjectKeyId = hex(
          (p as asn1js.OctetString).valueBlock.valueHexView,
          ':',
        );
        break;
      case AKI: {
        const id = (p as pkijs.AuthorityKeyIdentifier).keyIdentifier;
        view.authorityKeyId = id ? hex(id.valueBlock.valueHexView, ':') : null;
        break;
      }
      case AIA:
        view.aia = (p as pkijs.InfoAccess).accessDescriptions.map((d) => ({
          method: named(ACCESS_METHODS, d.accessMethod),
          location: generalName(d.accessLocation).value,
        }));
        break;
      case CRL:
        view.crl = (
          p as pkijs.CRLDistributionPoints
        ).distributionPoints.flatMap((dp) =>
          Array.isArray(dp.distributionPoint)
            ? dp.distributionPoint.map((g) => generalName(g).value)
            : [],
        );
        break;
      case POL:
        view.policies = (
          p as pkijs.CertificatePolicies
        ).certificatePolicies.map((pi) => ({
          oid: pi.policyIdentifier,
          name: named(POLICIES, pi.policyIdentifier),
        }));
        break;
    }
  }
  return view;
}
