import { describe, expect, it } from 'vitest';
import { buildPayload, DEFAULT_FIELDS, etherToWei, geoProblem } from '.';

describe('WiFi payload', () => {
  it.each([
    ['plain', 'Home', 'pw', 'WIFI:T:WPA;S:Home;P:pw;;'],
    ['semicolon', 'my;net', 'a;b', 'WIFI:T:WPA;S:my\\;net;P:a\\;b;;'],
    ['comma', 'a,b', 'c', 'WIFI:T:WPA;S:a\\,b;P:c;;'],
    ['colon', 'a:b', 'c', 'WIFI:T:WPA;S:a\\:b;P:c;;'],
    ['quote', '"q"', 'p"w', 'WIFI:T:WPA;S:\\"q\\";P:p\\"w;;'],
    ['backslash', 'a\\b', 'c', 'WIFI:T:WPA;S:a\\\\b;P:c;;'],
  ])('escapes %s', (_, ssid, password, out) => {
    expect(
      buildPayload('wifi', { ssid, password, security: 'WPA', hidden: false }),
    ).toBe(out);
  });
  it('writes hidden, open, WEP and WPA3 networks', () => {
    const f = { ssid: 'N', password: 'p', hidden: true };
    expect(buildPayload('wifi', { ...f, security: 'nopass' })).toBe(
      'WIFI:T:nopass;S:N;H:true;;',
    );
    expect(buildPayload('wifi', { ...f, security: 'WEP' })).toBe(
      'WIFI:T:WEP;S:N;P:p;H:true;;',
    );
    expect(buildPayload('wifi', { ...f, security: 'WPA3' })).toBe(
      'WIFI:T:WPA;R:1;S:N;P:p;H:true;;',
    );
  });
});

describe('vCard payload', () => {
  it('escapes a comma in the org and has N and FN', () => {
    const v = buildPayload('vcard', {
      ...DEFAULT_FIELDS.vcard,
      firstName: 'Ada',
      lastName: 'Lovelace',
      org: 'Engines, Ltd; R&D',
      email: 'ada@example.com',
      note: 'line1\nline2',
    });
    const lines = v.split('\n');
    expect(lines).toContain('N:Lovelace;Ada;;;');
    expect(lines).toContain('FN:Ada Lovelace');
    expect(lines).toContain('ORG:Engines\\, Ltd\\; R&D');
    expect(lines).toContain('NOTE:line1\\nline2');
    expect(lines[0]).toBe('BEGIN:VCARD');
    expect(lines[1]).toBe('VERSION:3.0');
    expect(lines.at(-1)).toBe('END:VCARD');
  });
});

describe('MeCard payload', () => {
  it('writes N as last,first and escapes', () => {
    expect(
      buildPayload('mecard', {
        ...DEFAULT_FIELDS.mecard,
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '123',
        note: 'a;b',
      }),
    ).toBe('MECARD:N:Lovelace,Ada;TEL:123;NOTE:a\\;b;;');
  });
});

describe('crypto payloads', () => {
  it('uses bitcoin: (not btc:) with BIP-21 amount, label and message', () => {
    expect(
      buildPayload('crypto', {
        ...DEFAULT_FIELDS.crypto,
        coin: 'BTC',
        address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        amount: '0.1',
        label: 'Ada Shop',
      }),
    ).toBe(
      'bitcoin:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh?amount=0.1&label=Ada%20Shop',
    );
  });
  it('maps every coin to its URI scheme', () => {
    const f = { ...DEFAULT_FIELDS.crypto, address: 'X' };
    expect(buildPayload('crypto', { ...f, coin: 'LTC' })).toBe('litecoin:X');
    expect(buildPayload('crypto', { ...f, coin: 'DOGE' })).toBe('dogecoin:X');
    expect(buildPayload('crypto', { ...f, coin: 'BCH' })).toBe('bitcoincash:X');
  });
  it('writes Ethereum with the chain id and the value in wei', () => {
    expect(
      buildPayload('crypto', {
        ...DEFAULT_FIELDS.crypto,
        coin: 'ETH',
        address: '0xAbC0000000000000000000000000000000000001',
        amount: '0.5',
        chainId: '137',
      }),
    ).toBe(
      'ethereum:0xAbC0000000000000000000000000000000000001@137?value=500000000000000000',
    );
    expect(etherToWei('1.000000000000000001')).toBe('1000000000000000001');
    expect(etherToWei('abc')).toBeNull();
  });
});

describe('event payload', () => {
  it('writes UTC DTSTART and DTEND', () => {
    const v = buildPayload('event', {
      title: 'Launch, v2',
      start: '2026-10-02T10:30:00+01:00',
      end: '2026-10-02T11:00:00Z',
      location: '',
      description: '',
    });
    expect(v.split('\n')).toEqual([
      'BEGIN:VEVENT',
      'SUMMARY:Launch\\, v2',
      'DTSTART:20261002T093000Z',
      'DTEND:20261002T110000Z',
      'END:VEVENT',
    ]);
  });
});

describe('other payloads', () => {
  it('mailto encodes subject and body', () => {
    expect(
      buildPayload('email', { to: 'a@b.c', subject: 'Hi there', body: 'a&b' }),
    ).toBe('mailto:a@b.c?subject=Hi%20there&body=a%26b');
  });
  it('SMS, phone, geo and app links', () => {
    expect(
      buildPayload('sms', { phone: '+44 (20) 1', message: 'yo: hi' }),
    ).toBe('SMSTO:+44201:yo: hi');
    expect(buildPayload('tel', { phone: '+1 555-1234' })).toBe('tel:+15551234');
    expect(
      buildPayload('geo', { lat: '52.52', lon: '13.405', label: '' }),
    ).toBe('geo:52.52,13.405');
    expect(geoProblem({ lat: '91', lon: '0', label: '' })).toMatch(/Latitude/);
    expect(buildPayload('app', { store: 'apple', appId: 'id123' })).toBe(
      'https://apps.apple.com/app/id123',
    );
    expect(buildPayload('app', { store: 'google', appId: 'com.x.y' })).toBe(
      'https://play.google.com/store/apps/details?id=com.x.y',
    );
  });
});
