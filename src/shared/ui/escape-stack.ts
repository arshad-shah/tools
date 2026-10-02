import { useEffect, useRef } from 'react';

/**
 * The open overlays, oldest first. Escape goes to the topmost one only: an
 * export progress overlay over a dialog cancels the export and leaves the
 * dialog open. The handler prevents the default and stops the event, so
 * the dialog below and the page shortcuts never see it.
 */
interface Layer {
  onEscape: () => void;
}

const layers: Layer[] = [];

function onKeyDown(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
  const top = layers[layers.length - 1];
  if (!top) return;
  e.preventDefault();
  e.stopPropagation();
  top.onEscape();
}

/** Puts an overlay on top of the stack; the disposer takes it off. */
export function pushEscapeLayer(onEscape: () => void): () => void {
  const layer: Layer = { onEscape };
  layers.push(layer);
  if (layers.length === 1) document.addEventListener('keydown', onKeyDown);
  return () => {
    const i = layers.lastIndexOf(layer);
    if (i >= 0) layers.splice(i, 1);
    if (layers.length === 0) document.removeEventListener('keydown', onKeyDown);
  };
}

/**
 * Holds a place on the escape stack while `active`. The place is taken when
 * the overlay opens and kept across re-renders (a new onEscape does not move
 * it to the top).
 */
export function useEscapeLayer(active: boolean, onEscape: () => void): void {
  const handler = useRef(onEscape);
  useEffect(() => {
    handler.current = onEscape;
  });
  useEffect(() => {
    if (!active) return;
    return pushEscapeLayer(() => handler.current());
  }, [active]);
}
