/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { bytesToBase64, utf8Encode } from '@/shared/lib/encoding';
import type { DecodedJWT } from '../types';
import { decodeJwt } from '../lib/jwt';
import { SAMPLE_JWT, SAMPLE_SECRET } from '../lib/constants';
import { useSignatureVerification } from './useSignatureVerification';

const part = (v: unknown) =>
  bytesToBase64(utf8Encode(JSON.stringify(v)), { urlSafe: true });
const token = (header: Record<string, unknown>) =>
  decodeJwt(`${part(header)}.${part({ sub: 'x' })}.c2ln`);

const sample = decodeJwt(SAMPLE_JWT);

const setup = (initial: DecodedJWT | null) =>
  renderHook(({ decoded }) => useSignatureVerification(decoded), {
    initialProps: { decoded: initial },
  });

describe('useSignatureVerification', () => {
  it('starts unverified, and does nothing without a token', async () => {
    const { result } = setup(null);
    expect(result.current.sigStatus).toEqual({ state: 'unverified' });
    await act(() => result.current.handleVerify());
    expect(result.current.sigStatus).toEqual({ state: 'unverified' });
  });

  it('reports an alg "none" token as unsigned', () => {
    const { result } = setup(token({ alg: 'none' }));
    expect(result.current.unsigned).toBe(true);
    expect(result.current.sigStatus).toEqual({ state: 'unsigned' });
  });

  it('defaults the key type from the algorithm, and follows a new one', () => {
    const { result, rerender } = setup(sample);
    expect(result.current.hmacAlg).toBe(true);
    expect(result.current.keyKind).toBe('secret');

    rerender({ decoded: token({ alg: 'RS256' }) });
    expect(result.current.hmacAlg).toBe(false);
    expect(result.current.keyKind).toBe('pem');
  });

  it('lets the user override the default key type', () => {
    const { result } = setup(sample);
    act(() => result.current.setKeyKind('jwk'));
    expect(result.current.keyKind).toBe('jwk');
  });

  it('verifies the sample with its secret', async () => {
    const { result } = setup(sample);
    act(() => result.current.setKeyText(SAMPLE_SECRET));
    await act(() => result.current.handleVerify());
    expect(result.current.sigStatus).toEqual({ state: 'verified' });
  });

  it('reports a wrong secret as invalid', async () => {
    const { result } = setup(sample);
    act(() => result.current.setKeyText('not-the-secret'));
    await act(() => result.current.handleVerify());
    expect(result.current.sigStatus).toEqual({ state: 'invalid' });
  });

  it('only keeps a result for the exact key it checked', async () => {
    const { result } = setup(sample);
    act(() => result.current.setKeyText(SAMPLE_SECRET));
    await act(() => result.current.handleVerify());
    expect(result.current.sigStatus.state).toBe('verified');

    act(() => result.current.setSecretEncoding('base64'));
    expect(result.current.sigStatus).toEqual({ state: 'unverified' });
    act(() => result.current.setSecretEncoding('text'));
    expect(result.current.sigStatus).toEqual({ state: 'verified' });

    act(() => result.current.setKeyText(`${SAMPLE_SECRET}x`));
    expect(result.current.sigStatus).toEqual({ state: 'unverified' });
  });

  it('only keeps a result for the exact token it checked', async () => {
    const { result, rerender } = setup(sample);
    act(() => result.current.setKeyText(SAMPLE_SECRET));
    await act(() => result.current.handleVerify());
    expect(result.current.sigStatus.state).toBe('verified');

    rerender({ decoded: token({ alg: 'HS256' }) });
    expect(result.current.sigStatus).toEqual({ state: 'unverified' });
  });

  it('turns a verification failure into an error status', async () => {
    const { result } = setup(token({ alg: 'RS256' }));
    act(() => result.current.setKeyText('not a pem'));
    await act(() => result.current.handleVerify());
    await waitFor(() => expect(result.current.sigStatus.state).toBe('error'));
    const status = result.current.sigStatus;
    expect(status.state === 'error' && status.message.length).toBeGreaterThan(
      0,
    );
  });
});
