import { mkdir, writeFile } from 'node:fs/promises';
import { makeShapesOnlyPdf, makeTextPdf } from '../test/fixtures/builders';

const out = new URL('../test/fixtures/generated/', import.meta.url);
await mkdir(out, { recursive: true });

const files: Record<string, Uint8Array> = {
  'text-3.pdf': await makeTextPdf({ pages: 3, label: 'Alpha' }),
  'text-12.pdf': await makeTextPdf({ pages: 12, label: 'Beta' }),
  'text-300.pdf': await makeTextPdf({ pages: 300, label: 'Big' }),
  'shapes-2.pdf': await makeShapesOnlyPdf(2),
};
for (const [name, bytes] of Object.entries(files)) {
  await writeFile(new URL(name, out), bytes);
}
console.log(
  `wrote ${Object.keys(files).length} fixtures to test/fixtures/generated`,
);
