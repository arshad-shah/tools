import { OCR_LANGUAGE_LABELS, type OcrLanguage } from '@/pdf/ocr/types';

/** "English + French": the chosen languages, in order. */
export const languageNames = (langs: readonly OcrLanguage[]) =>
  langs.map((l) => OCR_LANGUAGE_LABELS[l]).join(' + ');
