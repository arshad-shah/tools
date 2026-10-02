/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { applyAuth } from './auth';
import { buildRequest } from './http';
import { emptyRequest } from './model';

const target = () => ({ url: 'https://a.test/x', headers: new Headers() });

describe('applyAuth', () => {
  it('basic is Base64 of user:pass through UTF-8', () => {
    const out = applyAuth(target(), {
      kind: 'basic',
      user: 'Jörg',
      pass: 'p:w',
    });
    // btoa of the UTF-8 bytes of "Jörg:p:w"
    expect(out.headers.get('authorization')).toBe('Basic SsO2cmc6cDp3');
  });
  it('bearer sets the header', () => {
    const out = applyAuth(target(), { kind: 'bearer', token: 'abc' });
    expect(out.headers.get('authorization')).toBe('Bearer abc');
  });
  it('API key goes in a header or the query', () => {
    expect(
      applyAuth(target(), {
        kind: 'apikey',
        name: 'X-Api',
        value: 'k1',
        in: 'header',
      }).headers.get('x-api'),
    ).toBe('k1');
    expect(
      applyAuth(target(), {
        kind: 'apikey',
        name: 'api key',
        value: 'k 1',
        in: 'query',
      }).url,
    ).toBe('https://a.test/x?api+key=k+1');
  });
  it('none leaves the request alone', () => {
    const out = applyAuth(target(), { kind: 'none' });
    expect(out.url).toBe('https://a.test/x');
    expect([...out.headers]).toEqual([]);
  });
  it('buildRequest interpolates and applies auth', () => {
    const r = buildRequest(
      emptyRequest({
        url: 'https://a.test',
        auth: { kind: 'bearer', token: '{{tok}}' },
      }),
      { tok: 't1' },
    );
    expect(r.init.headers.get('authorization')).toBe('Bearer t1');
  });
});
