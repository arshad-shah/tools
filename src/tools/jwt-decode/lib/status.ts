import type { KeyInput, SignatureStatus, Tone } from '../types';
import { formatTime } from './claims';
import type { TimeStatus } from './jwt';

export const sameKey = (a: KeyInput, b: KeyInput) =>
  a.kind === b.kind &&
  a.value === b.value &&
  (a.kind !== 'secret' || b.kind !== 'secret' || a.encoding === b.encoding);

export const SIGNATURE_TEXT: Record<
  SignatureStatus['state'],
  { title: string; detail: string; tone: Tone }
> = {
  unsigned: {
    title: 'Unsigned token (alg: none)',
    detail:
      'This token has no signature, so nothing proves who issued it or that it was not changed. Treat its claims as untrusted.',
    tone: 'warning',
  },
  unverified: {
    title: 'Signature not verified',
    detail:
      'Decoding does not prove the token is genuine. Add the secret or public key in the Signature tab to verify it.',
    tone: 'neutral',
  },
  checking: {
    title: 'Checking signature',
    detail: 'Verifying with the key you entered.',
    tone: 'neutral',
  },
  verified: {
    title: 'Signature verified',
    detail: 'The signature matches the key you entered.',
    tone: 'success',
  },
  invalid: {
    title: 'Signature invalid',
    detail:
      'The signature does not match this key. The token was altered or signed with a different key.',
    tone: 'danger',
  },
  error: {
    title: 'Signature could not be checked',
    detail: '',
    tone: 'danger',
  },
};

export const timeText = (
  status: TimeStatus,
): {
  title: string;
  detail: string;
  tone: Tone;
} => {
  const at = (s?: number) => (s === undefined ? '' : formatTime(s));
  switch (status.state) {
    case 'none':
      return {
        title: 'No time claims',
        detail: 'The token has no exp, nbf or iat claim.',
        tone: 'neutral',
      };
    case 'expired':
      return {
        title: 'Expired',
        detail: `Expired on ${at(status.exp)}.`,
        tone: 'danger',
      };
    case 'not-yet-valid':
      return {
        title: 'Not valid yet',
        detail: `Not before ${at(status.nbf)}.`,
        tone: 'danger',
      };
    case 'issued-in-future':
      return {
        title: 'Issued in the future',
        detail: `Issued at ${at(status.iat)}, which is ahead of this device's clock. Check the clock skew setting or the issuer's clock.`,
        tone: 'danger',
      };
    case 'current':
      return {
        title: 'Within validity window',
        detail:
          status.exp !== undefined
            ? `Expires ${at(status.exp)}.`
            : 'No expiry (exp) claim.',
        tone: 'success',
      };
  }
};
