import { mkdir, writeFile } from 'node:fs/promises';
import {
  makeAesEncryptedPdf,
  makeShapesOnlyPdf,
  makeStructuredPdf,
  makeTextPdf,
} from '../test/fixtures/builders';
import {
  encodeGif,
  encodeJpeg,
  encodePng,
  noiseImage,
} from '../test/fixtures/images';

const out = new URL('../test/fixtures/generated/', import.meta.url);
await mkdir(out, { recursive: true });

function photoRgba(width: number, height: number): Uint8Array {
  const rgba = noiseImage(width, height, 4, 7);
  // Transparent top-left quadrant, so PNG alpha handling is observable.
  for (let y = 0; y < height / 2; y++)
    for (let x = 0; x < width / 2; x++) rgba[(y * width + x) * 4 + 3] = 0;
  return rgba;
}

const files: Record<string, Uint8Array> = {
  'text-3.pdf': await makeTextPdf({ pages: 3, label: 'Alpha' }),
  'text-12.pdf': await makeTextPdf({ pages: 12, label: 'Beta' }),
  'text-300.pdf': await makeTextPdf({ pages: 300, label: 'Big' }),
  'shapes-2.pdf': await makeShapesOnlyPdf(2),
  'a2-1.pdf': await makeTextPdf({
    pages: 1,
    label: 'Poster',
    size: [1191, 1684],
  }),
  'structured-3.pdf': await makeStructuredPdf(3),
  'encrypted-aes.pdf': await makeAesEncryptedPdf(),
  'photo.png': encodePng(320, 200, photoRgba(320, 200)),
  'photo.jpg': encodeJpeg(400, 300, noiseImage(400, 300, 4, 8)),
  'tiny.gif': encodeGif(
    40,
    30,
    Uint8Array.from({ length: 1200 }, (_, i) => (i % 40 < 20 ? 1 : 2)),
    [
      [255, 255, 255],
      [200, 30, 30],
      [30, 30, 200],
    ],
  ),
};
for (const [name, bytes] of Object.entries(files)) {
  await writeFile(new URL(name, out), bytes);
}
console.log(
  `wrote ${Object.keys(files).length} fixtures to test/fixtures/generated`,
);
