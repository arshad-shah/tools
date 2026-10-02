import { mkdir, writeFile } from 'node:fs/promises';
import {
  makeAesEncryptedPdf,
  makeLargePdf,
  makeFormPdf,
  makeExifPhotoPdf,
  makeImageHeavyPdf,
  makeOwnerOnlyEncryptedPdf,
  makeMetadataPdf,
  makeShapesOnlyPdf,
  makeStructuredPdf,
  makeTextPdf,
  makeXfaPdf,
} from '../test/fixtures/builders';
import { largeCsv, windows1252Csv } from '../test/fixtures/csv';
import { makeAnnotatedPdf } from '../test/fixtures/annotated';
import {
  makeRedactAdversarial,
  makeType3FontPdf,
} from '../test/fixtures/redact';
import {
  makeFlatFormStroked,
  makeFlatFormWord,
  makeMixedAcroform,
  makeNegativeReport,
  makeScanForm,
} from '../test/fixtures/flat-form';
import { makeWordTableForm } from '../test/fixtures/word-table-form';
import { makeCharBoxForm } from '../test/fixtures/char-box-form';
import {
  encodeGif,
  encodeJpeg,
  encodePng,
  noiseImage,
  withExifOrientation,
} from '../test/fixtures/images';
import {
  jpegWithMetadata,
  pngWithMetadata,
  webpWithMetadata,
} from '../test/fixtures/exif';

import { syntheticPhoto } from '../src/pdf/sign/photo/test-images';

const out = new URL('../test/fixtures/generated/', import.meta.url);
await mkdir(out, { recursive: true });

function photoRgba(width: number, height: number): Uint8Array {
  const rgba = noiseImage(width, height, 4, 7);
  // Transparent top-left quadrant, so PNG alpha handling is observable.
  for (let y = 0; y < height / 2; y++)
    for (let x = 0; x < width / 2; x++) rgba[(y * width + x) * 4 + 3] = 0;
  return rgba;
}

/** White card with a dark diagonal band: a scanned signature stand-in. */
function signatureRgba(width: number, height: number): Uint8Array {
  const rgba = new Uint8Array(width * height * 4).fill(255);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (Math.abs(y - x / 3) < 6)
        rgba.set([20, 20, 40, 255], (y * width + x) * 4);
  return rgba;
}

/** About 20 MB of records for the JSON & XML Viewer large-input e2e. */
function largeJson(): Uint8Array {
  const rows: string[] = [];
  for (let i = 0; i < 83_000; i++)
    rows.push(
      JSON.stringify({
        id: i,
        name: `Item ${i}`,
        email: `user${i}@example.com`,
        active: i % 3 === 0,
        score: (i * 7919) % 1000,
        tags: ['alpha', 'beta', 'gamma'].slice(0, (i % 3) + 1),
        address: {
          street: `${i} Long Road`,
          city: 'Springfield',
          zip: String(10000 + (i % 89999)),
        },
        note: 'x'.repeat(40),
      }),
    );
  return new TextEncoder().encode(`{"items":[\n${rows.join(',\n')}\n]}\n`);
}

/** 5,000 objects and arrays (cards) for the Map worker-layout e2e. */
function map5000Json(): Uint8Array {
  const items = Array.from({ length: 1666 }, (_, i) => ({
    id: i,
    meta: {
      created: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      rev: i % 7,
    },
    tags: [`t${i % 5}`, `t${i % 11}`],
  }));
  return new TextEncoder().encode(JSON.stringify({ items }));
}
const wordTableForm = await makeWordTableForm();
const charBoxForm = await makeCharBoxForm();
const flatFormWord = await makeFlatFormWord();

