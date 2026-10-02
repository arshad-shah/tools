// Fails when a production dependency carries a licence outside the allow-list
// (plan 6-H H-3). Reads `pnpm licenses list --json --prod`; dev tooling
// never ships, so it is not checked. Run with `pnpm licences`.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const ALLOWED = new Set([
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  '0BSD',
  'CC0-1.0',
  'OFL-1.1',
  // EFF wordlist data (Password Generator).
  'CC-BY-3.0',
]);

/** Licences allowed for one package only, with the reason. */
export const PACKAGE_EXCEPTIONS: Record<
  string,
  { licence: string; why: string }
> = {
  tldts: {
    licence: 'MPL-2.0',
    why: 'embeds the Public Suffix List data, unmodified',
  },
  'tldts-core': {
    licence: 'MPL-2.0',
    why: 'Public Suffix List data, unmodified',
  },
  pako: { licence: 'Zlib', why: 'zlib port; Zlib is permissive' },
  argparse: {
    licence: 'Python-2.0',
    why: 'PSF licence, permissive (prettier CLI dependency)',
  },
};

/**
 * Whether an SPDX expression is acceptable for `name`: every AND term and at
 * least one OR alternative must be allowed. Parentheses are flattened, which
 * is enough for the expressions npm packages use.
 */
export function licenceAllowed(expression: string, name: string): boolean {
  const extra = PACKAGE_EXCEPTIONS[name]?.licence;
  const ok = (id: string) => ALLOWED.has(id) || id === extra;
  const flat = expression.replace(/[()]/g, ' ').trim();
  return flat
    .split(/\s+OR\s+/)
    .some((alt) => alt.split(/\s+AND\s+/).every((id) => ok(id.trim())));
}

interface Entry {
  name: string;
  versions: string[];
}

export function report(json: Record<string, Entry[]>): string[] {
  const failures: string[] = [];
  for (const [licence, entries] of Object.entries(json)) {
    for (const entry of entries) {
      if (!licenceAllowed(licence, entry.name))
        failures.push(`${entry.name}@${entry.versions.join(',')}: ${licence}`);
    }
  }
  return failures.sort();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const out = execFileSync('pnpm', ['licenses', 'list', '--json', '--prod'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024,
  });
  const json = JSON.parse(out) as Record<string, Entry[]>;
  const failures = report(json);
  const count = Object.values(json).reduce((n, e) => n + e.length, 0);
  if (failures.length > 0) {
    console.error(`Licences outside the allow-list (${failures.length}):`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`Licence report: ${count} production packages, all allowed.`);
}
