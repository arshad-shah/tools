import { ToolError } from '@/shared/lib/errors';
// Types only: pdf-lib stays out of the main thread (decision G4).
import type { MetadataField, MetadataPatch } from '@/pdf/edit/metadata';
import {
  isPermissionChoices,
  type PermissionChoices,
} from '@/pdf/edit/permissions';
import { withOverlay } from '../page-map';
import { defineOperation } from '../registry';
import type { DocView } from '../types';
import { asRecord } from './validate';

/**
 * Protect mode (spec §7.2). Passwords never enter the log (decision G25):
 * they are typed in the Export dialog and used by the encrypt stage only.
 */
export interface ProtectParams {
  enabled: boolean;
  permissions: PermissionChoices;
}

export interface MetaSetParams {
  /** A blank value removes the field. */
  patch: MetadataPatch;
  /** Drop every property (Info and XMP) before applying `patch`. */
  removeAll?: boolean;
}

export interface SanitizeParams {
  scripts: boolean;
  attachments: boolean;
  links: boolean;
  metadata: boolean;
  hiddenLayers: boolean;
}

export const SANITIZE_KEYS = [
  'scripts',
  'attachments',
  'links',
  'metadata',
  'hiddenLayers',
] as const satisfies readonly (keyof SanitizeParams)[];

/** Mirrors METADATA_FIELDS of pdf/edit/metadata (a test keeps them equal). */
export const PROPERTY_FIELDS: readonly MetadataField[] = [
  'title',
  'author',
  'subject',
  'keywords',
  'creator',
  'producer',
];

const bad = (m: string) => new ToolError('INVALID_INPUT', m);

export const setProtection = defineOperation<ProtectParams>({
  type: 'protect.set',
  v: 1,
  kind: 'overlay',
  mode: 'protect',
  // Applied by the encrypt export stage, not by a writer.
  noOutput: true,
  validate(p) {
    const o = asRecord(p, 'Password protection');
    const extra = Object.keys(o).filter(
      (k) => k !== 'enabled' && k !== 'permissions',
    );
    if (extra.length)
      throw bad('Password protection: passwords are never stored');
    if (typeof o.enabled !== 'boolean')
      throw bad('Password protection: expected on or off');
    if (!isPermissionChoices(o.permissions))
      throw bad('Password protection: bad permissions');
    const c = o.permissions;
    return {
      enabled: o.enabled,
      permissions: {
        printing: c.printing,
        modify: c.modify,
        copy: c.copy,
        annotate: c.annotate,
        fillForms: c.fillForms,
        assemble: c.assemble,
      },
    };
  },
  label: (p) =>
    p.enabled ? 'Turn on password protection' : 'Turn off password protection',
  applyToView: (view, p, op) =>
    withOverlay(view, {
      opId: op.id,
      type: 'protect.set',
      pageId: null,
      params: p,
    }),
});

export const setDocumentProperties = defineOperation<MetaSetParams>({
  type: 'meta.set',
  v: 1,
  kind: 'overlay',
  mode: 'protect',
  validate(p) {
    const o = asRecord(p, 'Document properties');
    const patch = asRecord(o.patch, 'Document properties');
    const out: MetadataPatch = {};
    for (const [k, v] of Object.entries(patch)) {
      if (!PROPERTY_FIELDS.includes(k as MetadataField))
        throw bad(`Document properties: unknown field ${k}`);
      if (typeof v !== 'string')
        throw bad('Document properties: expected text');
      out[k as MetadataField] = v;
    }
    if (o.removeAll !== undefined && typeof o.removeAll !== 'boolean')
      throw bad('Document properties: bad settings');
    return o.removeAll ? { patch: out, removeAll: true } : { patch: out };
  },
  label: (p) =>
    p.removeAll
      ? 'Remove all document properties'
      : 'Change document properties',
  summarize: (ops) =>
    ops.some((p) => p.removeAll)
      ? 'Document properties removed'
      : 'Document properties changed',
  applyToView: (view, p, op) =>
    withOverlay(view, {
      opId: op.id,
      type: 'meta.set',
      pageId: null,
      params: p,
    }),
});

export const sanitizeDocument = defineOperation<SanitizeParams>({
  type: 'sanitize',
  v: 1,
  kind: 'checkpoint',
  mode: 'protect',
  validate(p) {
    const o = asRecord(p, 'Sanitise');
    if (!SANITIZE_KEYS.every((k) => typeof o[k] === 'boolean'))
      throw bad('Sanitise: bad settings');
    const out = Object.fromEntries(
      SANITIZE_KEYS.map((k) => [k, o[k] as boolean]),
    ) as unknown as SanitizeParams;
    if (!SANITIZE_KEYS.some((k) => out[k]))
      throw bad('Choose something to remove');
    return out;
  },
  label: () => 'Sanitise document',
});

export const PROTECT_OPS = [
  setProtection,
  setDocumentProperties,
  sanitizeDocument,
] as const;

const live = (view: DocView, type: string) =>
  view.docOverlays.filter((o) => o.type === type && !view.hidden.has(o.opId));

/** The protection the export applies: the latest `protect.set`, or null. */
export function protectionOf(view: DocView): ProtectParams | null {
  const last = live(view, 'protect.set').at(-1);
  return last ? (last.params as ProtectParams) : null;
}

/**
 * Pending property changes folded in log order: `removeAll` when any
 * "remove all" is pending; `patch` holds the changes made after the last one.
 */
export function metadataOf(view: DocView): {
  patch: MetadataPatch;
  removeAll: boolean;
} {
  let patch: MetadataPatch = {};
  let removeAll = false;
  for (const item of live(view, 'meta.set')) {
    const p = item.params as MetaSetParams;
    if (p.removeAll) {
      removeAll = true;
      patch = {};
    }
    patch = { ...patch, ...p.patch };
  }
  return { patch, removeAll };
}
