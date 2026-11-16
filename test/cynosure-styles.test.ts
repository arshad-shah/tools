import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * Cynosure migration (tools#104): the app's only stylesheet is Cynosure's,
 * with the generated tools theme (src/theme/app.css).
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

  it('is the app stylesheet, with no Tailwind and no product rules on its parts', () => {
    const app = readFileSync('src/theme/app.css', 'utf8');
    expect(app).toContain("@import '@arshad-shah/cynosure/styles.css';");
    expect(app).not.toMatch(/tailwind|@theme|@utility|@custom-variant/);
    expect(app).not.toMatch(/\.cy-/);
    expect(readFileSync('src/main.tsx', 'utf8')).toContain(
      "import './theme/app.css';",
    );
  });
});
