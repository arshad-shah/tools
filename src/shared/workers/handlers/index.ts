import json from './json';
import ping from './ping';

/**
 * Every text-worker handler (spec §4.4). Append-only: each Part adds one
 * import and one spread line for its own handler module. Handler modules
 * default-export a plain object and `import()` heavy libraries inside the
 * handler bodies, so the worker boots small.
 */
export const textHandlers = {
  ...ping,
  ...json,
};

export type TextHandlers = typeof textHandlers;
