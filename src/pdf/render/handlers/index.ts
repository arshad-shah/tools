import { openHandlers } from './open';
import { redactRenderHandlers } from './redact';
import { renderHandlers as pageRenderHandlers } from './render';
import { textHandlers } from './text';

/**
 * Every render-worker handler. Append-only registry: later Parts add one
 * `...<module>Handlers` line each.
 */
export const renderHandlers = {
  ...openHandlers,
  ...pageRenderHandlers,
  ...textHandlers,
  ...redactRenderHandlers,
};

export type RenderHandlers = typeof renderHandlers;

export type { PageTextItems, TextItemGeom } from './text';
