import { ToolError } from '@/shared/lib/errors';
import { requireAll, withOverlay } from '../page-map';
import { defineOperation } from '../registry';
import type { Box, PageId } from '../types';
import type { SearchQuery } from '@/pdf/redact/search';
import { asRecord, box, plural, str } from './validate';

export interface RedactMarkParams {
  id: string;
  pageId: PageId;
  rects: Box[];
  source:
    | { kind: 'area' }
    | { kind: 'search'; query: SearchQuery; matched: string };
  /** #rrggbb */
  fill: string;
  overlayText: string | null;
}

export interface RedactApplyParams {
  /** Resolution of pages turned into images, 150..300. */
  dpi: number;
}

const bad = (m: string) => new ToolError('INVALID_INPUT', m);
export const HEX_FILL = /^#[0-9a-f]{6}$/i;
/** Overlay text is drawn in Helvetica (WinAnsi): plain ASCII, short. */
export const OVERLAY_TEXT = /^[\x20-\x7e]{0,40}$/;
export const OVERLAY_TEXT_RULE =
  'Text on redactions can use up to 40 letters, digits, spaces and common punctuation';

function query(v: unknown): SearchQuery {
  const o = asRecord(v, 'Redaction search');
  const flags = ['regex', 'caseSensitive', 'wholeWord'] as const;
  if (
    typeof o.text !== 'string' ||
    !flags.every((f) => typeof o[f] === 'boolean')
  )
    throw bad('Redaction search: bad settings');
  const presets = ['email', 'phone', 'iban', 'card'];
  if (o.preset !== undefined && !presets.includes(o.preset as string))
    throw bad('Redaction search: unknown pattern');
  return {
    text: o.text,
    regex: o.regex as boolean,
    caseSensitive: o.caseSensitive as boolean,
    wholeWord: o.wholeWord as boolean,
    ...(o.preset !== undefined
      ? { preset: o.preset as SearchQuery['preset'] }
      : {}),
  };
}

export const markRedaction = defineOperation<RedactMarkParams>({
  type: 'redact.mark',
  v: 1,
  kind: 'overlay',
  mode: 'redact',
  // Marks are never written: the redact.apply checkpoint reads them.
  noOutput: true,
  validate(p) {
    const o = asRecord(p, 'Redaction mark');
    if (!Array.isArray(o.rects) || o.rects.length === 0)
      throw bad('Redaction mark: expected areas');
    const src = asRecord(o.source, 'Redaction mark');
    let source: RedactMarkParams['source'];
    if (src.kind === 'area') source = { kind: 'area' };
    else if (src.kind === 'search' && typeof src.matched === 'string')
      source = {
        kind: 'search',
        query: query(src.query),
        matched: src.matched,
      };
    else throw bad('Redaction mark: bad source');
    if (typeof o.fill !== 'string' || !HEX_FILL.test(o.fill))
      throw bad('Redaction mark: bad fill colour');
    if (o.overlayText !== null && typeof o.overlayText !== 'string')
      throw bad('Redaction mark: bad overlay text');
    if (typeof o.overlayText === 'string' && !OVERLAY_TEXT.test(o.overlayText))
      throw bad(OVERLAY_TEXT_RULE);
    return {
      id: str(o.id, 'Redaction mark'),
      pageId: str(o.pageId, 'Redaction mark'),
      rects: o.rects.map((r) => box(r, 'Redaction mark')),
      source,
      fill: o.fill,
      overlayText: (o.overlayText as string | null) || null,
    };
  },
  label: (p, ctx) =>
    p.source.kind === 'area'
      ? `Mark area for redaction on page ${ctx.pageNumber(p.pageId) ?? '?'}`
      : `Mark search match for redaction on page ${ctx.pageNumber(p.pageId) ?? '?'}`,
  summarize: (ops) =>
    `${ops.length} ${plural(ops.length, 'area')} marked for redaction`,
  applyToView(view, p, op) {
    requireAll(view, [p.pageId]);
    return withOverlay(view, {
      opId: op.id,
      type: 'redact.mark',
      pageId: p.pageId,
      params: p,
    });
  },
});

export const applyRedactions = defineOperation<RedactApplyParams>({
  type: 'redact.apply',
  v: 1,
  kind: 'checkpoint',
  mode: 'redact',
  validate(p) {
    const o = asRecord(p, 'Apply redactions');
    const dpi = o.dpi;
    if (
      typeof dpi !== 'number' ||
      !Number.isInteger(dpi) ||
      dpi < 150 ||
      dpi > 300
    )
      throw bad('Image quality must be between 150 and 300 DPI');
    return { dpi };
  },
  label: () => 'Apply redactions',
});

export const REDACT_OPS = [markRedaction, applyRedactions] as const;

/** "Mark {n} search matches for redaction" (one grouped dispatch). */
export const searchMarkLabel = (n: number) =>
  `Mark ${n} search ${plural(n, 'match', 'matches')} for redaction`;
