import type { SignatureReport } from '@/pdf/sign/pades/verify';

/**
 * Where the time comes from. A timestamp server is named only when its
 * token verified against an imported root (plan review I3).
 */
export function timeSourceText(
  r: Pick<SignatureReport, 'time' | 'timestampValid' | 'timestampVerified'>,
): string {
  if (r.time.source === 'timestamp' && r.timestampVerified)
    return 'Time from a trusted timestamp server';
  if (r.timestampValid) return 'Timestamp not verified';
  // /M is whatever the signer's software wrote: not necessarily this device.
  return 'Time stated by the signer (not verified)';
}
