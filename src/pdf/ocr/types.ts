/** OCR languages shipped same-origin (spec 11, Latin-script set). */
export const OCR_LANGUAGES = [
  'eng',
  'fra',
  'deu',
  'spa',
  'ita',
  'por',
  'nld',
  'gle',
  'pol',
  'swe',
] as const;

export type OcrLanguage = (typeof OCR_LANGUAGES)[number];

export interface OcrAsset {
  /** Same-origin absolute URL path, e.g. '/ocr/7.0.0/worker.min.js'. */
  path: string;
  /** Exact size in bytes. */
  bytes: number;
}

/** A single-file LSTM-only core (wasm embedded in the script). */
export interface OcrCore extends OcrAsset {
  dir: string;
}

/** public/ocr/<v>/ocr-manifest.json, written by scripts/copy-ocr-assets.mjs. */
export interface OcrManifest {
  /** The tesseract.js version, also the folder name. */
  version: string;
  worker: OcrAsset;
  /** One of the two is fetched, by SIMD support. */
  core: { simd: OcrCore; plain: OcrCore };
  languages: Record<OcrLanguage, OcrAsset & { label: string }>;
}

/** Display names (the manifest carries the same labels). */
export const OCR_LANGUAGE_LABELS: Record<OcrLanguage, string> = {
  eng: 'English',
  fra: 'French',
  deu: 'German',
  spa: 'Spanish',
  ita: 'Italian',
  por: 'Portuguese',
  nld: 'Dutch',
  gle: 'Irish',
  pol: 'Polish',
  swe: 'Swedish',
};

/** Languages recognised together at most (joined with '+'). */
export const MAX_OCR_LANGUAGES = 3;
