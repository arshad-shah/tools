import { organizeManifest } from './organize';
import { redactManifest } from './redact';
import { convertManifest } from './convert';
import { protectManifest } from './protect';
import { optimizeManifest } from './optimize';
import { fillSignManifest } from './fill-sign';
import type { ModeManifest } from './types';

export { MODE_ORDER, shortcutFor } from './registry-order';

/**
 * Implemented modes, in spec order. Append-only: each Part adds one
 * manifest import (no stub modes, decision G7).
 */
export const MODES: readonly ModeManifest[] = [
  organizeManifest,
  fillSignManifest,
  redactManifest,
  convertManifest,
  protectManifest,
  optimizeManifest,
];

export function getMode(id: string): ModeManifest | undefined {
  return MODES.find((m) => m.id === id);
}
