import { describe, expect, it } from 'vitest';
import { analyseCss } from './analyse';

const CSS = `
:root { --brand: #3366ff; }
.card { color: var(--brand); color: red; background: rgb(0 0 0 / 50%); }
#hero .title { padding: 0 !important; }
.empty {}
@media (max-width: 600px) { .card { color: white; } }
.card { margin: var(--missing); }
`;

describe('analyseCss', () => {
  const r = analyseCss(CSS);

  it('counts rules, selectors, declarations and at-rules', () => {
    expect(r.stats.rules).toBe(6);
    expect(r.stats.selectors).toBe(6);
    expect(r.stats.declarations).toBe(7);
    expect(r.stats.atRules).toEqual({ media: 1 });
    expect(r.stats.important).toBe(1);
    expect(r.stats.emptyRules).toBe(1);
    expect(r.stats.maxSpecificity).toEqual([1, 1, 0]);
  });

  it('lists selectors with specificity and their at-rule context', () => {
    const inMedia = r.selectors.find((s) => s.context !== '');
    expect(inMedia).toMatchObject({
      selector: '.card',
      specificity: [0, 1, 0],
      context: '@media (max-width:600px)',
    });
  });

  it('collects colours and custom properties', () => {
    expect(r.colours.map((c) => c.value)).toEqual(
      expect.arrayContaining(['#3366ff', 'rgb(0 0 0/50%)']),
    );
    expect(r.colourWords.map((c) => c.value)).toEqual(
      expect.arrayContaining(['red', 'white']),
    );
    expect(r.customProperties).toEqual([
      { name: '--brand', value: '#3366ff', line: 2 },
    ]);
  });

  it('reports the issues the parser can see', () => {
    const rules = r.issues.map((i) => i.rule);
    expect(rules).toEqual(
      expect.arrayContaining([
        'Repeated property',
        'Empty rule',
        '!important',
        'ID selector',
        'Duplicate selector',
        'Undefined variable',
      ]),
    );
    expect(
      r.issues.find((i) => i.rule === 'Undefined variable')?.message,
    ).toContain('--missing');
    // The rule in @media is a separate context, not a duplicate.
    expect(
      r.issues.filter((i) => i.rule === 'Duplicate selector'),
    ).toHaveLength(1);
  });

  it('reports syntax errors with a line', () => {
    const bad = analyseCss('.a { color: red;\n.b { color: }');
    expect(bad.issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('builds specimen markup for the selectors', () => {
    expect(r.specimen).toContain('<div class="card">');
    expect(r.specimen).toContain('<div id="hero">');
    expect(r.specimen).toContain('<div class="title">#hero .title</div>');
  });

  it('handles an empty stylesheet', () => {
    const e = analyseCss('');
    expect(e.stats).toMatchObject({ bytes: 0, lines: 0, rules: 0 });
    expect(e.specimen).toBe('');
  });
});
