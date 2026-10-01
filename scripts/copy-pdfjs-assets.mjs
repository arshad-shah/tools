import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { syncPdfjsAssets } from './pdfjs-assets.mjs';

const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));

const { version } = JSON.parse(
  await readFile(path('../node_modules/pdfjs-dist/package.json'), 'utf8'),
);

const result = await syncPdfjsAssets({
  srcDir: path('../node_modules/pdfjs-dist/'),
  destDir: path('../public/pdfjs/'),
  // Outside public/, so a half-done copy is never served or bundled.
  workDir: path('../node_modules/.cache/pdfjs-assets/'),
  version,
});
console.log(
  result === 'skipped'
    ? `pdf.js ${version} assets already in public/pdfjs`
    : `copied pdf.js ${version} assets to public/pdfjs`,
);
