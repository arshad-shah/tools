import { execSync } from 'node:child_process';

function gitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

/** Vite `define` entries for the footer build stamp. Never throws. */
export function buildDefines(): Record<string, string> {
  return {
    __BUILD_SHA__: JSON.stringify(gitSha()),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  };
}
