import json from './json';
import diff from './diff';
import log from './log';
import hash from './hash';
import csv from './csv';
import format from './format';
import mock from './mock';
import ping from './ping';
import regex from './regex';

/**
 * Every text-worker handler (spec §4.4). Append-only: each Part adds one
 * import and one spread line for its own handler module. Handler modules
 * default-export a plain object and `import()` heavy libraries inside the
 * handler bodies, so the worker boots small.
 */
export const textHandlers = {
  ...ping,
  ...json,
  ...regex,
  ...diff,
  ...log,
  ...hash,
  ...csv,
  ...mock,
  ...format,
};

export type TextHandlers = typeof textHandlers;
