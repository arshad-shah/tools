import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cynosureThemeCss } from '../scripts/gen-cynosure-theme';

/*
 * tools' Cynosure theme (accent #3ddc97) ships as a static stylesheet, so
 * the first paint already has it (tools#104, Phase 0 Task 2). The file is
 * generated; this keeps it in step with the installed Cynosure.
 */
describe('Cynosure theme stylesheet', () => {
  const css = readFileSync('src/theme/cynosure-theme.css', 'utf8');

  it('is what Cynosure generates for the tools accent', () => {
    expect(css).toBe(cynosureThemeCss());
    expect(css).toContain('--cy-color-accent:#3ddc97');
  });

  it('loads after Cynosure styles and before tools tokens', () => {
    const main = readFileSync('src/main.tsx', 'utf8');
    const at = (s: string) => main.indexOf(s);
    expect(at("import './theme/cynosure-theme.css';")).toBeGreaterThan(
      at("import '@arshad-shah/cynosure/styles.css';"),
    );
    expect(at("import './theme/cynosure-theme.css';")).toBeLessThan(
      at("import './theme/tokens.css';"),
    );
  });
});
