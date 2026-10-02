import { describe, expect, it } from 'vitest';
import {
  CATEGORY_LABEL,
  TEMPLATES,
  findTemplate,
  groupTemplates,
  sampleTextFor,
} from './templates';

describe('TEMPLATES', () => {
  it('has unique names and patterns that compile', () => {
    expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES)
      expect(() => new RegExp(t.pattern)).not.toThrow();
  });

  it('labels every category', () => {
    for (const t of TEMPLATES) expect(CATEGORY_LABEL[t.category]).toBeTruthy();
  });
});

describe('groupTemplates', () => {
  it('groups templates by category in label order', () => {
    const g = groupTemplates();
    expect(Object.keys(g)).toEqual(['web', 'validation', 'format', 'common']);
    expect(g.web.map((t) => t.name)).toEqual([
      'Email Address',
      'HTTP/HTTPS URL',
      'IPv4 Address',
    ]);
    expect(g.common.map((t) => t.name)).toEqual(['Phone Number (E.164)']);
    expect(Object.values(g).flat()).toHaveLength(TEMPLATES.length);
  });
});

describe('findTemplate', () => {
  it('finds by name or returns undefined', () => {
    expect(findTemplate('UUID')?.category).toBe('format');
    expect(findTemplate('')).toBeUndefined();
  });
});

describe('sampleTextFor', () => {
  it('matches the template it was picked for', () => {
    for (const name of [
      'Email Address',
      'HTTP/HTTPS URL',
      'IPv4 Address',
      'Phone Number (E.164)',
      'Date (ISO 8601)',
      'Time (24-hour)',
      'Hex Color Code',
    ]) {
      const t = findTemplate(name)!;
      expect(new RegExp(t.pattern).test(sampleTextFor(name))).toBe(true);
    }
  });

  it('picks by keyword in the order email, url/http, phone, date, time, ipv4, password, hex', () => {
    expect(sampleTextFor('Email Address')).toMatch(/^Contact us/);
    expect(sampleTextFor('HTTP/HTTPS URL')).toMatch(/^Visit/);
    expect(sampleTextFor('Phone Number (E.164)')).toMatch(/^\+1234567890\n/);
    expect(sampleTextFor('Date (ISO 8601)')).toMatch(/^Meeting: 2023/);
    expect(sampleTextFor('Time (24-hour)')).toMatch(/^Meeting at/);
    expect(sampleTextFor('IPv4 Address')).toMatch(/^192\.168/);
    expect(sampleTextFor('Strong Password')).toMatch(/^Weak:/);
    expect(sampleTextFor('Hex Color Code')).toMatch(/^#FF5733/);
    // Earlier keywords win: "date" beats "time".
    expect(sampleTextFor('date time')).toMatch(/^Meeting: 2023/);
  });

  it('falls back to a generic text', () => {
    expect(sampleTextFor('UUID')).toMatch(/^Lorem ipsum/);
    expect(sampleTextFor('Credit Card Number')).toMatch(/^Lorem ipsum/);
  });
});
