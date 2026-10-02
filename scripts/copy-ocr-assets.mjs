import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Same-origin OCR assets (spec 11): the tesseract.js worker, the two
 * LSTM-only cores (SIMD and plain; the app fetches one) and one Latin-script
 * language file per language, copied under a versioned folder
 * `public/ocr/<tesseract.js version>-core-<core version>/` with an
 * exact-size manifest. The same manifest is inlined into the app at build
 * time (scripts/vite-ocr-manifest.ts), so nothing is fetched before consent.
 */

/** Language codes and their display labels, in menu order. */
export const OCR_LANGUAGES = {
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

/**
 * The @tesseract.js-data packages ship `4.0.0` (legacy + LSTM) and
 * `4.0.0_best_int` (LSTM only, integer-quantised). There is no tessdata_fast
 * variant, so the LSTM-only best_int files are used: they are also the
 * smaller of the two.
 */
export const OCR_LANG_VARIANT = '4.0.0_best_int';

/** Single-file cores (wasm embedded); LSTM only, since OEM is LSTM_ONLY. */
export const OCR_CORE_FILES = {
  simd: 'tesseract-core-simd-lstm.wasm.js',
  plain: 'tesseract-core-lstm.wasm.js',
};

export const OCR_MANIFEST_FILE = 'ocr-manifest.json';

/** The manifest's URL path for a version (what the app fetches). */
export const manifestUrl = (version) => `/ocr/${version}/${OCR_MANIFEST_FILE}`;

/** Copy when the destination is missing, older, or a different size. */
const copyIfStale = async (from, to) => {
  const src = await stat(from);
  try {
    const dest = await stat(to);
    if (dest.size === src.size && dest.mtimeMs >= src.mtimeMs) return false;
  } catch {
    // missing: copy
  }
  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
  return true;
};

const readVersion = async (dir) =>
  JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')).version;

/** The versioned folder name: both versions, so a core-only bump moves it. */
export const ocrFolder = (tesseract, core) => `${tesseract}-core-${core}`;

/**
 * Every OCR asset with its source file and the path parts under the
 * versioned folder, plus the folder (the manifest version).
 */
async function assetList(nodeModules) {
  const tesseractDir = join(nodeModules, 'tesseract.js');
  const coreDir = join(nodeModules, 'tesseract.js-core');
  const version = ocrFolder(
    await readVersion(tesseractDir),
    await readVersion(coreDir),
  );
  const files = [
    {
      key: ['worker'],
      from: join(tesseractDir, 'dist', 'worker.min.js'),
      to: ['worker.min.js'],
    },
  ];
  for (const [kind, file] of Object.entries(OCR_CORE_FILES))
    files.push({
      key: ['core', kind],
      from: join(coreDir, file),
      to: ['core', kind, file],
    });
  for (const code of Object.keys(OCR_LANGUAGES)) {
    const file = `${code}.traineddata.gz`;
    files.push({
      key: ['languages', code],
      from: join(
        nodeModules,
        '@tesseract.js-data',
        code,
        OCR_LANG_VARIANT,
        file,
      ),
      to: ['lang', file],
    });
  }
  return { version, files };
}

/** The manifest for `version`, given each asset's size. */
function manifestOf(version, files, sizeOf) {
  const url = (...parts) => ['', 'ocr', version, ...parts].join('/');
  let worker;
  const core = {};
  const languages = {};
  for (const f of files) {
    const entry = { path: url(...f.to), bytes: sizeOf(f) };
    if (f.key[0] === 'worker') worker = entry;
    else if (f.key[0] === 'core')
      core[f.key[1]] = { dir: url(...f.to.slice(0, -1)), ...entry };
    else languages[f.key[1]] = { label: OCR_LANGUAGES[f.key[1]], ...entry };
  }
  return { version, worker, core, languages };
}

/**
 * The manifest from the installed packages, without copying anything
 * (copies keep the source size). Inlined into the app at build time.
 */
export async function buildOcrManifest(nodeModules) {
  const { version, files } = await assetList(nodeModules);
  const sizes = new Map();
  for (const f of files) sizes.set(f, (await stat(f.from)).size);
  return manifestOf(version, files, (f) => sizes.get(f));
}

/**
 * Keep `publicDir/ocr/<version>/` a copy of the OCR runtime assets.
 *
 * Idempotent: unchanged files are left alone and the manifest is rewritten
 * only when its content changes. Older version folders inside `ocr/` are
 * removed; nothing outside `publicDir/ocr` is touched.
 *
 * @returns {Promise<{ version: string, copied: number, manifest: object }>}
 */
export async function copyOcrAssets({ nodeModules, publicDir }) {
  const { version, files } = await assetList(nodeModules);
  const ocrRoot = join(publicDir, 'ocr');
  const root = join(ocrRoot, version);
  let copied = 0;
  const sizes = new Map();
  for (const f of files) {
    const to = join(root, ...f.to);
    if (await copyIfStale(f.from, to)) copied += 1;
    sizes.set(f, (await stat(to)).size);
  }

  const manifest = manifestOf(version, files, (f) => sizes.get(f));
  const text = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestPath = join(root, OCR_MANIFEST_FILE);
  const previous = await readFile(manifestPath, 'utf8').catch(() => '');
  if (previous !== text) await writeFile(manifestPath, text);

  for (const entry of await readdir(ocrRoot)) {
    if (entry !== version) {
      await rm(join(ocrRoot, entry), { recursive: true, force: true });
    }
  }
  return { version, copied, manifest };
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));
  const { version, copied } = await copyOcrAssets({
    nodeModules: path('../node_modules/'),
    publicDir: path('../public/'),
  });
  console.log(
    copied === 0
      ? `OCR ${version} assets already in public/ocr`
      : `copied ${copied} OCR ${version} asset files to public/ocr`,
  );
}
