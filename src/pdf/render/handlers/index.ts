import { openHandlers } from './open';
import { redactRenderHandlers } from './redact';
import { renderHandlers as pageRenderHandlers } from './render';
import { textHandlers } from './text';
import { geometryHandlers } from './geometry';
import { formHandlers } from './forms';

/**
 * Every render-worker handler. Append-only registry: later Parts add one
 * `...<module>Handlers` line each.
 */
export const renderHandlers = {
  ...openHandlers,
  ...pageRenderHandlers,
  ...textHandlers,
  ...redactRenderHandlers,
  ...geometryHandlers,
  ...formHandlers,
};

export type RenderHandlers = typeof renderHandlers;

export type { PageTextItems, TextItemGeom } from './text';
