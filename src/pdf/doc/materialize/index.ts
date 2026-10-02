import { ANNOTATE_MATERIALIZERS } from './annotate';
import { COVER_MATERIALIZERS } from './cover';
import { EDIT_CONTENT_MATERIALIZERS } from './edit';
import { MARKUP_MATERIALIZERS } from './markup';
import { ORGANIZE_MATERIALIZERS } from './organize';
import { PROTECT_MATERIALIZERS } from './protect';
import { FILL_SIGN_MATERIALIZERS } from './fill-sign';
import type { Materializer } from './registry';

/** Every overlay writer. Append-only: later Parts add one spread each. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ALL_MATERIALIZERS: readonly Materializer<any>[] = [
  ...ORGANIZE_MATERIALIZERS,
  ...PROTECT_MATERIALIZERS,
  ...FILL_SIGN_MATERIALIZERS,
  ...ANNOTATE_MATERIALIZERS,
  ...EDIT_CONTENT_MATERIALIZERS,
  ...MARKUP_MATERIALIZERS,
  ...COVER_MATERIALIZERS,
];
