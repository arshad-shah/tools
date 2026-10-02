import { OCR_LANGUAGES, type OcrManifest } from './types';

const LABELS = {
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
} as const;

/** A manifest with round sizes for tests (not the generated one). */
export function fakeManifest(): OcrManifest {
  const v = '9.9.9';
  return {
    version: v,
    worker: { path: `/ocr/${v}/worker.min.js`, bytes: 100_000 },
    core: {
      simd: {
        dir: `/ocr/${v}/core/simd`,
        path: `/ocr/${v}/core/simd/tesseract-core-simd-lstm.wasm.js`,
        bytes: 3_400_000,
      },
      plain: {
        dir: `/ocr/${v}/core/plain`,
        path: `/ocr/${v}/core/plain/tesseract-core-lstm.wasm.js`,
        bytes: 3_300_000,
      },
    },
    languages: Object.fromEntries(
      OCR_LANGUAGES.map((l, i) => [
        l,
        {
          label: LABELS[l],
          path: `/ocr/${v}/lang/${l}.traineddata.gz`,
          bytes: 2_000_000 + i,
        },
      ]),
    ) as OcrManifest['languages'],
  };
}
