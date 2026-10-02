import { ToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';

/** The Content-Security-Policy every SandboxedHtml document carries. */
export function sandboxCsp(allowRemoteImages = false): string {
  const img = allowRemoteImages ? 'data: blob: https:' : 'data: blob:';
  return `default-src 'none'; img-src ${img}; style-src 'unsafe-inline'`;
}

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** `</style` cannot close the base style element early. */
const safeCss = (css: string) => css.replace(/<\/style/gi, '<\\/style');

/** The srcdoc: CSP meta first, then the base styles, then the HTML. */
export function buildSrcdoc(
  html: string,
  {
    allowRemoteImages = false,
    baseCss,
  }: { allowRemoteImages?: boolean; baseCss?: string } = {},
): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeAttr(sandboxCsp(allowRemoteImages))}">`;
  const style = baseCss ? `<style>${safeCss(baseCss)}</style>` : '';
  return `<!doctype html><html><head><meta charset="utf-8">${meta}${style}</head><body>${html}</body></html>`;
}

const REMOTE = /^\s*(?:https?:)?\/\//i;

/**
 * How many images in `html` load from the network (http, https or
 * protocol-relative `src`, and `srcset` candidates). Worker-safe: no DOM.
 */
export function countRemoteImages(html: string): number {
  let count = 0;
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const attr = (name: string) =>
      new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
        .exec(tag)
        ?.slice(1)
        .find((v) => v !== undefined);
    const src = attr('src');
    const srcset = attr('srcset');
    const remote =
      (src !== undefined && REMOTE.test(src)) ||
      (srcset !== undefined &&
        srcset.split(',').some((c) => REMOTE.test(c.trim())));
    if (remote) count++;
  }
  return count;
}

/**
 * Print decision (plan A2-13 Step 0): browsers ignore print() from a frame
 * sandboxed without `allow-modals` (Chromium logs "Ignored call to
 * 'print()'"), and the parent cannot call print() on an opaque-origin frame
 * at all. So printing uses a temporary hidden frame with
 * `allow-modals allow-same-origin` and still no `allow-scripts`: the HTML
 * cannot run code (sandbox and the same CSP), and the parent reaches the
 * frame's window to call print(). The visible frame stays `sandbox=""`.
 */
export const PRINT_SANDBOX = 'allow-modals allow-same-origin';

export function printSrcdoc(srcdoc: string): void {
  if (typeof document === 'undefined') return;
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', PRINT_SANDBOX);
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.title = 'Print';
  Object.assign(frame.style, {
    position: 'fixed',
    width: '0',
    height: '0',
    border: '0',
    right: '0',
    bottom: '0',
  });
  const cleanup = () => {
    window.setTimeout(() => frame.remove(), 1000);
  };
  frame.addEventListener(
    'load',
    () => {
      const win = frame.contentWindow;
      if (!win) {
        frame.remove();
        notify.error(
          new ToolError('UNSUPPORTED_FEATURE', 'Printing is not available'),
        );
        return;
      }
      win.addEventListener('afterprint', cleanup, { once: true });
      win.focus();
      win.print();
      // print() blocks in most browsers; afterprint also covers the rest.
      cleanup();
    },
    { once: true },
  );
  frame.srcdoc = srcdoc;
  document.body.appendChild(frame);
}
