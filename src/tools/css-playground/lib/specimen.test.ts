import { syntax } from 'csso';
import { describe, expect, it } from 'vitest';
import { SpecimenBuilder, type SelectorPart } from './specimen';

function build(...selectors: string[]) {
  const b = new SpecimenBuilder();
  for (const s of selectors) {
    const ast = syntax.parse(s, { context: 'selector' }) as unknown as {
      children: { toArray(): SelectorPart[] };
    };
    b.add(ast.children.toArray(), s);
  }
  return b.html();
}

describe('SpecimenBuilder', () => {
  it('nests descendants and merges shared ancestors', () => {
    expect(build('.card', '.card .title', '.card > p')).toBe(
      [
        '<div class="card">',
        '  .card',
        '  <div class="title">.card .title</div>',
        '  <p>.card &gt; p</p>',
        '</div>',
      ].join('\n'),
    );
  });

  it('places siblings next to each other', () => {
    expect(build('h2 + p')).toBe('<h2></h2>\n<p>h2 + p</p>');
  });

  it('turns attributes and states into real elements', () => {
    expect(build('input[type="checkbox"]:checked')).toBe(
      '<input type="checkbox" checked placeholder="input[type=&quot;checkbox&quot;]:checked">',
    );
    expect(build('a.link:hover')).toBe(
      '<a class="link" href="#">a.link:hover</a>',
    );
  });

  it('drops document-level tags and fills lists', () => {
    expect(build('body .x', ':root', 'ul.nav')).toBe(
      [
        '<div class="x">body .x</div>',
        '<ul class="nav">',
        '  <li>ul.nav</li>',
        '  <li>Second item</li>',
        '  <li>Third item</li>',
        '</ul>',
      ].join('\n'),
    );
  });

  it('escapes text so a selector cannot inject markup', () => {
    expect(build('[data-x="<b>"]')).toBe(
      '<div data-x="&lt;b&gt;">[data-x="&lt;b&gt;"]</div>',
    );
  });
});
