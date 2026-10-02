/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SandboxedHtml, type SandboxedHtmlHandle } from './sandboxed-html';
import { PRINT_SANDBOX, countRemoteImages } from './sandboxed-html-doc';

const frame = () => screen.getByTitle('Preview') as HTMLIFrameElement;

describe('SandboxedHtml', () => {
  it('renders an iframe with sandbox="" and a title', () => {
    render(<SandboxedHtml html="<p>Hi</p>" title="Preview" />);
    expect(frame().tagName).toBe('IFRAME');
    expect(frame().getAttribute('sandbox')).toBe('');
  });

  it('srcdoc starts with the CSP meta, without https: by default', () => {
    render(<SandboxedHtml html="<p>Hi</p>" title="Preview" baseCss="p{}" />);
    const doc = frame().getAttribute('srcdoc') ?? '';
    expect(doc).toContain(
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'">`,
    );
    expect(doc).not.toContain('https:');
    expect(doc.indexOf('Content-Security-Policy')).toBeLessThan(
      doc.indexOf('<style>p{}</style>'),
    );
    expect(doc.indexOf('<style>')).toBeLessThan(doc.indexOf('<p>Hi</p>'));
  });

  it('adds https: to img-src when remote images are allowed', () => {
    render(<SandboxedHtml html="" title="Preview" allowRemoteImages />);
    expect(frame().getAttribute('srcdoc')).toContain(
      'img-src data: blob: https:;',
    );
  });

  it('keeps a script inert: kept in srcdoc, blocked by sandbox and CSP', () => {
    const html = '<script>parent.hacked = true</script>';
    render(<SandboxedHtml html={html} title="Preview" />);
    const doc = frame().getAttribute('srcdoc') ?? '';
    expect(doc).toContain(html);
    expect(doc).toContain("default-src 'none'");
    expect(doc).not.toMatch(/script-src/);
    expect(frame().getAttribute('sandbox')).not.toContain('allow-scripts');
  });

  it('print() uses a temporary frame without allow-scripts', () => {
    const ref = createRef<SandboxedHtmlHandle>();
    render(<SandboxedHtml ref={ref} html="<p>Hi</p>" title="Preview" />);
    const append = vi.spyOn(document.body, 'appendChild');
    ref.current?.print();
    const printFrame = append.mock.calls.at(-1)?.[0] as HTMLIFrameElement;
    expect(printFrame.getAttribute('sandbox')).toBe(PRINT_SANDBOX);
    expect(PRINT_SANDBOX).not.toContain('allow-scripts');
    expect(printFrame.srcdoc).toBe(frame().getAttribute('srcdoc'));
    printFrame.remove();
  });
});

describe('countRemoteImages', () => {
  it('counts network images only', () => {
    expect(
      countRemoteImages('<img src="https://a/b.png"><img src="data:x">'),
    ).toBe(1);
  });

  it('handles protocol-relative, unquoted and srcset sources', () => {
    expect(
      countRemoteImages(
        `<IMG SRC=//cdn/x.png><img alt="a" src='http://h/y'><img srcset="blob:z 1x, https://h/2x.png 2x"><img src="local.png">`,
      ),
    ).toBe(3);
  });
});
