import { ToolError } from '@/shared/lib/errors';
import { OCR_LANGUAGES, type OcrLanguage } from '@/pdf/ocr/types';
import { defineOperation } from '../registry';
import type { PageId } from '../types';
import { asRecord, ids, pageList } from './validate';

export interface OcrTextLayerParams {
  /** One to three languages, recognised together. */
  langs: OcrLanguage[];
  /** auto: pages without text; force: every page; or these pages. */
  pages: 'auto' | 'force' | PageId[];
}

const bad = (m: string) => new ToolError('INVALID_INPUT', m);
const KNOWN = new Set<string>(OCR_LANGUAGES);

export const ocrTextLayer = defineOperation<OcrTextLayerParams>({
  type: 'ocr.textLayer',
  v: 1,
  kind: 'checkpoint',
  mode: 'ocr',
  validate(p) {
    const o = asRecord(p, 'OCR');
    const langs = o.langs;
    if (
      !Array.isArray(langs) ||
      langs.length < 1 ||
      langs.length > 3 ||
      !langs.every((l) => KNOWN.has(l as string)) ||
      new Set(langs).size !== langs.length
    )
      throw bad('OCR: choose one to three languages');
    const pages =
      o.pages === 'auto' || o.pages === 'force' ? o.pages : ids(o.pages, 'OCR');
    return { langs: langs as OcrLanguage[], pages };
  },
  label: (p, ctx) =>
    p.pages === 'auto'
      ? 'Add a text layer to pages without text'
      : p.pages === 'force'
        ? 'Add a text layer to every page'
        : `Add a text layer to ${pageList(p.pages, ctx)}`,
  summarize: (ops) =>
    ops.length === 1
      ? 'Text layer added by OCR'
      : `Text layer added by OCR (${ops.length} runs)`,
});

export const OCR_OPS = [ocrTextLayer];
