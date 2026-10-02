/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  clearSessionSecrets,
  envVars,
  interpolate,
  toStoredEnvironments,
  withSessionSecrets,
  type Environment,
} from './env';

describe('interpolate', () => {
  it('fills variables, trimming spaces inside the braces', () => {
    expect(
      interpolate('{{base}}/u/{{ id }}', { base: 'https://x', id: '7' }),
    ).toEqual({ output: 'https://x/u/7', unresolved: [] });
  });
  it('lists a missing variable once and leaves it in place', () => {
    expect(interpolate('{{a}}-{{missing}}-{{missing}}', { a: '1' })).toEqual({
      output: '1-{{missing}}-{{missing}}',
      unresolved: ['missing'],
    });
  });
  it('keeps an escaped opening literal', () => {
    expect(interpolate('\\{{a}} {{a}}', { a: 'x' }).output).toBe('{{a}} x');
  });
  it('accepts an empty value as resolved', () => {
    expect(interpolate('[{{e}}]', { e: '' })).toEqual({
      output: '[]',
      unresolved: [],
    });
  });
});

describe('environments', () => {
  const env = (remember: boolean): Environment => ({
    id: 'e1',
    name: 'Dev',
    rememberSecrets: remember,
    vars: [
      { id: 'v1', key: 'base', value: 'https://x', secret: false },
      { id: 'v2', key: 'tok', value: 's3', secret: true },
    ],
  });

  it('strips secret values unless remembered, keeping them in memory', () => {
    const stored = toStoredEnvironments([env(false)]);
    expect(stored[0].vars.map((v) => v.value)).toEqual(['https://x', '']);
    expect(envVars(withSessionSecrets(stored)[0])).toEqual({
      base: 'https://x',
      tok: 's3',
    });
    clearSessionSecrets();
    expect(envVars(withSessionSecrets(stored)[0]).tok).toBe('');
  });

  it('keeps secret values when the environment remembers them', () => {
    expect(toStoredEnvironments([env(true)])[0].vars[1].value).toBe('s3');
  });

  it('writes no secret value to storage through the settings', async () => {
    localStorage.clear();
    const { httpSettings } = await import('../settings');
    const { result } = renderHook(() => httpSettings.useSettings());
    act(() =>
      result.current[1]({ environments: toStoredEnvironments([env(false)]) }),
    );
    const raw = localStorage.getItem('kit:store:tool:api-request') ?? '';
    expect(raw).not.toContain('s3');
    expect(raw).toContain('"key":"tok","value":""');
  });
});
