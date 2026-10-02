import { useSyncExternalStore } from 'react';
import {
  metadataOf,
  PROPERTY_FIELDS,
  SANITIZE_KEYS,
  type SanitizeParams,
} from '@/pdf/doc/ops/protect';
import { materializeIn, planFor } from '@/pdf/doc/services';
import type { MetadataField, PdfMetadata } from '@/pdf/edit/metadata';
import type { WorkspaceActions } from '../../workspace-context';

/** Inspector panels (the active tool id). */
export type ProtectPanel = 'password' | 'properties';

export const panelOf = (id: string | null): ProtectPanel =>
  id === 'properties' ? 'properties' : 'password';

/** The properties as the export will write them: base, then pending changes. */
export function effectiveValues(
  base: PdfMetadata,
  pending: ReturnType<typeof metadataOf>,
): Record<MetadataField, string> {
  return Object.fromEntries(
    PROPERTY_FIELDS.map((f) => [
      f,
      (pending.patch[f] ?? (pending.removeAll ? '' : base[f])).trim(),
    ]),
  ) as Record<MetadataField, string>;
}

/** Per kind: what a dry run found (plain words). */
export type SanitizePreview = Record<keyof SanitizeParams, string[]>;

/** The lines the chosen kinds would remove, without repeats. */
export function previewLines(
  preview: SanitizePreview,
  chosen: SanitizeParams,
): string[] {
  return [
    ...new Set(SANITIZE_KEYS.flatMap((k) => (chosen[k] ? preview[k] : []))),
  ];
}

/**
 * What sanitise would remove, kind by kind: the current view materialised
 * once, then one dry run per kind in the edit worker (nothing changes).
 */
export async function sanitizePreview(
  session: WorkspaceActions['session'],
  signal: AbortSignal,
): Promise<SanitizePreview> {
  const { model, blobs, services } = session;
  const { bytes } = await materializeIn(services, await planFor(model, blobs), {
    signal,
  });
  const out = {} as SanitizePreview;
  for (const k of SANITIZE_KEYS) {
    const only = Object.fromEntries(
      SANITIZE_KEYS.map((x) => [x, x === k]),
    ) as unknown as SanitizeParams;
    const r = await services.edit.call(
      'sanitize',
      [bytes.slice(), { ...only, dryRun: true }],
      { signal },
    );
    out[k] = r.report.removed;
  }
  return out;
}

let sanitizeOpen = false;
const listeners = new Set<() => void>();

/** Opens or closes the Sanitise dialog (toolbar and Mod+K). */
export function openSanitize(open = true): void {
  sanitizeOpen = open;
  for (const l of [...listeners]) l();
}

export function useSanitizeOpen(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sanitizeOpen,
  );
}
