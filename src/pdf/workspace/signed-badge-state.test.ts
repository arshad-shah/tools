import { describe, expect, it } from 'vitest';
import type { SignatureReport } from '@/pdf/sign/pades/verify';
import { signedBadgeTone } from './signed-badge-state';

const report = (patch: Partial<SignatureReport>) =>
  ({
    integrity: 'intact',
    signatureValid: true,
    coverage: 'whole-document',
    trust: 'trusted',
    ...patch,
  }) as SignatureReport;

describe('signedBadgeTone', () => {
  it('is accent only when every signature is trusted and covers the file', () => {
    expect(signedBadgeTone([report({})])).toBe('accent');
    expect(signedBadgeTone([report({ trust: 'self-signed' })])).toBe('warning');
    expect(signedBadgeTone([report({ trust: 'untrusted-issuer' })])).toBe(
      'warning',
    );
    expect(
      signedBadgeTone([report({ coverage: 'changed-after-signing' })]),
    ).toBe('warning');
    expect(signedBadgeTone([report({}), report({ integrity: 'broken' })])).toBe(
      'danger',
    );
    expect(signedBadgeTone([report({ signatureValid: false })])).toBe('danger');
  });
});
