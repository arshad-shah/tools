import { registerOperations } from '../registry';
import { OBJECT_OPS } from './objects';
import { ORGANIZE_OPS } from './organize';

export { ORGANIZE_OPS } from './organize';
export { OBJECT_OPS } from './objects';

/**
 * Registers every op definition, main thread and edit worker alike, so a
 * restored log validates before any mode has loaded. Later Parts append
 * their arrays here (append-only registry).
 */
export function registerCoreOperations(): void {
  registerOperations([...ORGANIZE_OPS, ...OBJECT_OPS]);
}
