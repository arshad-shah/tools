/**
 * Ported from arshad-shah/verql src/renderer/src/components/er/theme-bridge.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 *
 * The painter draws onto a canvas, which cannot resolve `var(--x)`, so the
 * palette is read out of the live token layer and handed over as concrete
 * values. Every colour comes from a token (6-A1's syntax and match tokens
 * included; the interim fallbacks are gone), so the diagram follows
 * `data-theme` with no colour literal of its own. `watchTheme` signals a repaint on theme change.
 */
import { readThemeTokens, watchTheme } from '@/shared/lib/theme-tokens';
import {
  DEFAULT_FONT_SIZES,
  diagramFonts,
  type DiagramFonts,
  type FontSizes,
} from './fonts';
import type { RowKind } from './model';

export { watchTheme };

export interface DiagramTheme extends DiagramFonts {
  surface: string;
  grid: string;
  card: string;
  cardHeader: string;
  cardBorder: string;
  cardBorderStrong: string;
  divider: string;
  title: string;
  eyebrow: string;
  key: string;
  value: Record<RowKind, string>;
  chip: string;
  chipText: string;
  edge: string;
  edgeMuted: string;
  edgeActive: string;
  select: string;
  /** Fill of the selected row. */
  selectFill: string;
  /** Fill of the hovered row. */
  hoverFill: string;
  /** Fill of a search hit. */
  matchFill: string;
}

/** Each role: tokens tried in order. */
const ROLES = {
  surface: ['canvas', 'surface-2'],
  grid: ['line-strong', 'line'],
  card: ['surface'],
  cardHeader: ['surface-2', 'surface'],
  cardBorder: ['line-strong', 'line'],
  cardBorderStrong: ['line-control', 'fg-subtle'],
  divider: ['line'],
  title: ['fg'],
  eyebrow: ['fg-subtle', 'fg-muted'],
  key: ['syntax-key'],
  chip: ['surface-3', 'surface-2'],
  chipText: ['fg-muted', 'fg'],
  edge: ['fg-subtle', 'line-control'],
  edgeMuted: ['line-strong', 'line'],
  edgeActive: ['accent-fg', 'accent'],
  select: ['focus', 'accent-fg'],
  selectFill: ['accent-soft', 'surface-3'],
  hoverFill: ['surface-3', 'surface-2'],
  matchFill: ['match-soft'],
  string: ['syntax-string'],
  number: ['syntax-number'],
  boolean: ['syntax-boolean'],
  null: ['syntax-null'],
  object: ['fg-muted'],
  array: ['fg-muted'],
  element: ['syntax-tag'],
  attribute: ['syntax-attr'],
  text: ['fg'],
  more: ['fg-subtle'],
} as const;

type Role = keyof typeof ROLES;

const SIZE_TOKENS: Record<keyof FontSizes, string> = {
  title: '--text-sm',
  eyebrow: '--text-2xs',
  row: '--text-xs',
  chip: '--text-2xs',
};

/**
 * Snapshot the current theme's palette and type ramp off `el` (the element
 * carrying `data-theme`, `<html>` by default). Rows and titles use the mono
 * family so the worker and the main thread measure identically.
 */
export function readDiagramTheme(
  el: HTMLElement = document.documentElement,
): DiagramTheme {
  const names = new Set<string>();
  for (const list of Object.values(ROLES)) for (const n of list) names.add(n);
  const sizeNames = Object.values(SIZE_TOKENS);
  const t = readThemeTokens(
    [...names, ...sizeNames, '--font-mono', '--font-sans'],
    el,
  );
  // Last resort when no token resolves (a bare test document): the
  // element's own text colour, then the CSS system text colour.
  const last = getComputedStyle(el).color || 'canvastext';
  const role = (r: Role) => {
    for (const n of ROLES[r]) if (t[n]) return t[n];
    return last;
  };
  const sizes = { ...DEFAULT_FONT_SIZES };
  for (const k of Object.keys(SIZE_TOKENS) as (keyof FontSizes)[]) {
    const px = parseFloat(t[SIZE_TOKENS[k]]);
    if (Number.isFinite(px) && px > 0) sizes[k] = px;
  }
  const family =
    t['--font-mono'] || getComputedStyle(el).fontFamily || 'monospace';

  const kinds: RowKind[] = [
    'string',
    'number',
    'boolean',
    'null',
    'object',
    'array',
    'element',
    'attribute',
    'text',
    'more',
  ];
  return {
    ...diagramFonts(family, sizes),
    surface: role('surface'),
    grid: role('grid'),
    card: role('card'),
    cardHeader: role('cardHeader'),
    cardBorder: role('cardBorder'),
    cardBorderStrong: role('cardBorderStrong'),
    divider: role('divider'),
    title: role('title'),
    eyebrow: role('eyebrow'),
    key: role('key'),
    value: Object.fromEntries(kinds.map((k) => [k, role(k)])) as Record<
      RowKind,
      string
    >,
    chip: role('chip'),
    chipText: role('chipText'),
    edge: role('edge'),
    edgeMuted: role('edgeMuted'),
    edgeActive: role('edgeActive'),
    select: role('select'),
    selectFill: role('selectFill'),
    hoverFill: role('hoverFill'),
    matchFill: role('matchFill'),
  };
}
