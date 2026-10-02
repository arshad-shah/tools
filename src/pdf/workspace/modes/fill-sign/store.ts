import { create } from 'zustand';
import type { ToolError } from '@/shared/lib/errors';
import type { Box, PageId } from '@/pdf/doc/types';
import type { FormInfo } from '@/pdf/render/form-info';
import type { SignatureContent } from '@/pdf/doc/ops/fill-sign';
import type { AutofillRow } from './AutofillPreview';
import type { FieldStyle } from './text-style';

export type SignaturePreview =
  | { kind: 'image'; bytes: Uint8Array; mime: 'image/png' | 'image/jpeg' }
  | { kind: 'text'; text: string; family: string; color: string };

/** A signature made in the panel, ready to place (aspect = width / height). */
export interface ReadySignature {
  content: SignatureContent;
  aspect: number;
  /** What the overlay shows for it before export. */
  preview: SignaturePreview;
}

export type FillSignDialog = 'details' | 'autofill' | 'signature' | null;

export interface FillSignState {
  /** Field key whose inline editor is open. */
  editing: string | null;
  /** Field key that last had focus (Next empty field starts after it). */
  focusKey: string | null;
  /** "Detect fields" toggle: show detected fields. */
  showDetected: boolean;
  /** Field key whose corrections menu is open. */
  menuFor: string | null;
  /** Detected field key shown with resize handles. */
  resizing: string | null;
  /** Click-anywhere text or date being typed (not in the document yet). */
  draft: {
    pageId: PageId;
    rect: Box;
    kind: 'text' | 'date';
    style: FieldStyle;
  } | null;
  /** What the open editor holds right now (the page shows it live). */
  typing: { key: string; value: string } | null;
  /** Text settings being adjusted, before they settle into an op. */
  styling: { key: string; style: FieldStyle } | null;
  /** Field key whose text settings bar was closed (until another is active). */
  barClosed: string | null;
  /** Bumped by Alt+T: the text settings bar takes focus. */
  barFocus: number;
  /** Previews of signatures made this session, by their asset id. */
  previews: Record<string, SignaturePreview>;
  dialog: FillSignDialog;
  /** Rows of the autofill preview. */
  autofillRows: AutofillRow[];
  /** Signatures made in the panel, by role. */
  ready: { signature: ReadySignature | null; initials: ReadySignature | null };
  /** What the signature panel makes. */
  panelRole: 'signature' | 'initials';
  /** The signature field the panel was opened from: Place fills it. */
  signTarget: { pageId: PageId; rect: Box } | null;
  /** A signature just placed: its frame takes focus (arrow keys nudge it). */
  justPlaced: string | null;
  /** Placing a signature: it follows the pointer until a click places it. */
  placing: 'signature' | 'initials' | null;
  /** Form info per source id (render worker). */
  forms: Record<string, FormInfo | undefined>;
  formError: ToolError | null;
  /** Detection progress across pages. */
  progress: { done: number; total: number } | null;
  /** Page keys (`sourceId:index`) whose detection failed. */
  crashed: ReadonlySet<string>;
  /** Table cells per page key, for click-anywhere snapping. */
  cells: Record<string, Box[]>;
}

const initial: FillSignState = {
  editing: null,
  focusKey: null,
  showDetected: true,
  menuFor: null,
  resizing: null,
  draft: null,
  typing: null,
  styling: null,
  barClosed: null,
  barFocus: 0,
  previews: {},
  dialog: null,
  autofillRows: [],
  ready: { signature: null, initials: null },
  panelRole: 'signature',
  signTarget: null,
  placing: null,
  justPlaced: null,
  forms: {},
  formError: null,
  progress: null,
  crashed: new Set(),
  cells: {},
};

/** UI state shared by the mode's toolbar, overlays, inspector and badges. */
export const useFillSign = create<FillSignState>(() => initial);

export const fillSign = {
  set: (patch: Partial<FillSignState>) => useFillSign.setState(patch),
  get: () => useFillSign.getState(),
  /** Back to a clean slate (mode left, document changed). */
  reset: () =>
    useFillSign.setState({
      ...initial,
      crashed: new Set(),
      // Previews and made signatures outlive a mode switch.
      previews: useFillSign.getState().previews,
      ready: useFillSign.getState().ready,
    }),
};
