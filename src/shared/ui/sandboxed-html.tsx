import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { cn } from '@/shared/lib/cn';
import { buildSrcdoc, printSrcdoc } from './sandboxed-html-doc';

export interface SandboxedHtmlProps {
  /** Untrusted HTML; never executed (sandbox="" and a CSP without scripts). */
  html: string;
  /** Accessible name of the frame. */
  title: string;
  /** Adds https: to img-src (the labelled opt-in of spec rule 8). */
  allowRemoteImages?: boolean;
  /** Styles placed before the HTML (for example a reading theme). */
  baseCss?: string;
  onLoad?(): void;
  className?: string;
}

export interface SandboxedHtmlHandle {
  /** Prints the HTML through a temporary script-free frame. */
  print(): void;
}

/**
 * Untrusted HTML preview (spec rule 8): an iframe with sandbox="" (no
 * scripts, forms, popups or same-origin access) and a srcdoc whose CSP
 * blocks every fetch except data: and blob: images (and https: images when
 * the user opts in).
 */
export const SandboxedHtml = forwardRef<
  SandboxedHtmlHandle,
  SandboxedHtmlProps
>(
  (
    { html, title, allowRemoteImages = false, baseCss, onLoad, className },
    ref,
  ) => {
    const srcdoc = useMemo(
      () => buildSrcdoc(html, { allowRemoteImages, baseCss }),
      [html, allowRemoteImages, baseCss],
    );
    useImperativeHandle(ref, () => ({ print: () => printSrcdoc(srcdoc) }), [
      srcdoc,
    ]);
    return (
      <iframe
        sandbox=""
        title={title}
        srcDoc={srcdoc}
        onLoad={onLoad}
        referrerPolicy="no-referrer"
        className={cn(
          'block h-full min-h-48 w-full rounded-md border border-line bg-surface',
          className,
        )}
      />
    );
  },
);
SandboxedHtml.displayName = 'SandboxedHtml';
