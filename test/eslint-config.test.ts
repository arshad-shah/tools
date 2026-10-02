import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Loading the full config (typescript-eslint, plugins) takes seconds.
describe('eslint.config.js', { timeout: 60_000 }, () => {
  it('reports unused disable directives as errors in every runner (CLI and editors)', async () => {
    const eslint = new ESLint();
    const config = await eslint.calculateConfigForFile('src/app/App.tsx');
    expect([2, 'error']).toContain(
      config.linterOptions?.reportUnusedDisableDirectives,
    );
  });

  it('enforces the design-system rules at error in src', async () => {
    const config = await new ESLint().calculateConfigForFile('src/app/App.tsx');
    for (const rule of [
      'local/no-pictographic-text',
      'local/no-raw-ui-outside-kit',
      'local/no-lucide-outside-icons',
      'local/no-disable-enforced',
    ])
      expect(config.rules?.[rule]?.[0] ?? config.rules?.[rule]).toBe(2);
  });
});
