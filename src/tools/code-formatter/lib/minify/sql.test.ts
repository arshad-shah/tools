import { describe, expect, it } from 'vitest';
import { minifySql } from './sql';

describe('minifySql', () => {
  it('removes line comments without merging tokens', () => {
    expect(minifySql("select 'a  b' -- c\nfrom t")).toBe(
      "select 'a  b' from t",
    );
  });

  it('removes block comments and keeps MySQL hints', () => {
    expect(minifySql('select /* x */ a\n\n  from   t')).toBe('select a from t');
    expect(minifySql('select /*! STRAIGHT_JOIN */ a')).toBe(
      'select /*! STRAIGHT_JOIN */ a',
    );
  });

  it('keeps strings and quoted identifiers verbatim', () => {
    expect(
      minifySql(
        `select "a  b", [c  d], \`e  f\`, 'it''s  -- not a comment'  from t`,
      ),
    ).toBe(`select "a  b", [c  d], \`e  f\`, 'it''s  -- not a comment' from t`);
  });

  it('keeps dollar-quoted bodies', () => {
    expect(minifySql('create function f() as $$\n  select  1;\n$$')).toBe(
      'create function f() as $$\n  select  1;\n$$',
    );
  });
});
