import { execSync } from 'node:child_process';

/** The CSP spec opens generated PDF fixtures. */
export default function globalSetup() {
  execSync('pnpm fixtures', { stdio: 'inherit' });
}
