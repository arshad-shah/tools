import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** CI-provided commit SHAs, in order of preference, for builds without .git. */
const CI_SHA_VARS = [
  'WORKERS_CI_COMMIT_SHA', // Cloudflare Workers Builds
  'CF_PAGES_COMMIT_SHA', // Cloudflare Pages
  'GITHUB_SHA', // GitHub Actions
] as const;

interface ShaSources {
  /** Runs a git command; throws when git or .git is unavailable. */
  git?: () => string;
  env?: Record<string, string | undefined>;
}

const repoGit = () =>
  execSync('git rev-parse --short HEAD', {
    // Resolve the repo from this file, not from wherever the build was run.
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    stdio: ['ignore', 'pipe', 'ignore'],
  }).toString();

/** Short commit SHA from git, else from CI env vars, else ''. */
export function resolveSha({
  git = repoGit,
  env = process.env,
}: ShaSources = {}): string {
  try {
    const sha = git().trim();
    if (sha) return sha;
  } catch {
    // No git (or no .git) on this machine: try the CI variables.
  }
  for (const name of CI_SHA_VARS) {
    const sha = env[name]?.trim();
    if (sha) return sha.slice(0, 7);
  }
  return '';
}

/** Vite `define` entries for the footer build stamp. Never throws. */
export function buildDefines(): Record<string, string> {
  return {
    __BUILD_SHA__: JSON.stringify(resolveSha()),
    // UTC date of the build (not of the commit), as YYYY-MM-DD.
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  };
}
