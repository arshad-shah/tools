import { describe, expect, it } from 'vitest';
import { categoryPath, RESERVED_SLUGS, toolPath } from './routes';

describe('routes', () => {
  it('builds /<category>/<slug>', () => {
    expect(toolPath({ category: 'text', slug: 'regex' })).toBe('/text/regex');
  });
  it('builds hub paths', () => {
    expect(categoryPath('pdf')).toBe('/pdf');
  });
  it('reserves /pdf/edit for the workspace', () => {
    expect(RESERVED_SLUGS.pdf).toContain('edit');
  });
});
