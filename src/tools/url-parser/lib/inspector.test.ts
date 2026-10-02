import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../../test/helpers/settings-guard';
import { URL_DEFAULTS } from '../settings';
import { parseUrlShare, secretQueryKeys, toUrlShare } from '../share';
import { asUriList, toHttpClient, urlFromHandoff } from './actions';
import { cleanUrl, DEFAULT_TRACKING, matchesPattern } from './clean';
import { domainParts } from './domain';
import { parseUrlModel } from './model';

describe('domainParts', () => {
  it('splits a multi-part public suffix', async () => {
    expect(await domainParts('a.b.example.co.uk')).toEqual({
      subdomain: 'a.b',
      domain: 'example.co.uk',
      publicSuffix: 'co.uk',
      isIcann: true,
    });
  });
  it('knows private suffixes and IPs', async () => {
    expect(await domainParts('me.github.io')).toMatchObject({
      domain: 'me.github.io',
      isIcann: false,
    });
    expect(await domainParts('127.0.0.1')).toBeNull();
  });
});

describe('cleanUrl', () => {
  it('removes tracking params and lists them', () => {
    expect(
      cleanUrl('https://x/?utm_source=a&id=1&fbclid=2', DEFAULT_TRACKING),
    ).toEqual({ url: 'https://x/?id=1', removed: ['utm_source', 'fbclid'] });
  });
  it('keeps the fragment and drops an emptied query', () => {
    expect(cleanUrl('https://x/p?gclid=1#top', DEFAULT_TRACKING)).toEqual({
      url: 'https://x/p#top',
      removed: ['gclid'],
    });
  });
  it('matches * as a suffix wildcard, case-insensitively', () => {
    expect(matchesPattern('UTM_Medium', 'utm_*')).toBe(true);
    expect(matchesPattern('xutm_a', 'utm_*')).toBe(false);
  });
});

describe('share', () => {
  it('strips the userinfo password', () => {
    expect(toUrlShare('https://u:secret@a.test/x').url).toBe(
      'https://u@a.test/x',
    );
    expect(parseUrlShare({ v: 1, url: 'https://u:p@a.test/' })?.url).toBe(
      'https://u@a.test/',
    );
    expect(parseUrlShare({ v: 2, url: 'x' })).toBeNull();
  });
  it('flags secret-looking query keys such as token and sig', () => {
    expect(
      secretQueryKeys(
        'https://a.test/?token=1&page=2&sig=3&access_token=4&keyboard=5',
      ),
    ).toEqual(['token', 'sig', 'access_token']);
  });
  it('settings hold no data fields', () => {
    assertNoDataFields(URL_DEFAULTS);
  });
});

describe('actions', () => {
  it('sends a GET with params to the HTTP Client', () => {
    const p = toHttpClient(parseUrlModel('https://a.test/x?q=1&r=2#h'));
    if (p.kind !== 'text') throw new Error('text expected');
    expect(p.mime).toBe('application/vnd.tools.http-request+json');
    expect(JSON.parse(p.text)).toEqual({
      method: 'GET',
      url: 'https://a.test/x',
      params: [
        ['q', '1'],
        ['r', '2'],
      ],
    });
  });
  it('reads a URL from a uri-list hand-off', () => {
    expect(
      urlFromHandoff({
        kind: 'text',
        mime: 'text/uri-list',
        sourceTool: 'x',
        text: '# comment\nhttps://a.test/\nhttps://b.test/',
      }),
    ).toBe('https://a.test/');
    expect(asUriList('https://a.test')).toMatchObject({
      mime: 'text/uri-list',
    });
  });
});
