import { describe, expect, it } from 'vitest';
import { optimiseCss } from './optimise';

describe('optimiseCss', () => {
  const css = `/*! licence */\n/* note */\n.a { color: #ffffff; margin: 0px 0px; }\n.b { color: #ffffff; margin: 0px 0px; }\n`;

  it('minifies, merges and reports sizes', () => {
    const r = optimiseCss(css);
    expect(r.css).toBe('/*! licence */\n.a,.b{color:#fff;margin:0}');
    expect(r.after).toBeLessThan(r.before);
    expect(r.gzipBefore).toBeGreaterThan(0);
    expect(r.gzipAfter).toBeGreaterThan(0);
  });

  it('respects the options', () => {
    const r = optimiseCss(css, {
      restructure: false,
      forceMediaMerge: false,
      keepLicenceComments: false,
    });
    expect(r.css).toBe('.a{color:#fff;margin:0 0}.b{color:#fff;margin:0 0}');
  });
});
