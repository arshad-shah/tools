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
];
