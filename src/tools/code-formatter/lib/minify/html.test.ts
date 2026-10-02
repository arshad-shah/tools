import { describe, expect, it } from 'vitest';
import { minifyHtml } from './html';

describe('minifyHtml', () => {
  it('keeps pre content intact', () => {
    expect(minifyHtml('<div>\n  <pre>  a\n b</pre>\n</div>')).toBe(
      '<div> <pre>  a\n b</pre> </div>',
    );
  });

  it('keeps textarea, script and style content', () => {
    const src =
      '<textarea>  x\n  y</textarea><script>\n  if (a  <  b) {}\n</script><style>\n a  { }\n</style>';
    expect(minifyHtml(src)).toBe(src);
  });

  it('removes comments but keeps conditional ones', () => {
    expect(minifyHtml('<p>a</p><!-- x --><p>b</p>')).toBe('<p>a</p><p>b</p>');
    expect(minifyHtml('<!--[if IE]><p>old</p><![endif]-->')).toBe(
      '<!--[if IE]><p>old</p><![endif]-->',
    );
  });

  it('collapses text whitespace to one space', () => {
    expect(minifyHtml('<p> a  b </p>')).toBe('<p> a b </p>');
    expect(minifyHtml('<ul>\n  <li>x</li>\n  <li>y</li>\n</ul>')).toBe(
      '<ul> <li>x</li> <li>y</li> </ul>',
    );
  });

  it('collapses whitespace inside tags but keeps quoted values', () => {
    expect(minifyHtml('<a   href="a  b"\n   class=\'c\'  >x</a>')).toBe(
      '<a href="a  b" class=\'c\'>x</a>',
    );
    expect(minifyHtml('<br   />')).toBe('<br/>');
  });

  it('keeps the doctype and optional tags', () => {
    expect(
      minifyHtml('<!DOCTYPE   html>\n<html><body><p>a<p>b</body></html>'),
    ).toBe('<!DOCTYPE html> <html><body><p>a<p>b</body></html>');
  });
});
