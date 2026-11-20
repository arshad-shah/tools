import {
  LANGUAGES,
  languageForFile,
  tokenize,
  type LanguageId,
} from '@/shared/lib/syntax/tokenize';
import type { CodeImageInput } from '@/shared/surfaces/code-image/render';
import { MONO_STACK } from '@/shared/surfaces/code-image/style';
import { LANGUAGE_BY_MIME } from './mimes';
import { backdropFor, type BackgroundKind } from './backgrounds';
import { themeById } from './themes';

/** Languages offered: the tokenizer's, minus the data-only ones. */
export const IMAGE_LANGUAGES = LANGUAGES.filter(
  (l) => l.id !== 'regex' && l.id !== 'csv' && l.id !== 'log',
);

export const isLanguageId = (v: string): v is LanguageId =>
  LANGUAGES.some((l) => l.id === v);

/** The language for a hand-off: its file name first, then its mime. */
export function languageForHandoff(
  mime: string,
  filename?: string,
): LanguageId | null {
  const byName = filename ? languageForFile(filename) : 'plain';
  if (byName !== 'plain') return byName;
  return LANGUAGE_BY_MIME[mime] ?? null;
}

export interface ImageSettings {
  theme: string;
  fontSize: number;
  padding: number;
  background: string;
  gradient: string;
  solid: string;
  chrome: boolean;
  lineNumbers: boolean;
  widthMode: string;
  width: number;
  overflow: string;
  tabSize: number;
}

const clamp = (v: number, lo: number, hi: number, d: number) =>
  Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d;

export const FONT_SIZES = { min: 10, max: 28 };
export const PADDINGS = { min: 0, max: 128 };
export const WIDTHS = { min: 320, max: 2400 };

/** Expands tabs to spaces at `size` columns (images have no tab stops). */
export function expandTabs(line: string, size: number): string {
  if (!line.includes('\t')) return line;
  let out = '';
  for (const c of line)
    out += c === '\t' ? ' '.repeat(size - (out.length % size)) : c;
  return out;
}

/** Everything the surface needs to draw `code`. */
export function imageInput(
  code: string,
  language: LanguageId,
  s: ImageSettings,
  extra: { title: string; highlight: ReadonlySet<number> },
): CodeImageInput {
  const tab = clamp(s.tabSize, 1, 8, 2);
  const text = code
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => expandTabs(l, tab))
    .join('\n')
    .replace(/\n+$/, '');
  const lines = text.split('\n');
  return {
    lines,
    tokens: tokenize(language, text),
    options: {
      fontSize: clamp(s.fontSize, FONT_SIZES.min, FONT_SIZES.max, 15),
      lineHeight: 1.55,
      padding: clamp(s.padding, PADDINGS.min, PADDINGS.max, 48),
      chrome: s.chrome,
      title: s.chrome ? extra.title.trim().slice(0, 120) : '',
      lineNumbers: s.lineNumbers,
      highlight: extra.highlight,
      width:
        s.widthMode === 'fixed'
          ? clamp(s.width, WIDTHS.min, WIDTHS.max, 800)
          : 'auto',
      overflow: s.overflow === 'clip' ? 'clip' : 'wrap',
    },
    style: {
      palette: themeById(s.theme).palette,
      backdrop: backdropFor(
        (['gradient', 'solid', 'transparent'].includes(s.background)
          ? s.background
          : 'gradient') as BackgroundKind,
        s.gradient,
        s.solid,
      ),
      fontFamily: MONO_STACK,
    },
  };
}
