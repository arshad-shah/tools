import type { ChainLink } from './chain';
import type { SignatureCheck } from './verify';
import { validityText, type Validity } from './x509';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusText {
  tone: Tone;
  label: string;
  detail: string;
}

export function signatureStatus(s: SignatureCheck): StatusText {
  switch (s.state) {
    case 'valid':
      return {
        tone: s.note ? 'warning' : 'success',
        label: 'Signature valid',
        detail: s.note ? `${s.algorithm}. ${s.note}.` : s.algorithm,
      };
    case 'invalid':
      return {
        tone: 'danger',
        label: 'Signature invalid',
        detail: `${s.algorithm}: ${s.reason}`,
      };
    case 'unsupported':
      return {
        tone: 'warning',
        label: 'Signature not checked',
        detail: s.reason,
      };
  }
}

/** What a chain link says, for a certificate's badge and notice. */
export function linkStatus(link: ChainLink | null): StatusText | null {
  if (!link) return null;
  if (link.signature) {
    const s = signatureStatus(link.signature);
    if (link.selfSigned && link.signature.state === 'valid')
      return {
        ...s,
        label: 'Self-signed',
        detail: `Signed with its own key (${s.detail})`,
      };
    return link.issuerMatchesNext
      ? {
          ...s,
          detail: `${s.detail}. Checked with the next certificate's key.`,
        }
      : s;
  }
  return {
    tone: link.issuerMatchesNext === false ? 'danger' : 'neutral',
    label:
      link.issuerMatchesNext === false ? 'Issuer mismatch' : 'Issuer not given',
    detail: link.notChecked ?? '',
  };
}

export function validityStatus(v: Validity): StatusText {
  const label = validityText(v);
  switch (v.state) {
    case 'valid':
      return { tone: 'success', label, detail: 'Within its validity period' };
    case 'expiring':
      return { tone: 'warning', label, detail: 'Renew it soon' };
    case 'expired':
      return { tone: 'danger', label, detail: 'No longer valid' };
    case 'not-yet-valid':
      return {
        tone: 'warning',
        label,
        detail: 'Its validity period has not started',
      };
  }
}

/** A date and time in UTC, as certificates state them. */
export const utc = (d: Date) =>
  `${d
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, '')} UTC`;
