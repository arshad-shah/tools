import { describe, expect, it } from 'vitest';
import {
  CATEGORY_LABEL,
  TEMPLATES,
  findTemplate,
  groupTemplates,
  sampleTextFor,
  searchTemplates,
} from './templates';

describe('TEMPLATES', () => {
  it('has 40 entries with unique names', () => {
    expect(TEMPLATES).toHaveLength(40);
    expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length);
  });

  it.each(TEMPLATES.map((t) => [t.name, t] as const))(
    '%s compiles with its flags and matches one of its samples',
    (_name, t) => {
      const re = new RegExp(t.pattern, t.flags);
      expect(t.description).toBeTruthy();
      expect(
        t.samples.some((s) => new RegExp(re.source, re.flags).test(s)),
      ).toBe(true);
    },
  );

  it('labels every category', () => {
    for (const t of TEMPLATES) expect(CATEGORY_LABEL[t.category]).toBeTruthy();
  });
});

describe('groupTemplates', () => {
  it('groups every template by category in label order', () => {
    const g = groupTemplates();
    expect(Object.keys(g)).toEqual(['web', 'validation', 'format', 'common']);
    expect(g.web[0].name).toBe('Email Address');
    expect(Object.values(g).flat()).toHaveLength(TEMPLATES.length);
  });
});

describe('findTemplate and searchTemplates', () => {
  it('finds by name or returns undefined', () => {
    expect(findTemplate('UUID')?.category).toBe('format');
    expect(findTemplate('')).toBeUndefined();
  });
  it('searches name, description and pattern', () => {
    expect(searchTemplates('postcode').map((t) => t.name)).toEqual([
      'UK Postcode',
    ]);
    expect(searchTemplates('  ')).toHaveLength(TEMPLATES.length);
    expect(searchTemplates('zzzz-nothing')).toEqual([]);
  });
});

describe('sampleTextFor', () => {
  it('joins the template samples', () => {
    expect(sampleTextFor('Email Address')).toMatch(/^Contact us/);
    expect(sampleTextFor('Email Address').split('\n')).toHaveLength(3);
  });
  it('falls back to a generic text', () => {
    expect(sampleTextFor('nope')).toMatch(/^Lorem ipsum/);
  });
});
