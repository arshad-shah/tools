/**
 * Bundled third-party libraries and data that need attribution. Append-only:
 * each Part adds one entry per package it bundles.
 */
export interface LicenceEntry {
  name: string;
  /** SPDX identifier. */
  licence: string;
  url: string;
  note?: string;
}

export const LICENCES: LicenceEntry[] = [
  {
    name: '@noble/hashes',
    licence: 'MIT',
    url: 'https://github.com/paulmillr/noble-hashes',
    note: 'Hashes, HMAC and Argon2id (replaces hash-wasm, ruling R29)',
  },
  {
    name: 'yaml',
    licence: 'ISC',
    url: 'https://github.com/eemeli/yaml',
  },
  {
    name: 'smol-toml',
    licence: 'BSD-3-Clause',
    url: 'https://github.com/squirrelchat/smol-toml',
  },
  {
    name: 'fflate',
    licence: 'MIT',
    url: 'https://github.com/101arrowz/fflate',
    note: 'DEFLATE and ZIP: share links, XLSX export',
  },
  {
    name: 'Inter',
    licence: 'OFL-1.1',
    url: 'https://github.com/rsms/inter',
    note: 'Interface font',
  },
  {
    name: 'JetBrains Mono',
    licence: 'OFL-1.1',
    url: 'https://github.com/JetBrains/JetBrainsMono',
    note: 'Monospace font',
  },
  {
    name: 'zxing-wasm',
    licence: 'MIT',
    url: 'https://github.com/Sec-ant/zxing-wasm',
    note: 'Barcode decoding fallback (zxing-cpp, Apache-2.0); wasm served from this site',
  },
  {
    name: 'tldts',
    licence: 'MIT',
    url: 'https://github.com/remusao/tldts',
    note: 'Registrable domain split; embeds the Public Suffix List (MPL-2.0, unmodified, https://publicsuffix.org)',
  },
  {
    name: 'Pomodoro sounds (bell, wood block)',
    licence: 'MIT',
    url: 'https://github.com/arshad-shah/tools',
    note: 'Synthesised in-house for this project (src/tools/pomodoro/assets)',
  },
  {
    name: 'micromark',
    licence: 'MIT',
    url: 'https://github.com/micromark/micromark',
    note: 'Markdown Editor rendering',
  },
  {
    name: 'micromark-extension-gfm',
    licence: 'MIT',
    url: 'https://github.com/micromark/micromark-extension-gfm',
    note: 'GitHub Flavored Markdown for the Markdown Editor',
  },
  {
    name: 'EFF large wordlist',
    licence: 'CC-BY-3.0-US',
    url: 'https://www.eff.org/dice',
    note: 'Passphrase words (7,776), Electronic Frontier Foundation',
  },
  {
    name: '@zxcvbn-ts/core, language-common, language-en',
    licence: 'MIT',
    url: 'https://github.com/zxcvbn-ts/zxcvbn',
    note: 'Password strength checker (loaded on first use)',
  },
  {
    name: 'prettier',
    licence: 'MIT',
    url: 'https://github.com/prettier/prettier',
    note: 'Code Formatter (standalone build and plugins)',
  },
  {
    name: 'sql-formatter',
    licence: 'MIT',
    url: 'https://github.com/sql-formatter-org/sql-formatter',
    note: 'Code Formatter (SQL)',
  },
  {
    name: 'terser',
    licence: 'BSD-2-Clause',
    url: 'https://github.com/terser/terser',
    note: 'Code Formatter (JavaScript minifier)',
  },
  {
    name: 'csso',
    licence: 'MIT',
    url: 'https://github.com/css/csso',
    note: 'Code Formatter (CSS minifier)',
  },
  {
    name: 'upng-js',
    licence: 'MIT',
    url: 'https://github.com/photopea/UPNG.js',
    note: 'PNG (256 colours) quantisation in the Image Compressor',
  },
  {
    name: 'pako',
    licence: 'MIT AND Zlib',
    url: 'https://github.com/nodeca/pako',
    note: 'Deflate for upng-js',
  },
  {
    name: '@jsquash/avif',
    licence: 'Apache-2.0',
    url: 'https://github.com/jamsinclair/jSquash',
    note: 'AVIF encoder (libavif via Squoosh), served from this site',
  },
  {
    name: 'exifr',
    licence: 'MIT',
    url: 'https://github.com/MikeKovarik/exifr',
    note: 'Metadata reading in the EXIF Viewer',
  },
  {
    name: 'react, react-dom',
    licence: 'MIT',
    url: 'https://github.com/facebook/react',
  },
  {
    name: 'react-router-dom',
    licence: 'MIT',
    url: 'https://github.com/remix-run/react-router',
  },
  {
    name: 'zustand',
    licence: 'MIT',
    url: 'https://github.com/pmndrs/zustand',
  },
  {
    name: '@arshad-shah/store-kit',
    licence: 'MIT',
    url: 'https://github.com/arshad-shah/kit',
    note: 'Persisted tool stores',
  },
  {
    name: '@arshad-shah/detent, detent-react',
    licence: 'MIT',
    url: 'https://github.com/arshad-shah/detent',
  },
  {
    name: '@arshad-shah/qpdf-wasm',
    licence: 'MIT',
    url: 'https://github.com/arshad-shah/qpdf-wasm',
    note: 'PDF tools; bundles qpdf (Apache-2.0) as wasm',
  },
  {
    name: 'sonner',
    licence: 'MIT',
    url: 'https://github.com/emilkowalski/sonner',
    note: 'Toasts',
  },
  {
    name: 'lucide-react',
    licence: 'ISC',
    url: 'https://github.com/lucide-icons/lucide',
    note: 'Icons',
  },
  {
    name: 'clsx',
    licence: 'MIT',
    url: 'https://github.com/lukeed/clsx',
  },
  {
    name: 'tailwind-merge',
    licence: 'MIT',
    url: 'https://github.com/dcastil/tailwind-merge',
  },
  {
    name: 'class-variance-authority',
    licence: 'Apache-2.0',
    url: 'https://github.com/joe-bell/cva',
  },
  {
    name: '@internationalized/date',
    licence: 'Apache-2.0',
    url: 'https://github.com/adobe/react-spectrum',
  },
  {
    name: 'diff',
    licence: 'BSD-3-Clause',
    url: 'https://github.com/kpdecker/jsdiff',
    note: 'Text Diff',
  },
  {
    name: 'mathjs',
    licence: 'Apache-2.0',
    url: 'https://github.com/josdejong/mathjs',
    note: 'Calculator',
  },
  {
    name: 'papaparse',
    licence: 'MIT',
    url: 'https://github.com/mholt/PapaParse',
    note: 'CSV parsing',
  },
  {
    name: 'qrcode.react',
    licence: 'ISC',
    url: 'https://github.com/zpao/qrcode.react',
    note: 'QR code rendering',
  },
  {
    name: '@rive-app/canvas, react-canvas',
    licence: 'MIT',
    url: 'https://github.com/rive-app/rive-wasm',
    note: 'Rive Animation Player',
  },
  {
    name: 'pdf-lib',
    licence: 'MIT',
    url: 'https://github.com/Hopding/pdf-lib',
    note: 'PDF editing',
  },
  {
    name: '@pdf-lib/fontkit, standard-fonts',
    licence: 'MIT',
    url: 'https://github.com/Hopding/fontkit',
    note: 'Font embedding for pdf-lib',
  },
  {
    name: 'pdfjs-dist',
    licence: 'Apache-2.0',
    url: 'https://github.com/mozilla/pdf.js',
    note: 'PDF rendering',
  },
  {
    name: 'tesseract.js, tesseract.js-core',
    licence: 'Apache-2.0',
    url: 'https://github.com/naptha/tesseract.js',
    note: 'OCR',
  },
  {
    name: '@tesseract.js-data/deu, eng, fra, gle, ita, nld, pol, por, spa, swe',
    licence: 'MIT',
    url: 'https://github.com/naptha/tessdata',
    note: 'OCR language data (Tesseract traineddata, Apache-2.0)',
  },
  {
    name: '@fontsource/caveat, dancing-script, great-vibes, noto-sans',
    licence: 'OFL-1.1',
    url: 'https://github.com/fontsource/font-files',
    note: 'Caveat, Dancing Script, Great Vibes and Noto Sans fonts',
  },
  {
    name: 'perfect-freehand',
    licence: 'MIT',
    url: 'https://github.com/steveruizok/perfect-freehand',
    note: 'Pressure-sensitive ink outlines for drawn signatures',
  },
  {
    name: 'pkijs, asn1js',
    licence: 'BSD-3-Clause',
    url: 'https://github.com/PeculiarVentures/PKI.js',
    note: 'PKI.js and ASN1.js: PKCS#12, X.509 and CMS for digital signatures',
  },
  {
    name: '@fontsource/sacramento, allura, alex-brush, parisienne, pinyon-script, mr-dafoe, kristi',
    licence: 'OFL-1.1',
    url: 'https://fontsource.org',
    note: 'Signature fonts for typed signatures; embedded as subsets in signed PDFs',
  },
];
