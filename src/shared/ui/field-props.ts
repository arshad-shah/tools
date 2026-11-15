import type React from 'react';
import { useImperativeHandle, useLayoutEffect, useRef } from 'react';

/** Cynosure fields set type in the sans family; `font-mono` swaps the token. */
export const MONO_FIELD = {
  '--cy-font-sans': 'var(--cy-font-mono)',
} as React.CSSProperties;

/** An invalid field without a message: the danger border, through the token. */
export const INVALID_FIELD = {
  '--cy-text-field-border': 'var(--cy-color-danger)',
} as React.CSSProperties;

/**
 * Splits a call site's className: `font-mono` becomes the font token (it
 * cannot reach the input through a class), the rest is layout for the root.
 */
export function fieldClass(className: string | undefined) {
  const parts = className?.split(/\s+/).filter(Boolean) ?? [];
  const mono = parts.includes('font-mono');
  const layout = parts.filter((c) => c !== 'font-mono').join(' ');
  return { mono, layout: layout || undefined };
}

/**
 * The field element, handed to the call site's ref too. Cynosure's fields
 * put their own (here empty) description ids on the control, so a call
 * site's `aria-describedby` (an error or status shown elsewhere) is set
 * after render. Stopgap until Cynosure merges the consumer's ids (tools#104).
 */
export function useFieldElement<T extends HTMLElement>(
  forwarded: React.ForwardedRef<T>,
  describedBy: string | undefined,
) {
  const node = useRef<T>(null);
  useImperativeHandle(forwarded, () => node.current as T, []);
  useLayoutEffect(() => {
    const el = node.current;
    if (!el) return;
    if (describedBy) el.setAttribute('aria-describedby', describedBy);
    else el.removeAttribute('aria-describedby');
  }, [describedBy]);
  return node;
}
