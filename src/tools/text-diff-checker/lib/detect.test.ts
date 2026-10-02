import { describe, expect, it } from 'vitest';
import { detectLanguage } from './detect';

describe('detectLanguage', () => {
  it('uses the file extension first', () => {
    expect(detectLanguage('anything', 'a.YML')).toBe('yaml');
    expect(detectLanguage('{}', 'notes.md')).toBe('markdown');
  });
  it.each([
    ['{"a": 1}', 'json'],
    ['<?xml version="1.0"?><a/>', 'xml'],
    ['<!DOCTYPE html><html></html>', 'html'],
    ['SELECT * FROM t', 'sql'],
    ['# Title\n\n- item', 'markdown'],
    ['import x from "y";', 'js'],
    ['name: demo\nport: 80', 'yaml'],
    ['just some words', 'plain'],
    ['', 'plain'],
    ['{not json', 'plain'],
  ])('sniffs %j as %s', (text, lang) => {
    expect(detectLanguage(text)).toBe(lang);
  });
});
