import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * Cynosure migration (tools#104), Phase 0 Task 1: Cynosure's stylesheet loads
 * before tools' own tokens, so tokens.css can alias --cy-* roles.
 */
describe('Cynosure styles', () => {
  it('is a dependency from npm', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['@arshad-shah/cynosure']).toMatch(
      /^\^0\.\d+\.\d+$/,
    );
  });

  it('loads before tools tokens', () => {
    const main = readFileSync('src/main.tsx', 'utf8');
    const cy = main.indexOf("import '@arshad-shah/cynosure/styles.css';");
    const tokens = main.indexOf("import './theme/tokens.css';");
    expect(cy).toBeGreaterThanOrEqual(0);
    expect(cy).toBeLessThan(tokens);
  });
});
