import { organizeManifest } from './organize';
import type { ModeManifest } from './types';

export { MODE_ORDER, shortcutFor } from './registry-order';

/**
 * Implemented modes, in spec order. Append-only: each Part adds one
 * manifest import (no stub modes, decision G7).
 */
export const MODES: readonly ModeManifest[] = [organizeManifest];

export function getMode(id: string): ModeManifest | undefined {
  return MODES.find((m) => m.id === id);
}
