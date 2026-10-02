import { registerOperations } from '../registry';
import { OBJECT_OPS } from './objects';
import { OCR_OPS } from './ocr';
import { ORGANIZE_OPS } from './organize';
import { REDACT_OPS } from './redact';
import { CONVERT_OPS } from './convert';
import { PROTECT_OPS } from './protect';
import { OPTIMIZE_OPS } from './optimize';

export { ORGANIZE_OPS } from './organize';
export { OBJECT_OPS } from './objects';
export { REDACT_OPS } from './redact';
export { CONVERT_OPS } from './convert';
export { PROTECT_OPS } from './protect';
export { OPTIMIZE_OPS } from './optimize';

/**
 * Registers every op definition, main thread and edit worker alike, so a
 * restored log validates before any mode has loaded. Later Parts append
 * their arrays here (append-only registry).
 */
export function registerCoreOperations(): void {
  registerOperations([
    ...ORGANIZE_OPS,
    ...OBJECT_OPS,
    ...REDACT_OPS,
    ...PROTECT_OPS,
    ...OPTIMIZE_OPS,
    ...OCR_OPS,
  ]);
  registerOperations(CONVERT_OPS);
}
