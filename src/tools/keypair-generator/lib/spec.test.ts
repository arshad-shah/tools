import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPEC,
  familyOf,
  isSigning,
  joseAlg,
  joseUse,
  keyGenParams,
  specLabel,
  specSlug,
  type KeySpec,
} from './spec';

const spec = (patch: Partial<KeySpec>): KeySpec => ({
  ...DEFAULT_SPEC,
  ...patch,
});

describe('spec', () => {
  it('maps algorithms to WebCrypto parameters', () => {
    expect(
      keyGenParams(spec({ algorithm: 'RSA-OAEP', size: 4096 })),
    ).toMatchObject({
      name: 'RSA-OAEP',
      modulusLength: 4096,
      hash: 'SHA-256',
    });
    expect(keyGenParams(spec({ algorithm: 'ECDH', curve: 'P-521' }))).toEqual({
      name: 'ECDH',
      namedCurve: 'P-521',
    });
    expect(keyGenParams(spec({ algorithm: 'X25519' }))).toEqual({
      name: 'X25519',
    });
  });

  it('names the JOSE alg and use', () => {
    expect(
      joseAlg(spec({ algorithm: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' })),
    ).toBe('RS384');
    expect(joseAlg(spec({ algorithm: 'RSA-OAEP' }))).toBe('RSA-OAEP-256');
    expect(joseAlg(spec({ algorithm: 'ECDSA', curve: 'P-521' }))).toBe('ES512');
    expect(joseAlg(spec({ algorithm: 'X25519' }))).toBe('ECDH-ES');
    expect(joseUse('RSA-OAEP')).toBe('enc');
    expect(joseUse('Ed25519')).toBe('sig');
  });

  it('classifies and names specs', () => {
    expect(familyOf('ECDH')).toBe('ec');
    expect(isSigning('ECDH')).toBe(false);
    expect(isSigning('RSA-PSS')).toBe(true);
    expect(specSlug(spec({ algorithm: 'ECDSA', curve: 'P-384' }))).toBe(
      'ecdsa-p384',
    );
    expect(specSlug(spec({ algorithm: 'RSA-PSS', size: 2048 }))).toBe(
      'rsa-2048',
    );
    expect(specLabel(spec({ algorithm: 'Ed25519' }))).toBe('Ed25519');
    expect(specLabel(spec({ algorithm: 'ECDH', curve: 'P-256' }))).toBe(
      'ECDH P-256',
    );
  });
});
