import type { ExportOptions } from '@/pdf/doc/export-stages';
import type { SignatureExportOption } from '@/pdf/doc/export-stages/sign';
import { SIGN_AND_PROTECT_MESSAGE } from '@/pdf/doc/export-stages/encrypt';
import { protectionOf } from '@/pdf/doc/ops/protect';
import type { DocView } from '@/pdf/doc/types';
import type { SigningIdentity } from '@/pdf/sign/pades/pkcs12';

/** What the section edits; the identity is kept apart so it can be dropped. */
export interface SignatureSettings {
  placementOpId: string | null;
  reason: string;
  location: string;
  caption: boolean;
  timestamp: boolean;
  timestampUrl: string;
  summaryPage: boolean;
}

export const DEFAULT_SETTINGS: SignatureSettings = {
  placementOpId: null,
  reason: '',
  location: '',
  caption: true,
  timestamp: false,
  // No free TSA allows browser requests from any origin (decision G16).
  timestampUrl: '',
  summaryPage: false,
};

export const NEED_CERTIFICATE = 'Choose a certificate to sign with';
export const NEED_TSA = 'Enter a timestamp server that allows browser requests';

export const signingOn = (o: ExportOptions) => o.signatureOn === true;
export const identityOf = (o: ExportOptions) =>
  (o.signatureIdentity as SigningIdentity | '' | undefined) || null;
export const settingsOf = (o: ExportOptions): SignatureSettings => ({
  ...DEFAULT_SETTINGS,
  ...((o.signatureSettings as Partial<SignatureSettings> | undefined) ?? {}),
});

/** The stage's option, or null while signing is off or no certificate is chosen. */
export function composeSignature(
  on: boolean,
  identity: SigningIdentity | null,
  s: SignatureSettings,
): SignatureExportOption | null {
  if (!on || !identity) return null;
  return {
    identity,
    placementOpId: s.placementOpId,
    reason: s.reason,
    location: s.location,
    caption: s.caption,
    timestampUrl:
      s.timestamp && s.timestampUrl.trim() ? s.timestampUrl.trim() : null,
    summaryPage: s.summaryPage,
  };
}

/** Why the export can't run with these choices (plain words), or null. */
export function signingBlocker(
  o: ExportOptions,
  view: DocView | undefined,
): string | null {
  if (!signingOn(o)) return null;
  if (view && protectionOf(view)?.enabled) return SIGN_AND_PROTECT_MESSAGE;
  if (!identityOf(o)) return NEED_CERTIFICATE;
  const s = settingsOf(o);
  if (s.timestamp && !s.timestampUrl.trim()) return NEED_TSA;
  return null;
}
