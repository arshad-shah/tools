import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cynosureThemeCss } from '../scripts/gen-cynosure-theme';

/*
 * tools' Cynosure theme (accent #3ddc97) ships as a static stylesheet, so
 * the first paint already has it (tools#104, Phase 0 Task 2). The file is
 * generated; this keeps it in step with the installed Cynosure.
 */
describe('Cynosure theme stylesheet', () => {
  // Line endings aside: a Windows checkout may turn LF into CRLF.
  const css = readFileSync('src/theme/cynosure-theme.css', 'utf8').replace(
    /\r\n/g,
    '\n',
  );

  it('is what Cynosure generates for the tools accent', () => {
    expect(css).toBe(cynosureThemeCss());
    expect(css).toContain('--cy-color-accent:#3ddc97');
  });

  it('loads right after Cynosure styles, in the same layer', () => {
    const tokens = readFileSync('src/theme/tokens.css', 'utf8');
    const at = (s: string) => tokens.indexOf(s);
    expect(
      at("@import './cynosure-theme.css' layer(cynosure);"),
    ).toBeGreaterThan(
      at("@import '@arshad-shah/cynosure/styles.css' layer(cynosure);"),
    );
  });
});
