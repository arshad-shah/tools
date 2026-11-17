import * as pkijs from 'pkijs';
import { ownBuffer } from '@/shared/lib/bytes';
import { ToolError } from '@/shared/lib/errors';
import { readExtensions, type ExtensionsView } from './extensions';
import { describeSpki, type KeyInfo } from './keys';
import { nameAttrs, nameText, type NameAttr } from './names';
import { named, SIGNATURE_ALGS } from './oids';

const EXTENSION_REQUEST = '1.2.840.113549.1.9.14';
const CHALLENGE_PASSWORD = '1.2.840.113549.1.9.7';

export interface CsrView {
  subject: NameAttr[];
  subjectText: string;
  key: KeyInfo;
  signatureAlgorithm: string;
  /** Extensions asked for in the extensionRequest attribute. */
  ext: ExtensionsView;
  /** Other attributes, by OID (a challenge password is named, never shown). */
  attributes: string[];
}

export function parseCsrDer(der: Uint8Array): pkijs.CertificationRequest {
  try {
    return pkijs.CertificationRequest.fromBER(ownBuffer(der));
  } catch (cause) {
    throw new ToolError(
      'INVALID_INPUT',
      'This block is not a valid certificate signing request',
      {
        cause,
      },
    );
  }
}

export function describeCsr(csr: pkijs.CertificationRequest): CsrView {
  const subject = nameAttrs(csr.subject);
  let exts: pkijs.Extension[] = [];
  const attributes: string[] = [];
  for (const a of csr.attributes ?? []) {
    if (a.type === EXTENSION_REQUEST) {
      const value = a.values[0];
      if (value) exts = new pkijs.Extensions({ schema: value }).extensions;
    } else
      attributes.push(
        a.type === CHALLENGE_PASSWORD
          ? 'Challenge password (present, not shown)'
          : a.type,
      );
  }
  return {
    subject,
    subjectText: nameText(subject),
    key: describeSpki(csr.subjectPublicKeyInfo),
    signatureAlgorithm: named(
      SIGNATURE_ALGS,
      csr.signatureAlgorithm.algorithmId,
    ),
    ext: readExtensions(exts),
    attributes,
  };
}
