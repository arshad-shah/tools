// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sanitizeSvg } from './sanitize-svg';

describe('sanitizeSvg', () => {
  it('removes script, event handlers and external links, keeping shapes', () => {
    const { svg, removed } = sanitizeSvg(
      '<svg onload="x()"><script>1</script><image href="https://x/y.png"/><rect/></svg>',
    );
    expect(removed).toHaveLength(3);
    expect(svg).toContain('<rect');
    expect(svg).not.toMatch(/script|onload|https:/);
  });

  it('keeps fragment links and data images; removes foreignObject and xlink externals', () => {
    const { svg, removed } = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<use href="#a"/><image href="data:image/png;base64,AA=="/>' +
        '<use xlink:href="http://evil.example/s.svg#x"/>' +
        '<foreignObject><div>hi</div></foreignObject></svg>',
    );
    expect(removed).toEqual([
      'external link (http://evil.example/s.svg#x)',
      '<foreignObject> element',
    ]);
    expect(svg).toContain('href="#a"');
    expect(svg).toContain('data:image/png');
  });

  it('removes styles that load external resources', () => {
    const { removed } = sanitizeSvg(
      '<svg><style>@import url(https://x/a.css);</style>' +
        '<rect style="fill: url(https://x/p.svg#g)"/><circle style="fill: url(#local)"/></svg>',
    );
    expect(removed).toEqual([
      '<style> with external resources',
      'style attribute with external resources',
    ]);
  });

  it('refuses text that is not SVG', () => {
    expect(() => sanitizeSvg('<html></html>')).toThrow(/SVG/);
    expect(() => sanitizeSvg('<svg')).toThrow(/SVG/);
  });
});
