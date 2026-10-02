import { describe, expect, it } from 'vitest';
import { detectLanguage } from './detect';

describe('detectLanguage', () => {
  it.each([
    ['{"a":1}', 'json'],
    ['[1, 2]', 'json'],
    ['<html>', 'html'],
    ['<!DOCTYPE html><p>x</p>', 'html'],
    ['<div><p>x</p></div>', 'html'],
    ['<?xml version="1.0"?><a/>', 'xml'],
    ['<note><to>x</to></note>', 'xml'],
    ['SELECT', 'sql'],
    ['select a, b from t where x = 1', 'sql'],
    ['query { user { id } }', 'graphql'],
    ['name: app\nversion: 2', 'yaml'],
    ['# Title\n\nSome text', 'markdown'],
    ['body { color: red; }', 'css'],
    ['$c: red;\n.a { &:hover { color: $c; } }', 'scss'],
    ['const a = (b: string) => b;', 'typescript'],
    ['interface A { b: number }', 'typescript'],
    ['const A = () => <div>hi</div>;', 'jsx'],
    ['const A = (p: Props) => <div>{p.x}</div>;', 'tsx'],
    ['const a = {b: 1}', 'javascript'],
    ['', 'javascript'],
  ])('%j is %s', (code, lang) => {
    expect(detectLanguage(code)).toBe(lang);
  });

  it('uses the file extension first', () => {
    expect(detectLanguage('x', 'a.scss')).toBe('scss');
    expect(detectLanguage('{"a":1}', 'data.yml')).toBe('yaml');
    expect(detectLanguage('x', 'Component.TSX')).toBe('tsx');
  });
});
