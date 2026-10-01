import { cp, rm } from 'node:fs/promises';

const src = new URL('../node_modules/pdfjs-dist/', import.meta.url);
const dest = new URL('../public/pdfjs/', import.meta.url);

await rm(dest, { recursive: true, force: true });
for (const dir of ['standard_fonts', 'cmaps', 'iccs', 'wasm']) {
  await cp(new URL(`${dir}/`, src), new URL(`${dir}/`, dest), {
    recursive: true,
  });
}
console.log('copied pdf.js assets to public/pdfjs');