const files: Record<string, Uint8Array> = {
  'large.json': largeJson(),
  'map-5000.json': map5000Json(),
  'exif-gps.jpg': jpegWithMetadata(),
  'exif-text.png': pngWithMetadata(),
  'exif-xmp.webp': webpWithMetadata(),
  'text-3.pdf': await makeTextPdf({ pages: 3, label: 'Alpha' }),
  'annotated.pdf': await makeAnnotatedPdf(),
  'text-12.pdf': await makeTextPdf({ pages: 12, label: 'Beta' }),
  'text-300.pdf': await makeTextPdf({ pages: 300, label: 'Big' }),
  'large-300.pdf': await makeLargePdf(300),
  'shapes-2.pdf': await makeShapesOnlyPdf(2),
  'a2-1.pdf': await makeTextPdf({
    pages: 1,
    label: 'Poster',
    size: [1191, 1684],
  }),
  'structured-3.pdf': await makeStructuredPdf(3),
  'encrypted-aes.pdf': await makeAesEncryptedPdf(),
  'encrypted-owner-only.pdf': await makeOwnerOnlyEncryptedPdf(),
  'form.pdf': await makeFormPdf(),
  'xfa-form.pdf': await makeXfaPdf(),
  'images-heavy.pdf': await makeImageHeavyPdf(),
  'exif-photos.pdf': await makeExifPhotoPdf(),
  'metadata.pdf': await makeMetadataPdf(),
  'redact-adversarial.pdf': await makeRedactAdversarial(),
  'type3-font.pdf': await makeType3FontPdf(),
  'flat-form-word.pdf': flatFormWord.bytes,
  'flat-form-word.truth.json': new TextEncoder().encode(
    JSON.stringify(flatFormWord.truth, null, 2),
  ),
  'flat-form-stroked.pdf': (await makeFlatFormStroked()).bytes,
  'negative-report.pdf': await makeNegativeReport(),
  'mixed-acroform.pdf': (await makeMixedAcroform()).bytes,
  'scan-form.pdf': await makeScanForm(),
  'word-table-form.pdf': wordTableForm.bytes,
  'word-table-form.truth.json': new TextEncoder().encode(
    JSON.stringify(wordTableForm.truth, null, 2),
  ),
  'char-box-form.pdf': charBoxForm.bytes,
  'char-box-form.truth.json': new TextEncoder().encode(
    JSON.stringify(charBoxForm.truth, null, 2),
  ),
  'photo.png': encodePng(320, 200, photoRgba(320, 200)),
  'photo.jpg': encodeJpeg(400, 300, noiseImage(400, 300, 4, 8)),
  'signature.jpg': encodeJpeg(300, 100, signatureRgba(300, 100), 92),
  // A phone photo of a signature at 6 degrees on light paper (plan H-15).
  'signature-photo.png': encodePng(
    640,
    320,
    new Uint8Array(syntheticPhoto(640, 320, 6, 5).buffer),
  ),
  // Stored 300x100, shown 100x300: a phone photo taken sideways (EXIF 6).
  'signature-exif6.jpg': withExifOrientation(
    encodeJpeg(300, 100, signatureRgba(300, 100), 92),
    6,
  ),
  'large.csv': largeCsv(500_000),
  'windows-1252.csv': windows1252Csv(),
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

// Part 6-C text fixtures: a 200 MB log (written once, streamed) and a
// large diff pair.
{
  const { createWriteStream } = await import('node:fs');
  const { stat } = await import('node:fs/promises');
  const LOG_BYTES = 200 * 1024 * 1024;
  const logUrl = new URL('large.log', out);
  const have = await stat(logUrl).then(
    (s) => s.size,
    () => 0,
  );
  if (have < LOG_BYTES) {
    const levels = ['INFO', 'INFO', 'INFO', 'DEBUG', 'WARN', 'ERROR'];
    const stream = createWriteStream(logUrl);
    let written = 0;
    let i = 0;
    const t0 = Date.UTC(2024, 0, 1);
    while (written < LOG_BYTES) {
      const lines: string[] = [];
      for (let k = 0; k < 5000; k++, i++) {
        const ts = new Date(t0 + i * 250).toISOString();
        const level = levels[i % levels.length];
        lines.push(
          `${ts} ${level} [worker-${i % 8}] request ${i} handled in ${(i * 7) % 900} ms`,
        );
        if (i % 1000 === 999)
          lines.push(
            'java.lang.IllegalStateException: synthetic failure',
            '\tat com.example.Worker.run(Worker.java:42)',
            '\tat java.base/java.lang.Thread.run(Thread.java:833)',
          );
      }
      const chunk = `${lines.join('\n')}\n`;
      written += Buffer.byteLength(chunk);
      if (!stream.write(chunk))
        await new Promise((r) => stream.once('drain', r));
    }
    await new Promise<void>((r) => stream.end(r));
  }
  const left: string[] = [];
  const right: string[] = [];
  for (let n = 0; n < 20_000; n++) {
    left.push(`line ${n}: the quick brown fox ${n % 97}`);
    if (n % 400 === 7) right.push(`line ${n}: the quick red fox ${n % 97}`);
    else if (n % 900 === 3) right.push(left[n], `inserted after ${n}`);
    else if (n % 1100 !== 5) right.push(left[n]);
  }
  await writeFile(new URL('large-diff-left.txt', out), `${left.join('\n')}\n`);
  await writeFile(
    new URL('large-diff-right.txt', out),
    `${right.join('\n')}\n`,
  );
  console.log('wrote the large.log and large-diff text fixtures');
}
