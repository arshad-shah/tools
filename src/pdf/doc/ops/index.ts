import { registerOperations } from '../registry';
import { ANNOTATE_OPS } from './annotate';
import { COVER_OPS } from './cover';
import { EDIT_CONTENT_OPS } from './edit';
import { MARKUP_OPS } from './markup';
import { OBJECT_OPS } from './objects';
import { OCR_OPS } from './ocr';
import { ORGANIZE_OPS } from './organize';
import { REDACT_OPS } from './redact';
import { CONVERT_OPS } from './convert';
import { PROTECT_OPS } from './protect';
import { OPTIMIZE_OPS } from './optimize';
import { FILL_SIGN_OPS } from './fill-sign';

export { ORGANIZE_OPS } from './organize';
export { OBJECT_OPS } from './objects';
export { REDACT_OPS } from './redact';
export { CONVERT_OPS } from './convert';
export { PROTECT_OPS } from './protect';
export { OPTIMIZE_OPS } from './optimize';
export { FILL_SIGN_OPS } from './fill-sign';
export { ANNOTATE_OPS, currentAuthor } from './annotate';
export { EDIT_CONTENT_OPS } from './edit';
export { MARKUP_OPS } from './markup';
export { COVER_OPS } from './cover';

/**
 * Registers every op definition, main thread and edit worker alike, so a
 * restored log validates before any mode has loaded. Later Parts append
 * their arrays here (append-only registry).
 */
export function registerCoreOperations(): void {
  registerOperations([
    ...ORGANIZE_OPS,
    ...OBJECT_OPS,
    ...ANNOTATE_OPS,
    ...EDIT_CONTENT_OPS,
    ...MARKUP_OPS,
    ...COVER_OPS,
    ...REDACT_OPS,
    ...PROTECT_OPS,
    ...OPTIMIZE_OPS,
    ...OCR_OPS,
    ...FILL_SIGN_OPS,
  ]);
  registerOperations(CONVERT_OPS);
}
