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

  it('loads in a cascade layer below Tailwind utilities', () => {
    // Call sites style Cynosure parts with layout utilities (p-3, hidden
    // sm:flex): those must win, so Cynosure sits in a layer between base and
    // components (the facade reports, tools#104).
    const tokens = readFileSync('src/theme/tokens.css', 'utf8');
    expect(tokens).toMatch(
      /^@layer theme, base, cynosure, components, utilities;\s*@import 'tailwindcss';/,
    );
    expect(tokens).toContain(
      "@import '@arshad-shah/cynosure/styles.css' layer(cynosure);",
    );
    expect(readFileSync('src/main.tsx', 'utf8')).not.toContain('cynosure');
  });
});
