import { describe, expect, it } from 'vitest';
import { parseUrl } from './parse-url';

describe('parseUrl', () => {
  it('splits a full URL', () => {
    expect(parseUrl('https://u:p@x.test:8080/a?b=1&c=2#c')).toEqual({
      isValid: true,
      parsed: {
        protocol: 'https:',
        username: 'u',
        password: 'p',
        hostname: 'x.test',
        port: '8080',
        pathname: '/a',
        search: '?b=1&c=2',
        hash: '#c',
        origin: 'https://x.test:8080',
        host: 'x.test:8080',
        searchParams: [
          ['b', '1'],
          ['c', '2'],
        ],
      },
    });
  });
  it('rejects a non-URL', () => {
    expect(parseUrl('nope')).toEqual({ parsed: null, isValid: false });
    expect(parseUrl('')).toEqual({ parsed: null, isValid: false });
  });
});
