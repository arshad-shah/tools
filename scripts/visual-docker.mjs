// Runs the visual suite in the pinned Playwright container so Linux baselines
// match CI (decision G8). Extra arguments go to `pnpm test:visual`, e.g.
//   pnpm test:visual:docker --update-snapshots
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const IMAGE = 'mcr.microsoft.com/playwright:v1.63.0-noble';
const args = process.argv.slice(2).join(' ');
const repo = resolve(process.cwd());

const probe = spawnSync('docker', ['--version'], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
});
if (probe.status !== 0) {
  console.error(
    'docker is not on PATH. Install Docker to produce Linux visual baselines.',
  );
  process.exit(1);
}

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '-v',
    `${repo}:/work`,
    '-v',
    '/work/node_modules',
    '-w',
    '/work',
    '-e',
    'CI=1',
    IMAGE,
    'bash',
    '-lc',
    `corepack enable && pnpm install --frozen-lockfile && pnpm test:visual ${args}`,
  ],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
