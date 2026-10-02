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
    name: 'perfect-freehand',
    licence: 'MIT',
    url: 'https://github.com/steveruizok/perfect-freehand',
    note: 'Pressure-sensitive ink outlines for drawn signatures',
  },
  {
    name: 'PKI.js and ASN1.js',
    licence: 'BSD-3-Clause',
    url: 'https://github.com/PeculiarVentures/PKI.js',
    note: 'PKCS#12, X.509 and CMS for digital signatures',
  },
  {
    name: 'Signature fonts (Sacramento, Allura, Alex Brush, Parisienne, Pinyon Script, Mr Dafoe, Kristi)',
    licence: 'OFL-1.1',
    url: 'https://fontsource.org',
    note: 'Typed signatures; embedded as subsets in signed PDFs',
  },
];
