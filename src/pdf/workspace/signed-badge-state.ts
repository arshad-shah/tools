import type { SignatureReport } from '@/pdf/sign/pades/verify';

/**
 * The "Signed" badge's tone: danger when any signature is broken or not
 * valid, accent only when every one chains to an imported root and covers
 * the whole file, warning otherwise (self-signed, unknown issuer, changed
 * after signing).
 */
export function signedBadgeTone(
  reports: SignatureReport[],
): 'accent' | 'warning' | 'danger' {
  if (reports.some((r) => r.integrity !== 'intact' || !r.signatureValid))
    return 'danger';
  if (
    reports.every(
      (r) => r.trust === 'trusted' && r.coverage === 'whole-document',
    )
  )
    return 'accent';
  return 'warning';
}
