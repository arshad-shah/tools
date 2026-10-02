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
];
