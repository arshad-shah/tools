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
