import { describe, expect, it } from 'vitest';
import { icsFor, interpret, vcfFor } from './interpret';

const field = (r: ReturnType<typeof interpret>, label: string) =>
  r.fields.find(([l]) => l === label)?.[1];

describe('interpret', () => {
  it('reads WiFi with escaped separators', () => {
    const r = interpret('WIFI:T:WPA;S:my\\;net;P:p\\"w;;');
    expect(r.kind).toBe('wifi');
    expect(field(r, 'Network name')).toBe('my;net');
    expect(field(r, 'Password')).toBe('p"w');
    expect(field(r, 'Security')).toBe('WPA');
    expect(r.secret).toBe('p"w');
  });

  it('reads vCard fields, unfolding long lines', () => {
    const r = interpret(
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'N:Lovelace;Ada;;;',
        'FN:Ada Lovelace',
        'ORG:Analytical\\, Engines',
        'TEL;TYPE=CELL:+44 20 7946 0000',
        'EMAIL:ada@example.com',
        'NOTE:first line\\nsecond',
        ' continued',
        'END:VCARD',
      ].join('\r\n'),
    );
    expect(r.kind).toBe('vcard');
    expect(field(r, 'Name')).toBe('Ada Lovelace');
    expect(field(r, 'Organisation')).toBe('Analytical, Engines');
    expect(field(r, 'Phone')).toBe('+44 20 7946 0000');
    expect(field(r, 'Email')).toBe('ada@example.com');
    expect(field(r, 'Note')).toBe('first line\nsecondcontinued');
    expect(r.actions).toContain('vcf');
  });

  it('reads a MeCard and makes a vCard from it', () => {
    const text = 'MECARD:N:Lovelace,Ada;TEL:123;EMAIL:a@b.c;;';
    const r = interpret(text);
    expect(r.kind).toBe('mecard');
    expect(field(r, 'Name')).toBe('Ada Lovelace');
    expect(vcfFor(text)).toContain('FN:Ada Lovelace');
  });

  it('reads a BIP-21 bitcoin URI with an amount', () => {
    const r = interpret(
      'bitcoin:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh?amount=0.1&label=Shop',
    );
    expect(r.kind).toBe('crypto');
    expect(field(r, 'Currency')).toBe('Bitcoin');
    expect(field(r, 'Amount')).toBe('0.1');
    expect(field(r, 'Label')).toBe('Shop');
  });

  it('reads an Ethereum URI with chain id and value', () => {
    const r = interpret(
      'ethereum:0xAbC0000000000000000000000000000000000001@1?value=1e18',
    );
    expect(field(r, 'Chain id')).toBe('1');
    expect(field(r, 'Value (wei)')).toBe('1e18');
  });

  it('reads VEVENT fields and wraps it as a calendar file', () => {
    const text = [
      'BEGIN:VEVENT',
      'SUMMARY:Launch',
      'DTSTART:20261002T090000Z',
      'DTEND:20261002T100000Z',
      'LOCATION:Room 1',
      'END:VEVENT',
    ].join('\n');
    const r = interpret(text);
    expect(r.kind).toBe('event');
    expect(field(r, 'Title')).toBe('Launch');
    expect(field(r, 'Starts')).toBe('2026-10-02 09:00 UTC');
    expect(field(r, 'Location')).toBe('Room 1');
    expect(r.actions).toContain('ics');
    expect(icsFor(text)).toMatch(/^BEGIN:VCALENDAR\r\nVERSION:2.0\r\n/);
  });

  it('recognises URLs, mail, SMS, phone and geo', () => {
    const url = interpret('https://example.com/a?b=1');
    expect(url.kind).toBe('url');
    expect(url.actions).toEqual([
      'copy',
      'open',
      'url-inspector',
      'text-encoder',
    ]);
    const mail = interpret('mailto:a@b.c?subject=Hi%20there&body=Yo');
    expect(mail.kind).toBe('email');
    expect(field(mail, 'Subject')).toBe('Hi there');
    expect(interpret('MATMSG:TO:a@b.c;SUB:S;BODY:B;;').kind).toBe('email');
    const sms = interpret('SMSTO:+123:hello');
    expect([sms.kind, field(sms, 'Message')]).toEqual(['sms', 'hello']);
    expect(interpret('tel:+15551234').kind).toBe('tel');
    const geo = interpret('geo:52.52,13.405');
    expect([geo.kind, field(geo, 'Latitude'), field(geo, 'Longitude')]).toEqual(
      ['geo', '52.52', '13.405'],
    );
  });

  it('falls back to plain text', () => {
    const r = interpret('just words');
    expect(r).toEqual({
      kind: 'text',
      fields: [['Text', 'just words']],
      actions: ['copy', 'text-encoder'],
    });
  });
});
