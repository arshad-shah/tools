# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared foundation (test infra, shared lib/state, worker RPC, manifest registry, PDF render/edit core, PDF components) and prove it with rebuilt PDF Merger, PDF Splitter and a new Organize Pages tool.

**Architecture:**

- `src/shared/` holds framework-level reuse: `ui` (kit), `lib` (pure helpers) and `state` (store-kit + job runner).
- `src/pdf/` holds the PDF domain core. It contains a pdf.js render worker reached through an in-house typed RPC, pure pdf-lib edit functions, and PDF UI components.
- Tools are registered by one `index.ts` manifest per folder, discovered with `import.meta.glob`.

**Tech Stack:**

- Runtime: React 19, Vite 8, TypeScript 6, Tailwind v4 kit.
- PDF: pdf-lib 1.17, pdfjs-dist 6.3.
- Owner packages: @arshad-shah/store-kit + zustand 5, @arshad-shah/detent + detent-react 0.3.
- Utilities: fflate, sonner.
- Testing: Vitest 5, Testing Library, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-10-01-pdf-suite-and-modular-architecture-design.md`

## Global Constraints

**Platform**

- Fully client-side. No document bytes leave the browser, and no network calls are made except loading same-origin static assets.
- Stay MIT-compatible. Never add `mupdf`, Ghostscript, Comlink, `@dnd-kit` or `cynosure-*`.
- Prefer `@arshad-shah/*` packages over third-party ones.

**Behaviour**

- Nothing faked. Every operation does the real thing or throws a `ToolError` explaining why it can't.
- Existing tool IDs and URLs are preserved: `pdf-merger`, `pdf-splitter`, and all 25 current ids.
- Documents, bytes and results are never persisted. Only small settings go to localStorage, via `createToolStore`.
- Encrypted PDFs are rejected in phase 1 with `ENCRYPTED`. There is no password flow until phase 3.

**Code conventions**

- Use `@/` imports. Relative imports never climb out of their own module folder.
- New tool folders are kebab-case and match the tool id. The entry file is `Tool.tsx`.
- Non-JSX files use `.ts`.
- All UI comes from the kit (`@/shared/ui`) plus Tailwind tokens. No new CSS modules. Inline `style` only for data-driven dimensions such as aspect ratio.

**Package manager and git**

- Package manager: `pnpm` 10.11.0. Run commands with `pnpm`, never npm.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never `--no-verify`.

## Review Focus

1. **Huge PDFs (300+ pages) in Splitter/Organize grids.** Thumbnails render lazily and the bitmap cache stays bounded, so the tab does not balloon. Covered by Task 12 (`BitmapCache` eviction tests) and Task 13 (`PageThumb` only renders when intersecting).
2. **An encrypted PDF dropped into any tool.** The user sees "password-protected … not supported yet", with no crash and no blank output. Covered by Task 11 (`loadPdf` ENCRYPTED test) and Task 13 (`PdfDropzone` lists the rejected file).
3. **A non-PDF renamed to `.pdf`, a zero-byte file, or a truncated PDF.** Gives an `INVALID_FILE` message naming the file. Covered by Task 3 (`loadFile` tests) and Task 11 (`loadPdf` garbage-body test).
4. **Navigating away or replacing the file mid-job.** No state updates after unmount, the worker request is aborted, and the old document is closed in the worker. Covered by Task 6 (`useJob` unmount test) and Task 7 (RPC abort test).
5. **Page-range typos:** spaces, reversed `5-2`, out of bounds `9` on a 5-page doc, open-ended `3-`, `-2`, empty, letters. Each gives a precise message, never a silent partial result. Covered by Task 11 (`parsePageRanges` table test).

---

## File Structure (phase 1 end state)

```
src/
  app/
    App.tsx                     router; lazy components built once at module scope; global <Toaster/>
    registry.ts                 import.meta.glob manifests → TOOLS, getEnabledTools, getTool, buildRegistry
    registry.test.ts
    tool.ts                     ToolDefinition, ToolManifest, ToolProps, ToolComponent, ToolCategory, defineTool
    Dashboard.tsx  ToolLayout.tsx  ErrorBoundary.tsx  ToolErrorBoundary.tsx  Footer.tsx  NotFound.tsx  AnimatedBackground.tsx   (moved from src/components)
  shared/
    ui/                         kit (moved from src/components/ui)
    lib/
      errors.ts  format.ts  files.ts  download.ts  clipboard.ts  notify.ts
      worker-rpc.ts
      *.test.ts
    state/
      useJob.ts  createToolStore.ts  *.test.ts(x)
  pdf/
    edit/     load.ts  ranges.ts  ops.ts  index.ts  *.test.ts
    render/   types.ts  text.ts  canvas-factory.ts  render.worker.ts  client.ts  bitmap-cache.ts  hooks.ts  pdfjs-worker.d.ts  *.test.ts
    components/
      useSortableList.ts  PdfDropzone.tsx  PageThumb.tsx  PageGrid.tsx  SortableFileList.tsx  JobPanel.tsx  ResultFiles.tsx  index.ts  *.test.ts(x)
  tools/
    pdf-merger/   index.ts  Tool.tsx
    pdf-splitter/ index.ts  Tool.tsx  store.ts  lib/plan.ts  lib/plan.test.ts
    pdf-organize/ index.ts  Tool.tsx  lib/edits.ts  lib/edits.test.ts
    <22 existing folders>/index.ts   (manifest only; tool code untouched)
  components/ui/index.ts        TEMP shim: export * from '@/shared/ui'   (removed in phase 4)
  hooks/useClipboard.tsx        TEMP shim re-exporting shared clipboard   (removed in phase 4)
  types/ToolTypes.ts            TEMP shim re-exporting @/app/tool types   (removed in phase 4)
  vite-env.d.ts
test/
  setup.ts  fixtures/builders.ts  fixtures/builders.test.ts  e2e/*.spec.ts
scripts/
  copy-pdfjs-assets.mjs  gen-fixtures.ts
vitest.config.ts  playwright.config.ts  tsconfig.test.json
```

Deleted by the end of phase 1:

- `src/constants.ts`
- `src/data/ToolDefinitions.ts`
- `src/registry/ToolRegistry.ts`
- `src/tools/PdfMerger/`
- `src/tools/PdfSplitter/`
- `src/types/PdfMergerTypes.ts`
- `src/types/PdfSplitterTypes.ts`

---

### Task 1: Test infrastructure, TS config and CI

**Files:**

- Modify: `package.json` (scripts, devDependencies)
- Modify: `tsconfig.json`, `tsconfig.app.json`, `eslint.config.js`, `.gitignore`, `.github/workflows/ci.yml`
- Create: `vitest.config.ts`, `playwright.config.ts`, `tsconfig.test.json`, `test/setup.ts`, `src/vite-env.d.ts`, `test/smoke.test.ts`, `test/e2e/smoke.spec.ts`

**Interfaces:**

- Produces: `pnpm test` (Vitest, node env by default; a file opts into DOM with a `/** @vitest-environment jsdom */` docblock), `pnpm test:e2e` (Playwright, Chromium), `pnpm typecheck` covering `src`, `test` and `scripts`.

- [ ] **Step 1: Install dev dependencies**

```bash
pnpm add -D vitest@^5.0.3 jsdom @testing-library/react @testing-library/dom @playwright/test@^1.63.0 tsx
pnpm exec playwright install chromium
```

- [ ] **Step 2: Add scripts to `package.json`**

Replace the `"typecheck"` line and add the test scripts inside `"scripts"`:

```json
"typecheck": "tsc -b --noEmit",
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Separate from vite.config.ts so the Cloudflare plugin never runs under test.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.ts'],
    exclude: ['test/e2e/**', 'node_modules/**'],
    setupFiles: ['./test/setup.ts'],
    restoreMocks: true,
  },
});
```

- [ ] **Step 4: Create `test/setup.ts`**

```ts
import { afterEach } from 'vitest';

// Testing Library only auto-cleans with globals enabled; we keep globals off.
afterEach(async () => {
  if (typeof document === 'undefined') return;
  const { cleanup } = await import('@testing-library/react');
  cleanup();
});
```

- [ ] **Step 5: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 6: TS config.** In `tsconfig.app.json`, change `"target": "ES2020"` → `"ES2022"` and `"lib": ["ES2020", "DOM", "DOM.Iterable"]` → `["ES2022", "DOM", "DOM.Iterable"]`. This is needed for `Error` `cause` and `Array.prototype.at`.

Create `tsconfig.test.json`:

```json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.test.tsbuildinfo",
    "types": ["node", "vite/client"]
  },
  "include": [
    "src/**/*.test.ts",
    "src/**/*.test.tsx",
    "test",
    "scripts",
    "vitest.config.ts",
    "playwright.config.ts"
  ],
  "exclude": ["node_modules", "dist"]
}
```

In `tsconfig.json` add `{ "path": "./tsconfig.test.json" }` to `references`.

- [ ] **Step 7: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'test/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:5174', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 8: ESLint node globals for tooling files.** Append to the `tseslint.config(...)` arguments in `eslint.config.js`:

```js
  {
    files: ['scripts/**/*.{ts,mjs}', 'test/**/*.ts', '*.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
```

Also change `{ ignores: ['dist'] }` to `{ ignores: ['dist', 'public/pdfjs', 'playwright-report', 'test-results'] }`.

- [ ] **Step 9: `.gitignore`.** Append:

```
# test + generated assets
playwright-report
test-results
test/fixtures/generated
public/pdfjs
```

- [ ] **Step 10: Write the smoke tests**

`test/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('vitest', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

`test/e2e/smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('dashboard lists tools', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('tools');
  await expect(page.getByText('PDF Merger')).toBeVisible();
});
```

- [ ] **Step 11: Run everything**

Run: `pnpm test` → Expected: 1 passed.
Run: `pnpm test:e2e` → Expected: 1 passed.
Run: `pnpm typecheck && pnpm lint` → Expected: exit 0. Warnings that existed before are allowed; errors are not.

- [ ] **Step 12: CI.** In `.github/workflows/ci.yml`:
  - Replace the `Typecheck` step's command with `pnpm typecheck`.
  - Add after `Build`:

```yaml
- name: Unit tests
  run: pnpm test
```

- Add a second job:

```yaml
e2e:
  name: E2E (Chromium)
  runs-on: ubuntu-latest
  timeout-minutes: 15
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - run: pnpm exec playwright install --with-deps chromium
    - run: pnpm test:e2e
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: playwright-report
```

- Change the `verify` job's `node-version: 20` to `22`, because pdfjs-dist 6 requires Node ≥ 22.13.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: add vitest, playwright, test tsconfig and CI test jobs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `errors` and `format`

**Files:**

- Create: `src/shared/lib/errors.ts`, `src/shared/lib/errors.test.ts`, `src/shared/lib/format.ts`, `src/shared/lib/format.test.ts`

**Interfaces:**

- Produces:
  - `type ToolErrorCode = 'INVALID_FILE' | 'INVALID_INPUT' | 'TOO_LARGE' | 'ENCRYPTED' | 'WRONG_PASSWORD' | 'UNSUPPORTED_FEATURE' | 'WORKER_CRASHED' | 'CANCELLED' | 'UNKNOWN'`
  - `class ToolError extends Error { code: ToolErrorCode }` with `new ToolError(code, message, { cause? })`
  - `toToolError(e: unknown, fallback?: string): ToolError`
  - `formatBytes(bytes: number, decimals?: number): string`
  - `formatSizeChange(before: number, after: number): string`
- Note: `INVALID_INPUT` is added beyond the spec list, for user-entered values such as page ranges.

- [ ] **Step 1: Write failing tests**

`src/shared/lib/errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ToolError, toToolError } from './errors';

describe('ToolError', () => {
  it('carries code, message and cause', () => {
    const cause = new Error('low level');
    const err = new ToolError('INVALID_FILE', 'Bad file', { cause });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ToolError');
    expect(err.code).toBe('INVALID_FILE');
    expect(err.message).toBe('Bad file');
    expect(err.cause).toBe(cause);
  });
});

describe('toToolError', () => {
  it('returns ToolErrors unchanged', () => {
    const err = new ToolError('ENCRYPTED', 'locked');
    expect(toToolError(err)).toBe(err);
  });
  it('maps AbortError to CANCELLED', () => {
    const abort = new DOMException('aborted', 'AbortError');
    expect(toToolError(abort).code).toBe('CANCELLED');
  });
  it('wraps plain errors as UNKNOWN keeping the message', () => {
    const out = toToolError(new Error('boom'));
    expect(out.code).toBe('UNKNOWN');
    expect(out.message).toBe('boom');
  });
  it('uses the fallback for non-errors', () => {
    expect(toToolError('nope', 'Fallback').message).toBe('Fallback');
  });
});
```

`src/shared/lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatBytes, formatSizeChange } from './format';

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [5 * 1024 ** 2, '5.0 MB'],
    [5 * 1024 ** 3, '5.0 GB'],
    [2 * 1024 ** 4, '2.0 TB'],
  ])('%d → %s', (n, expected) => {
    expect(formatBytes(n)).toBe(expected);
  });
  it('honours decimals', () => {
    expect(formatBytes(1536, 2)).toBe('1.50 KB');
  });
  it('returns an em dash for invalid input', () => {
    expect(formatBytes(-1)).toBe('—');
    expect(formatBytes(Number.NaN)).toBe('—');
  });
});

describe('formatSizeChange', () => {
  it.each([
    [100, 50, '−50.0%'],
    [100, 150, '+50.0%'],
    [100, 100, '±0.0%'],
    [0, 10, '—'],
  ])('%d → %d is %s', (before, after, expected) => {
    expect(formatSizeChange(before, after)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/shared/lib` → Expected: FAIL, because the modules cannot be resolved.

- [ ] **Step 3: Implement**

`src/shared/lib/errors.ts`:

```ts
export type ToolErrorCode =
  | 'INVALID_FILE'
  | 'INVALID_INPUT'
  | 'TOO_LARGE'
  | 'ENCRYPTED'
  | 'WRONG_PASSWORD'
  | 'UNSUPPORTED_FEATURE'
  | 'WORKER_CRASHED'
  | 'CANCELLED'
  | 'UNKNOWN';

/** The one error type tools surface to users. `message` is user-facing. */
export class ToolError extends Error {
  readonly code: ToolErrorCode;

  constructor(
    code: ToolErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ToolError';
    this.code = code;
  }
}

export function toToolError(
  e: unknown,
  fallback = 'Something went wrong',
): ToolError {
  if (e instanceof ToolError) return e;
  if (e instanceof DOMException && e.name === 'AbortError') {
    return new ToolError('CANCELLED', 'Cancelled', { cause: e });
  }
  if (e instanceof Error) {
    return new ToolError('UNKNOWN', e.message || fallback, { cause: e });
  }
  return new ToolError('UNKNOWN', fallback, { cause: e });
}
```

`src/shared/lib/format.ts`:

```ts
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(decimals)} ${UNITS[unit]}`;
}

/** Relative size change, e.g. `−42.3%`. Uses a true minus sign. */
export function formatSizeChange(before: number, after: number): string {
  if (!(before > 0)) return '—';
  const pct = ((after - before) / before) * 100;
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '±';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/shared/lib` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib
git commit -m "feat(shared): add ToolError and size formatting helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `files` — kind detection and validated loading

**Files:**

- Create: `src/shared/lib/files.ts`, `src/shared/lib/files.test.ts`

**Interfaces:**

- Consumes: `ToolError` (Task 2)
- Produces:
  - `type FileKind = 'pdf' | 'png' | 'jpeg' | 'webp' | 'gif'`
  - `detectKind(bytes: Uint8Array): FileKind | null`
  - `readBytes(file: Blob): Promise<Uint8Array>`
  - `interface LoadedFile { id: string; name: string; size: number; kind: FileKind; bytes: Uint8Array }`
  - `loadFile(file: File, accept: readonly FileKind[]): Promise<LoadedFile>`, which throws `ToolError('INVALID_FILE')`
  - `SOFT_SIZE_LIMIT = 200 * 1024 * 1024`
  - `isOverSoftLimit(size: number): boolean`
  - `acceptAttribute(kinds: readonly FileKind[]): string`
  - `describeKinds(kinds: readonly FileKind[]): string`

- [ ] **Step 1: Write failing tests** — `src/shared/lib/files.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  acceptAttribute,
  describeKinds,
  detectKind,
  isOverSoftLimit,
  loadFile,
  SOFT_SIZE_LIMIT,
} from './files';
import { ToolError } from './errors';

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => new TextEncoder().encode(s);

describe('detectKind', () => {
  it('detects PDF at offset 0', () => {
    expect(detectKind(ascii('%PDF-1.7\n...'))).toBe('pdf');
  });
  it('detects PDF with leading junk within 1KB', () => {
    expect(detectKind(ascii('\n\n  junk %PDF-1.4'))).toBe('pdf');
  });
  it('detects images', () => {
    expect(
      detectKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)),
    ).toBe('png');
    expect(detectKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
    expect(detectKind(ascii('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
    expect(detectKind(ascii('GIF89a'))).toBe('gif');
  });
  it('returns null for unknown or empty data', () => {
    expect(detectKind(ascii('hello world'))).toBeNull();
    expect(detectKind(new Uint8Array())).toBeNull();
  });
});

describe('loadFile', () => {
  it('loads an accepted file', async () => {
    const file = new File([ascii('%PDF-1.7\n%%EOF')], 'a.pdf', {
      type: 'application/pdf',
    });
    const out = await loadFile(file, ['pdf']);
    expect(out.kind).toBe('pdf');
    expect(out.name).toBe('a.pdf');
    expect(out.size).toBe(file.size);
    expect(out.bytes).toBeInstanceOf(Uint8Array);
    expect(out.id).toMatch(/[0-9a-f-]{36}/);
  });
  it('rejects a renamed non-PDF by content, not extension', async () => {
    const file = new File([ascii('not a pdf')], 'fake.pdf');
    await expect(loadFile(file, ['pdf'])).rejects.toMatchObject({
      code: 'INVALID_FILE',
      message: 'fake.pdf is not a PDF file',
    });
  });
  it('rejects empty files', async () => {
    const file = new File([], 'empty.pdf');
    await expect(loadFile(file, ['pdf'])).rejects.toBeInstanceOf(ToolError);
    await expect(loadFile(file, ['pdf'])).rejects.toMatchObject({
      message: 'empty.pdf is empty',
    });
  });
});

describe('helpers', () => {
  it('builds accept attributes and descriptions', () => {
    expect(acceptAttribute(['pdf'])).toBe('.pdf,application/pdf');
    expect(acceptAttribute(['png', 'jpeg'])).toBe(
      '.png,image/png,.jpg,.jpeg,image/jpeg',
    );
    expect(describeKinds(['pdf'])).toBe('PDF');
    expect(describeKinds(['png', 'jpeg', 'webp'])).toBe('PNG, JPEG or WebP');
  });
  it('flags the soft size limit', () => {
    expect(isOverSoftLimit(SOFT_SIZE_LIMIT)).toBe(false);
    expect(isOverSoftLimit(SOFT_SIZE_LIMIT + 1)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/shared/lib/files` → Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `src/shared/lib/files.ts`

```ts
import { ToolError } from './errors';

export type FileKind = 'pdf' | 'png' | 'jpeg' | 'webp' | 'gif';

export interface LoadedFile {
  id: string;
  name: string;
  size: number;
  kind: FileKind;
  bytes: Uint8Array;
}

/** Above this we warn (never block): browsers start struggling with memory. */
export const SOFT_SIZE_LIMIT = 200 * 1024 * 1024;

const KIND_INFO: Record<FileKind, { label: string; accept: string }> = {
  pdf: { label: 'PDF', accept: '.pdf,application/pdf' },
  png: { label: 'PNG', accept: '.png,image/png' },
  jpeg: { label: 'JPEG', accept: '.jpg,.jpeg,image/jpeg' },
  webp: { label: 'WebP', accept: '.webp,image/webp' },
  gif: { label: 'GIF', accept: '.gif,image/gif' },
};

const startsWith = (b: Uint8Array, sig: number[], offset = 0) =>
  b.length >= offset + sig.length && sig.every((v, i) => b[offset + i] === v);

/** Sniff the real type from magic numbers; file extensions are not trusted. */
export function detectKind(b: Uint8Array): FileKind | null {
  // PDF readers accept the header anywhere in the first 1024 bytes.
  const limit = Math.min(b.length, 1024) - 5;
  for (let i = 0; i <= limit; i++) {
    if (
      b[i] === 0x25 &&
      b[i + 1] === 0x50 &&
      b[i + 2] === 0x44 &&
      b[i + 3] === 0x46 &&
      b[i + 4] === 0x2d
    ) {
      return 'pdf';
    }
  }
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return 'png';
  if (startsWith(b, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (
    startsWith(b, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)
  )
    return 'webp';
  if (startsWith(b, [0x47, 0x49, 0x46, 0x38])) return 'gif';
  return null;
}

export async function readBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export function describeKinds(kinds: readonly FileKind[]): string {
  const labels = kinds.map((k) => KIND_INFO[k].label);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`;
}

export function acceptAttribute(kinds: readonly FileKind[]): string {
  return kinds.map((k) => KIND_INFO[k].accept).join(',');
}

export function isOverSoftLimit(size: number): boolean {
  return size > SOFT_SIZE_LIMIT;
}

export async function loadFile(
  file: File,
  accept: readonly FileKind[],
): Promise<LoadedFile> {
  if (file.size === 0)
    throw new ToolError('INVALID_FILE', `${file.name} is empty`);
  const bytes = await readBytes(file);
  const kind = detectKind(bytes);
  if (!kind || !accept.includes(kind)) {
    throw new ToolError(
      'INVALID_FILE',
      `${file.name} is not a ${describeKinds(accept)} file`,
    );
  }
  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    kind,
    bytes,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/shared/lib/files` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/files.ts src/shared/lib/files.test.ts
git commit -m "feat(shared): add content-sniffed file loading

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `download` — save, filename derivation, ZIP

**Files:**

- Create: `src/shared/lib/download.ts`, `src/shared/lib/download.test.ts`
- Modify: `package.json` (add `fflate`)

**Interfaces:**

- Produces:
  - `deriveFilename(inputName: string, suffix: string, ext: string): string`
  - `saveBlob(data: Blob | Uint8Array, filename: string, mime?: string): void`
  - `zipFiles(entries: { name: string; data: Uint8Array }[], level?: 0..9): Promise<Uint8Array>`
  - `saveZip(entries, filename): Promise<void>`
  - `uniqueNames(names: string[]): string[]`

- [ ] **Step 1: Install**

```bash
pnpm add fflate
```

- [ ] **Step 2: Write failing tests** — `src/shared/lib/download.test.ts`

```ts
/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { deriveFilename, saveBlob, uniqueNames, zipFiles } from './download';

describe('deriveFilename', () => {
  it.each([
    ['report.pdf', 'merged', 'pdf', 'report.merged.pdf'],
    ['report', 'merged', 'pdf', 'report.merged.pdf'],
    ['my.scan.v2.pdf', 'pages-1-3', 'pdf', 'my.scan.v2.pages-1-3.pdf'],
    ['report.pdf', '', '.zip', 'report.zip'],
    ['.pdf', 'x', 'pdf', 'file.x.pdf'],
  ])('%s + %s + %s → %s', (input, suffix, ext, expected) => {
    expect(deriveFilename(input, suffix, ext)).toBe(expected);
  });
});

describe('uniqueNames', () => {
  it('disambiguates duplicates before the extension', () => {
    expect(uniqueNames(['a.pdf', 'a.pdf', 'b.pdf', 'a.pdf'])).toEqual([
      'a.pdf',
      'a (2).pdf',
      'b.pdf',
      'a (3).pdf',
    ]);
  });
});

describe('saveBlob', () => {
  it('clicks a download anchor and revokes the URL afterwards', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:mock');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    saveBlob(new Uint8Array([1, 2, 3]), 'out.pdf', 'application/pdf');

    expect(create).toHaveBeenCalledOnce();
    const blob = create.mock.calls[0][0] as unknown as Blob;
    expect(blob.type).toBe('application/pdf');
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:mock');
    vi.useRealTimers();
  });
});

describe('zipFiles', () => {
  it('produces a zip containing every entry with unique names', async () => {
    const zip = await zipFiles([
      { name: 'a.txt', data: new TextEncoder().encode('one') },
      { name: 'a.txt', data: new TextEncoder().encode('two') },
    ]);
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(['a (2).txt', 'a.txt']);
    expect(strFromU8(files['a (2).txt'])).toBe('two');
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `pnpm test src/shared/lib/download` → Expected: FAIL.

- [ ] **Step 4: Implement** — `src/shared/lib/download.ts`

```ts
import { zip, type AsyncZippable } from 'fflate';

/** `report.pdf` + `merged` + `pdf` → `report.merged.pdf`. */
export function deriveFilename(
  inputName: string,
  suffix: string,
  ext: string,
): string {
  const base = inputName.replace(/\.[^./\\]+$/, '') || 'file';
  const cleanExt = ext.replace(/^\./, '');
  return suffix ? `${base}.${suffix}.${cleanExt}` : `${base}.${cleanExt}`;
}

export function uniqueNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  return names.map((name) => {
    const n = (counts.get(name) ?? 0) + 1;
    counts.set(name, n);
    if (n === 1) return name;
    const dot = name.lastIndexOf('.');
    return dot > 0
      ? `${name.slice(0, dot)} (${n})${name.slice(dot)}`
      : `${name} (${n})`;
  });
}

// Long enough for every browser to have started reading the blob.
const REVOKE_DELAY_MS = 30_000;

export function saveBlob(
  data: Blob | Uint8Array,
  filename: string,
  mime = 'application/octet-stream',
): void {
  // Our byte arrays are never backed by SharedArrayBuffer, so the cast is sound.
  const blob =
    data instanceof Blob
      ? data
      : new Blob([data as Uint8Array<ArrayBuffer>], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.hidden = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

export function zipFiles(
  entries: { name: string; data: Uint8Array }[],
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 = 6,
): Promise<Uint8Array> {
  const names = uniqueNames(entries.map((e) => e.name));
  const input: AsyncZippable = {};
  entries.forEach((e, i) => {
    input[names[i]] = [e.data, { level }];
  });
  return new Promise((resolve, reject) => {
    zip(input, (err, out) => (err ? reject(err) : resolve(out)));
  });
}

export async function saveZip(
  entries: { name: string; data: Uint8Array }[],
  filename: string,
): Promise<void> {
  // PDFs and images are already compressed; storing is faster and barely larger.
  const out = await zipFiles(entries, 0);
  saveBlob(out, filename, 'application/zip');
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test src/shared/lib/download` → Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/shared/lib/download.ts src/shared/lib/download.test.ts
git commit -m "feat(shared): add download, filename and zip helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `clipboard`, `notify` and the global Toaster

**Files:**

- Create: `src/shared/lib/clipboard.ts`, `src/shared/lib/clipboard.test.tsx`, `src/shared/lib/notify.ts`
- Modify: `src/hooks/useClipboard.tsx` (becomes a shim), `src/App.tsx` (mount `<Toaster/>`)

**Interfaces:**

- Produces:
  - `copyText(text: string): Promise<void>`, which throws `ToolError('UNKNOWN', 'Could not copy to clipboard')`
  - `useClipboard(resetMs = 2000): { copied: boolean; copy(text: string): Promise<boolean> }`
  - `notify.success(msg)`, `notify.error(msg | ToolError)`, `notify.info(msg)`
- `src/hooks/useClipboard.tsx` keeps its default export for the three tools that use it.

- [ ] **Step 1: Write failing test** — `src/shared/lib/clipboard.test.tsx`

```tsx
/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useClipboard } from './clipboard';

describe('useClipboard', () => {
  it('copies and flips copied for resetMs', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const { result } = renderHook(() => useClipboard(1000));

    let ok = false;
    await act(async () => {
      ok = await result.current.copy('hello');
    });
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(result.current.copied).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.copied).toBe(false);
    vi.useRealTimers();
  });

  it('returns false when the clipboard rejects', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    const { result } = renderHook(() => useClipboard());
    let ok = true;
    await act(async () => {
      ok = await result.current.copy('x');
    });
    expect(ok).toBe(false);
    expect(result.current.copied).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/shared/lib/clipboard` → Expected: FAIL.

- [ ] **Step 3: Implement**

`src/shared/lib/clipboard.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { ToolError } from './errors';

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (cause) {
    throw new ToolError('UNKNOWN', 'Could not copy to clipboard', { cause });
  }
}

export function useClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await copyText(text);
      } catch {
        setCopied(false);
        return false;
      }
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), resetMs);
      return true;
    },
    [resetMs],
  );

  return { copied, copy };
}
```

`src/shared/lib/notify.ts`:

```ts
import { toast } from 'sonner';
import { ToolError } from './errors';

/** App-wide toasts. Rendered by the single <Toaster/> in App. */
export const notify = {
  success: (message: string) => toast.success(message),
  info: (message: string) => toast(message),
  error: (error: string | ToolError) =>
    toast.error(typeof error === 'string' ? error : error.message),
};
```

Replace `src/hooks/useClipboard.tsx` entirely with:

```ts
// TEMP shim (removed in phase 4): use `useClipboard` from '@/shared/lib/clipboard'.
import { useClipboard } from '@/shared/lib/clipboard';

export default useClipboard;
```

In `src/App.tsx`, add `import { Toaster } from 'sonner';` and render `<Toaster theme="dark" richColors position="bottom-right" />` as the first child inside `<BrowserRouter>`. The site has only a dark theme; `src/theme/terminal.css` has no light variant.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm test src/shared/lib/clipboard && pnpm typecheck` → Expected: PASS / exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib src/hooks/useClipboard.tsx src/App.tsx
git commit -m "feat(shared): add clipboard hook, notify and global toaster

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: State — `useJob` and `createToolStore`

**Files:**

- Create: `src/shared/state/useJob.ts`, `src/shared/state/useJob.test.tsx`, `src/shared/state/createToolStore.ts`, `src/shared/state/createToolStore.test.ts`
- Modify: `package.json` (add `@arshad-shah/store-kit`, `zustand`)

**Interfaces:**

- Consumes: `ToolError`, `toToolError` (Task 2)
- Produces:
  - `type JobStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled'`
  - `interface JobProgress { done: number; total: number; label?: string }`
  - `interface JobContext { signal: AbortSignal; progress(p: JobProgress): void }`
  - `interface JobState<R> { status: JobStatus; progress: JobProgress | null; result: R | null; error: ToolError | null }`
  - `useJob<A extends unknown[], R>(fn: (ctx: JobContext, ...args: A) => Promise<R>): JobState<R> & { run(...args: A): Promise<R | undefined>; cancel(): void; reset(): void }`
  - `createToolStore<S extends object, A extends object>({ toolId, initial, actions?, persist? }): KitStore<S, A>`

- [ ] **Step 1: Install**

```bash
pnpm add @arshad-shah/store-kit zustand
```

- [ ] **Step 2: Write failing tests**

`src/shared/state/useJob.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { useJob, type JobContext } from './useJob';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useJob', () => {
  it('runs to done with result and progress', async () => {
    const d = deferred<number>();
    const { result } = renderHook(() =>
      useJob(async (ctx: JobContext, x: number) => {
        ctx.progress({ done: 1, total: 2, label: 'half' });
        return (await d.promise) * x;
      }),
    );
    let pending!: Promise<number | undefined>;
    act(() => {
      pending = result.current.run(3);
    });
    expect(result.current.status).toBe('running');
    expect(result.current.progress).toEqual({
      done: 1,
      total: 2,
      label: 'half',
    });
    await act(async () => {
      d.resolve(2);
      await pending;
    });
    expect(result.current.status).toBe('done');
    expect(result.current.result).toBe(6);
    expect(result.current.progress).toBeNull();
  });

  it('maps thrown errors to ToolError', async () => {
    const { result } = renderHook(() =>
      useJob(async () => {
        throw new ToolError('INVALID_INPUT', 'bad range');
      }),
    );
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error?.code).toBe('INVALID_INPUT');
  });

  it('cancel aborts the signal, ignores the late result, and reports cancelled', async () => {
    const d = deferred<string>();
    let seen: AbortSignal | undefined;
    const { result } = renderHook(() =>
      useJob(async (ctx: JobContext) => {
        seen = ctx.signal;
        return d.promise;
      }),
    );
    let pending!: Promise<string | undefined>;
    act(() => {
      pending = result.current.run();
    });
    act(() => result.current.cancel());
    expect(seen?.aborted).toBe(true);
    expect(result.current.status).toBe('cancelled');
    await act(async () => {
      d.resolve('late');
      await pending;
    });
    expect(result.current.status).toBe('cancelled');
    expect(result.current.result).toBeNull();
  });

  it('a second run supersedes the first', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const queue = [first, second];
    const { result } = renderHook(() =>
      useJob(async () => queue.shift()!.promise),
    );
    let p1!: Promise<string | undefined>;
    let p2!: Promise<string | undefined>;
    act(() => {
      p1 = result.current.run();
    });
    act(() => {
      p2 = result.current.run();
    });
    await act(async () => {
      second.resolve('two');
      first.resolve('one');
      await Promise.all([p1, p2]);
    });
    expect(result.current.result).toBe('two');
  });

  it('aborts on unmount', () => {
    let seen: AbortSignal | undefined;
    const { result, unmount } = renderHook(() =>
      useJob(async (ctx: JobContext) => {
        seen = ctx.signal;
        return new Promise<void>(() => {});
      }),
    );
    act(() => {
      void result.current.run();
    });
    unmount();
    expect(seen?.aborted).toBe(true);
  });
});
```

`src/shared/state/createToolStore.test.ts`:

```ts
/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { createToolStore } from './createToolStore';

afterEach(() => localStorage.clear());

describe('createToolStore', () => {
  it('names the store tool:<id> and persists settings to localStorage', () => {
    const store = createToolStore({
      toolId: 'demo',
      initial: { mode: 'a' as 'a' | 'b' },
      actions: (set) => ({ setMode: (mode: 'a' | 'b') => set({ mode }) }),
    });
    store.getState().setMode('b');
    expect(store.getState().mode).toBe('b');
    const raw = localStorage.getItem('tool:demo');
    expect(raw).toContain('"mode":"b"');
    store.reset();
    expect(store.getState().mode).toBe('a');
    store.destroy();
  });

  it('does not persist when persist is false', () => {
    const store = createToolStore({
      toolId: 'mem',
      initial: { n: 1 },
      persist: false,
    });
    store.setState({ n: 2 });
    expect(localStorage.getItem('tool:mem')).toBeNull();
    store.destroy();
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `pnpm test src/shared/state` → Expected: FAIL.

- [ ] **Step 4: Implement**

`src/shared/state/useJob.ts`:

```ts
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';

export type JobStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

export interface JobProgress {
  done: number;
  total: number;
  label?: string;
}

export interface JobContext {
  signal: AbortSignal;
  progress(p: JobProgress): void;
}

export interface JobState<R> {
  status: JobStatus;
  progress: JobProgress | null;
  result: R | null;
  error: ToolError | null;
}

const idle = {
  status: 'idle',
  progress: null,
  result: null,
  error: null,
} as const;

/**
 * Runs one async operation at a time with progress, cancellation and typed
 * errors. A new run supersedes the previous one; superseded or cancelled runs
 * never update state.
 */
export function useJob<A extends unknown[], R>(
  fn: (ctx: JobContext, ...args: A) => Promise<R>,
) {
  const [state, setState] = useState<JobState<R>>(idle);
  const fnRef = useRef(fn);
  const runId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  useLayoutEffect(() => {
    fnRef.current = fn;
  });

  useEffect(
    () => () => {
      controller.current?.abort();
      runId.current++;
    },
    [],
  );

  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    const id = ++runId.current;
    const isCurrent = () => id === runId.current;
    setState({ status: 'running', progress: null, result: null, error: null });

    try {
      const result = await fnRef.current(
        {
          signal: ctrl.signal,
          progress: (p) => {
            if (isCurrent()) setState((s) => ({ ...s, progress: p }));
          },
        },
        ...args,
      );
      if (!isCurrent()) return undefined;
      controller.current = null;
      setState({ status: 'done', progress: null, result, error: null });
      return result;
    } catch (e) {
      if (!isCurrent()) return undefined;
      controller.current = null;
      const error = toToolError(e);
      if (ctrl.signal.aborted || error.code === 'CANCELLED') {
        setState({ ...idle, status: 'cancelled' });
      } else {
        setState({ status: 'error', progress: null, result: null, error });
      }
      return undefined;
    }
  }, []);

  const cancel = useCallback(() => {
    if (!controller.current) return;
    controller.current.abort();
    controller.current = null;
    runId.current++;
    setState({ ...idle, status: 'cancelled' });
  }, []);

  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    runId.current++;
    setState(idle);
  }, []);

  return { ...state, run, cancel, reset };
}
```

`src/shared/state/createToolStore.ts`:

```ts
import { createStore } from '@arshad-shah/store-kit';

type SetState<S> = (partial: Partial<S> | ((s: S) => Partial<S>)) => void;
type GetState<S> = () => S;

interface ToolStoreConfig<S extends object, A extends object> {
  toolId: string;
  initial: S;
  actions?: (set: SetState<S>, get: GetState<S>) => A;
  /**
   * Settings only — never documents, bytes or results. `false` keeps the
   * store in memory.
   */
  persist?:
    | false
    | {
        version?: number;
        migrate?: Record<number, (persisted: unknown) => Partial<S>>;
      };
}

export function createToolStore<
  S extends object,
  A extends object = Record<string, never>,
>(config: ToolStoreConfig<S, A>) {
  return createStore<S, A>({
    name: `tool:${config.toolId}`,
    initial: config.initial,
    actions: config.actions as never,
    persist:
      config.persist === false
        ? undefined
        : { storage: 'local', version: 1, ...config.persist },
    onError: (error, info) =>
      console.warn(`[tool:${config.toolId}:${info.op}]`, error),
  });
}
```

> If `createStore`'s generic signature makes the `actions` cast unnecessary, drop the `as never`. The point is to keep `createToolStore`'s public types exactly as written.

- [ ] **Step 5: Run tests**

Run: `pnpm test src/shared/state` → Expected: PASS. If the store-kit storage key differs from `tool:demo`, adjust the assertion to the key store-kit actually writes. The `name` is still `tool:demo`.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/shared/state
git commit -m "feat(shared): add useJob runner and store-kit tool stores

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `worker-rpc`

**Files:**

- Create: `src/shared/lib/worker-rpc.ts`, `src/shared/lib/worker-rpc.test.ts`

**Interfaces:**

- Consumes: `ToolError`, `toToolError` (Task 2), `JobProgress` (Task 6)
- Produces:
  - `interface RpcEndpoint`
  - `interface RpcContext { signal; progress }`
  - `type RpcHandlers`
  - `class Transferred<T>(value, transfer)`
  - `exposeRpc<H>(handlers: H, endpoint: RpcEndpoint): () => void`
  - `createRpcClient<H>(connect: () => RpcEndpoint, opts?: { maxRestarts?: number }): RpcClient<H>`
  - `RpcClient<H>.call<K>(method: K, args: ArgsOf<H[K]>, opts?: { signal?; transfer?; onProgress? }): Promise<ResultOf<H[K]>>`
  - `RpcClient<H>.terminate()`

- [ ] **Step 1: Write failing tests** — `src/shared/lib/worker-rpc.test.ts`

```ts
import { MessageChannel } from 'node:worker_threads';
import { describe, expect, it } from 'vitest';
import {
  createRpcClient,
  exposeRpc,
  Transferred,
  type RpcContext,
  type RpcEndpoint,
} from './worker-rpc';

const handlers = {
  add: (_ctx: RpcContext, a: number, b: number) => a + b,
  fail: () => {
    throw new Error('kaboom');
  },
  slow: (ctx: RpcContext) =>
    new Promise<string>((resolve, reject) => {
      ctx.progress({ done: 1, total: 2 });
      const t = setTimeout(() => resolve('finished'), 1000);
      ctx.signal.addEventListener('abort', () => {
        clearTimeout(t);
        reject(new DOMException('aborted', 'AbortError'));
      });
    }),
  bytes: (_ctx: RpcContext, n: number) => {
    const out = new Uint8Array(n).fill(7);
    return new Transferred(out, [out.buffer]);
  },
};

function connectPair() {
  const { port1, port2 } = new MessageChannel();
  const server = port2 as unknown as RpcEndpoint;
  exposeRpc(handlers, server);
  port2.start();
  port1.start();
  return port1 as unknown as RpcEndpoint;
}

describe('worker-rpc', () => {
  it('calls handlers and returns results', async () => {
    const client = createRpcClient<typeof handlers>(connectPair);
    await expect(client.call('add', [2, 3])).resolves.toBe(5);
    client.terminate();
  });

  it('rehydrates thrown errors as ToolError', async () => {
    const client = createRpcClient<typeof handlers>(connectPair);
    await expect(client.call('fail', [])).rejects.toMatchObject({
      name: 'ToolError',
      code: 'UNKNOWN',
      message: 'kaboom',
    });
    client.terminate();
  });

  it('streams progress and supports abort', async () => {
    const client = createRpcClient<typeof handlers>(connectPair);
    const ctrl = new AbortController();
    const seen: number[] = [];
    const p = client.call('slow', [], {
      signal: ctrl.signal,
      onProgress: (pr) => seen.push(pr.done),
    });
    await new Promise((r) => setTimeout(r, 20));
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(seen).toEqual([1]);
    client.terminate();
  });

  it('transfers result buffers', async () => {
    const client = createRpcClient<typeof handlers>(connectPair);
    const out = await client.call('bytes', [4]);
    expect(Array.from(out)).toEqual([7, 7, 7, 7]);
    client.terminate();
  });

  it('fails pending calls with WORKER_CRASHED, restarts once, then refuses', async () => {
    let connections = 0;
    const endpoints: RpcEndpoint[] = [];
    const client = createRpcClient<typeof handlers>(
      () => {
        connections++;
        const ep = connectPair();
        endpoints.push(ep);
        return ep;
      },
      { maxRestarts: 1 },
    );
    const crash = (ep: RpcEndpoint) =>
      (ep as unknown as EventTarget).dispatchEvent(new Event('error'));

    const pending = client.call('slow', []);
    await new Promise((r) => setTimeout(r, 10));
    crash(endpoints[0]);
    await expect(pending).rejects.toMatchObject({ code: 'WORKER_CRASHED' });

    const second = client.call('slow', []);
    await new Promise((r) => setTimeout(r, 10));
    expect(connections).toBe(2);
    crash(endpoints[1]);
    await expect(second).rejects.toMatchObject({ code: 'WORKER_CRASHED' });

    await expect(client.call('add', [1, 1])).rejects.toMatchObject({
      code: 'WORKER_CRASHED',
    });
    expect(connections).toBe(2);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/shared/lib/worker-rpc` → Expected: FAIL.

- [ ] **Step 3: Implement** — `src/shared/lib/worker-rpc.ts`

```ts
import { ToolError, toToolError, type ToolErrorCode } from './errors';
import type { JobProgress } from '@/shared/state/useJob';

/** Anything message-shaped: Worker, MessagePort, a worker's `self`. */
export interface RpcEndpoint {
  postMessage(message: unknown, transfer: Transferable[]): void;
  addEventListener(type: string, listener: (event: MessageEvent) => void): void;
  removeEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ): void;
  terminate?(): void;
}

export interface RpcContext {
  signal: AbortSignal;
  progress(p: JobProgress): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RpcHandlers = Record<
  string,
  (ctx: RpcContext, ...args: any[]) => unknown
>;

/** Return this from a handler to transfer (not copy) buffers back. */
export class Transferred<T> {
  constructor(
    readonly value: T,
    readonly transfer: Transferable[],
  ) {}
}

type ArgsOf<F> = F extends (ctx: RpcContext, ...args: infer A) => unknown
  ? A
  : never;
type ResultOf<F> = F extends (...args: never[]) => infer R
  ? Awaited<R> extends Transferred<infer V>
    ? V
    : Awaited<R>
  : never;

type Request =
  | { type: 'call'; id: number; method: string; args: unknown[] }
  | { type: 'abort'; id: number };
type Response =
  | { type: 'result'; id: number; value: unknown }
  | {
      type: 'error';
      id: number;
      error: { code: ToolErrorCode; message: string };
    }
  | { type: 'progress'; id: number; value: JobProgress };

export function exposeRpc<H extends RpcHandlers>(
  handlers: H,
  endpoint: RpcEndpoint,
): () => void {
  const controllers = new Map<number, AbortController>();

  const onMessage = async (event: MessageEvent) => {
    const msg = event.data as Request;
    if (msg.type === 'abort') {
      controllers.get(msg.id)?.abort();
      return;
    }
    if (msg.type !== 'call') return;
    const { id } = msg;
    const handler = handlers[msg.method];
    if (!handler) {
      endpoint.postMessage(
        {
          type: 'error',
          id,
          error: { code: 'UNKNOWN', message: `Unknown method ${msg.method}` },
        },
        [],
      );
      return;
    }
    const ctrl = new AbortController();
    controllers.set(id, ctrl);
    try {
      const out = await handler(
        {
          signal: ctrl.signal,
          progress: (value) =>
            endpoint.postMessage({ type: 'progress', id, value }, []),
        },
        ...msg.args,
      );
      if (out instanceof Transferred)
        endpoint.postMessage(
          { type: 'result', id, value: out.value },
          out.transfer,
        );
      else endpoint.postMessage({ type: 'result', id, value: out }, []);
    } catch (e) {
      const err = ctrl.signal.aborted
        ? new ToolError('CANCELLED', 'Cancelled')
        : toToolError(e);
      endpoint.postMessage(
        { type: 'error', id, error: { code: err.code, message: err.message } },
        [],
      );
    } finally {
      controllers.delete(id);
    }
  };

  endpoint.addEventListener('message', onMessage);
  return () => endpoint.removeEventListener('message', onMessage);
}

export interface CallOptions {
  signal?: AbortSignal;
  transfer?: Transferable[];
  onProgress?: (p: JobProgress) => void;
}

export interface RpcClient<H extends RpcHandlers> {
  call<K extends keyof H & string>(
    method: K,
    args: ArgsOf<H[K]>,
    opts?: CallOptions,
  ): Promise<ResultOf<H[K]>>;
  terminate(): void;
}

interface Pending {
  resolve(v: unknown): void;
  reject(e: unknown): void;
  onProgress?: (p: JobProgress) => void;
  cleanup(): void;
}

export function createRpcClient<H extends RpcHandlers>(
  connect: () => RpcEndpoint,
  { maxRestarts = 1 }: { maxRestarts?: number } = {},
): RpcClient<H> {
  let endpoint: RpcEndpoint | null = null;
  let nextId = 1;
  let crashes = 0;
  const pending = new Map<number, Pending>();

  const failAll = (err: ToolError) => {
    for (const p of pending.values()) {
      p.cleanup();
      p.reject(err);
    }
    pending.clear();
  };

  const onMessage = (event: MessageEvent) => {
    const msg = event.data as Response;
    const p = pending.get(msg.id);
    if (!p) return;
    if (msg.type === 'progress') {
      p.onProgress?.(msg.value);
      return;
    }
    pending.delete(msg.id);
    p.cleanup();
    crashes = 0;
    if (msg.type === 'result') p.resolve(msg.value);
    else p.reject(new ToolError(msg.error.code, msg.error.message));
  };

  const detach = (ep: RpcEndpoint) => {
    ep.removeEventListener('message', onMessage);
    ep.removeEventListener('error', onCrash);
    ep.removeEventListener('messageerror', onCrash);
    ep.terminate?.();
  };

  function onCrash() {
    if (!endpoint) return;
    detach(endpoint);
    endpoint = null;
    crashes++;
    failAll(
      new ToolError(
        'WORKER_CRASHED',
        'The background worker stopped unexpectedly. Please try again.',
      ),
    );
  }

  const ensure = (): RpcEndpoint => {
    if (endpoint) return endpoint;
    if (crashes > maxRestarts) {
      throw new ToolError(
        'WORKER_CRASHED',
        'The background worker keeps crashing. Reload the page and try again.',
      );
    }
    const ep = connect();
    ep.addEventListener('message', onMessage);
    ep.addEventListener('error', onCrash);
    ep.addEventListener('messageerror', onCrash);
    endpoint = ep;
    return ep;
  };

  return {
    call(method, args, opts = {}) {
      return new Promise((resolve, reject) => {
        if (opts.signal?.aborted) {
          reject(new ToolError('CANCELLED', 'Cancelled'));
          return;
        }
        let target: RpcEndpoint;
        try {
          target = ensure();
        } catch (e) {
          reject(e);
          return;
        }
        const id = nextId++;
        const onAbort = () => {
          if (!pending.delete(id)) return;
          target.postMessage({ type: 'abort', id } satisfies Request, []);
          reject(new ToolError('CANCELLED', 'Cancelled'));
        };
        opts.signal?.addEventListener('abort', onAbort, { once: true });
        pending.set(id, {
          resolve: resolve as (v: unknown) => void,
          reject,
          onProgress: opts.onProgress,
          cleanup: () => opts.signal?.removeEventListener('abort', onAbort),
        });
        target.postMessage(
          { type: 'call', id, method, args } satisfies Request,
          opts.transfer ?? [],
        );
      });
    },
    terminate() {
      if (endpoint) detach(endpoint);
      endpoint = null;
      failAll(new ToolError('CANCELLED', 'Worker terminated'));
    },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/shared/lib/worker-rpc` → Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/worker-rpc.ts src/shared/lib/worker-rpc.test.ts
git commit -m "feat(shared): add typed worker RPC with abort, progress and crash recovery

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Move the kit to `src/shared/ui`

**Files:**

- Move: `src/components/ui/*` → `src/shared/ui/*` (git mv)
- Create: `src/components/ui/index.ts` (temporary shim)
- Modify: every `import … from '@/components/ui'` → `'@/shared/ui'` (all tool files)

**Interfaces:**

- Produces: the kit barrel at `@/shared/ui`. Relative `../../components/ui` imports in the four legacy tools keep working through the shim until phase 4.

- [ ] **Step 1: Move and shim**

```bash
git mv src/components/ui src/shared/ui
mkdir -p src/components/ui
printf "// TEMP shim (removed in phase 4): import from '@/shared/ui'.\nexport * from '@/shared/ui';\n" > src/components/ui/index.ts
```

- [ ] **Step 2: Rewrite alias imports**

```bash
grep -rl "@/components/ui" src | xargs sed -i "s#@/components/ui#@/shared/ui#g"
```

- [ ] **Step 3: Verify nothing else references the old kit path**

Run: `grep -rn "@/components/ui" src` → Expected: no output.
Run: `pnpm typecheck && pnpm lint && pnpm test` → Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(ui): move component kit to src/shared/ui

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Manifest registry, app shell move, router rewrite

**Files:**

- Create: `src/app/tool.ts`, `src/app/registry.ts`, `src/app/registry.test.ts`, `src/tools/<Folder>/index.ts` × 25
- Move: `src/App.tsx` → `src/app/App.tsx`; `src/components/{Dashboard,ToolLayout,ErrorBoundary,ToolErrorBoundary,Footer,NotFound,AnimatedBackground}.tsx` → `src/app/`
- Modify: `src/main.tsx`, `src/types/ToolTypes.ts` (shim), moved shell files' imports
- Delete: `src/constants.ts`, `src/data/ToolDefinitions.ts`, `src/registry/ToolRegistry.ts`

**Interfaces:**

- Produces:
  - `defineTool(m: ToolManifest): ToolManifest`
  - `interface ToolManifest extends ToolDefinition { load(): Promise<{ default: ToolComponent }> }`
  - `TOOLS: ToolManifest[]` (sorted by name)
  - `getEnabledTools(): ToolManifest[]`
  - `getTool(id): ToolManifest | undefined`
  - `buildRegistry(modules): ToolManifest[]`
- Visible change: the dashboard order becomes alphabetical. The old order was the array order in `ToolDefinitions.ts`.

- [ ] **Step 1: Write failing test** — `src/app/registry.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { FileText } from 'lucide-react';
import { buildRegistry, TOOLS } from './registry';
import { defineTool } from './tool';

const fake = (id: string, name = id) =>
  defineTool({
    id,
    name,
    description: 'd',
    icon: FileText,
    enabled: true,
    category: 'pdf',
    load: async () => ({ default: () => null }),
  });

describe('buildRegistry', () => {
  it('sorts by name', () => {
    const list = buildRegistry({
      '../tools/b/index.ts': { default: fake('b', 'Beta') },
      '../tools/a/index.ts': { default: fake('a', 'Alpha') },
    });
    expect(list.map((t) => t.id)).toEqual(['a', 'b']);
  });
  it('rejects duplicate ids, naming both files', () => {
    expect(() =>
      buildRegistry({
        '../tools/x/index.ts': { default: fake('dup') },
        '../tools/y/index.ts': { default: fake('dup') },
      }),
    ).toThrow(/Duplicate tool id "dup".*y\/index\.ts.*x\/index\.ts/);
  });
  it('rejects modules without a manifest', () => {
    expect(() =>
      buildRegistry({ '../tools/z/index.ts': { default: undefined as never } }),
    ).toThrow(/must default-export defineTool/);
  });
});

describe('TOOLS', () => {
  it('discovers every existing tool exactly once', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        'color-tester',
        'password-generator',
        'regex-tester',
        'number-converter',
        'qr-code-generator',
        'json-and-xml-viewer',
        'pomodoro',
        'unit-converter',
        'text-diff-checker',
        'image-optimizer',
        'csv-viewer',
        'random-data-generator',
        'url-encoder-decoder',
        'date-calculator',
        'hash-generator',
        'base64-converter',
        'jwt-decode',
        'url-parser',
        'api-request',
        'calculator',
        'log-parser',
        'rive-animation-player',
        'pdf-merger',
        'pdf-splitter',
        'pdf-compressor',
      ]),
    );
    for (const t of TOOLS) expect(typeof t.load).toBe('function');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/app` → Expected: FAIL.

- [ ] **Step 3: Implement `src/app/tool.ts`**

```ts
import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

export type ToolCategory =
  | 'encoding'
  | 'text'
  | 'data'
  | 'web'
  | 'security'
  | 'math'
  | 'media'
  | 'pdf'
  | 'time';

/** Tool metadata, passed to every tool component as `definition`. */
export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  category: ToolCategory;
  version?: string;
  isNew?: boolean;
}

export interface ToolProps {
  definition: ToolDefinition;
}

export type ToolComponent = ComponentType<ToolProps>;

export interface ToolManifest extends ToolDefinition {
  load: () => Promise<{ default: ToolComponent }>;
}

/** Each tool folder's index.ts default-exports defineTool({...}). */
export function defineTool(manifest: ToolManifest): ToolManifest {
  return manifest;
}
```

- [ ] **Step 4: Implement `src/app/registry.ts`**

```ts
import type { ToolManifest } from './tool';

type ManifestModules = Record<string, { default: ToolManifest }>;

export function buildRegistry(modules: ManifestModules): ToolManifest[] {
  const seen = new Map<string, string>();
  const list: ToolManifest[] = [];
  for (const [path, mod] of Object.entries(modules)) {
    const manifest = mod.default;
    if (!manifest || typeof manifest.id !== 'string') {
      throw new Error(`${path} must default-export defineTool({...})`);
    }
    const previous = seen.get(manifest.id);
    if (previous)
      throw new Error(
        `Duplicate tool id "${manifest.id}" in ${path} and ${previous}`,
      );
    seen.set(manifest.id, path);
    list.push(manifest);
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

// Manifests are tiny (metadata + a lazy loader), so eager is fine.
export const TOOLS = buildRegistry(
  import.meta.glob<{ default: ToolManifest }>('../tools/*/index.ts', {
    eager: true,
  }),
);

export const getEnabledTools = () => TOOLS.filter((t) => t.enabled);
export const getTool = (id: string) => TOOLS.find((t) => t.id === id);
```

- [ ] **Step 5: Create the 25 manifests.** Each is `src/tools/<Folder>/index.ts`, with the metadata copied from `src/data/ToolDefinitions.ts` minus `color`. Exact contents:

| Folder              | id                    | name                  | description                                                           | icon       | category | enabled   | load path               |
| ------------------- | --------------------- | --------------------- | --------------------------------------------------------------------- | ---------- | -------- | --------- | ----------------------- |
| ColorTester         | color-tester          | Color Tester          | Test and preview color combinations                                   | Palette    | media    | true      | ./ColorTester           |
| PasswordGenerator   | password-generator    | Password Generator    | Generate secure passwords                                             | Key        | security | true      | ./Generator             |
| regexTester         | regex-tester          | Regex Tester          | Test regular expressions                                              | Eye        | text     | true      | ./RegexStudio           |
| NumberConverter     | number-converter      | Number Converter      | Convert between number systems                                        | Calculator | math     | true      | ./NumberConverter       |
| QrCodeGenerator     | qr-code-generator     | QR Code Generator     | Generate QR codes                                                     | QrCode     | web      | true      | ./QRCodeGenerator       |
| JsonViewer          | json-and-xml-viewer   | Json and Xml Viewer   | View Json and Xml                                                     | CodeXml    | data     | true      | ./components/JsonViewer |
| pomodoro            | pomodoro              | Pomodoro              | Focus and productivity timer                                          | Clock      | time     | true      | ./main                  |
| UnitConverter       | unit-converter        | Unit Converter        | Convert between units                                                 | Calculator | math     | true      | ./UnitConverter         |
| TextDiffChecker     | text-diff-checker     | Text Diff Checker     | Compare differences between text files or snippets                    | Split      | text     | true      | ./TextDiffChecker       |
| ImageOptimiser      | image-optimizer       | Image Optimizer       | Compress and optimize images for web usage                            | Image      | media    | true      | ./ImageOptimiser        |
| CSVViewer           | csv-viewer            | CSV/TSV Viewer        | View and manipulate CSV/TSV data with sorting and filtering           | Table      | data     | true      | ./Csv-Tsv-viewer        |
| RandomDataGenerator | random-data-generator | Random Data Generator | Generate test data like names, emails, and addresses                  | Dice1      | data     | true      | ./RandomDataGenerator   |
| URLEncoderDecoder   | url-encoder-decoder   | URL Encoder/Decoder   | Encode and decode URL parameters                                      | Link       | encoding | true      | ./URLEncoderDecoder     |
| DateCalculator      | date-calculator       | Date Calculator       | Calculate time between dates, add or subtract time periods            | Calendar   | time     | true      | ./DateCalculator        |
| HashGenerator       | hash-generator        | Hash Generator        | Generate MD5, SHA-256, and other hash algorithms                      | Lock       | security | true      | ./HashGenerator         |
| Base64Convertor     | base64-converter      | Base64 Converter      | Convert text and files to and from Base64 encoding                    | FileCode   | encoding | true      | ./Base64Convertor       |
| JWTDecoder          | jwt-decode            | JWT Decoder           | Decode JSON Web Tokens                                                | FileCode   | encoding | true      | ./JwtDecoder            |
| UrlParser           | url-parser            | URL Parser            | Break down and analyze URL components                                 | Split      | web      | true      | ./UrlParser             |
| ApiTester           | api-request           | API Request           | Make HTTP requests to APIs                                            | Link       | web      | true      | ./ApiTester             |
| Calculator          | calculator            | Calculator            | A simple calculator                                                   | Calculator | math     | true      | ./Calculator            |
| LogParser           | log-parser            | Log Parser            | Parse and analyze multiple types of development logs                  | FileText   | text     | true      | ./LogParser             |
| RiveAnimationPlayer | rive-animation-player | Rive Animation Player | Preview and control Rive animations with state machines and artboards | Play       | media    | true      | ./RiveAnimationPlayer   |
| PdfMerger           | pdf-merger            | PDF Merger            | Merge multiple PDF files into a single document                       | FilePlus   | pdf      | true      | ./PdfMerger             |
| PdfSplitter         | pdf-splitter          | PDF Splitter          | Split PDF files into multiple documents by pages or ranges            | Scissors   | pdf      | true      | ./PdfSplitter           |
| PdfCompressor       | pdf-compressor        | PDF Compressor        | Reduce PDF file size with customizable compression levels             | Minimize2  | pdf      | **false** | ./PdfCompressor         |

All 25 have `version: '1.0.0'`. Template, shown here for ColorTester:

```ts
import { Palette } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'color-tester',
  name: 'Color Tester',
  description: 'Test and preview color combinations',
  icon: Palette,
  category: 'media',
  version: '1.0.0',
  enabled: true,
  load: () => import('./ColorTester'),
});
```

- [ ] **Step 6: Move the shell and rewrite imports**

```bash
git mv src/App.tsx src/app/App.tsx
for f in Dashboard ToolLayout ErrorBoundary ToolErrorBoundary Footer NotFound AnimatedBackground; do git mv src/components/$f.tsx src/app/$f.tsx; done
sed -i "s#from './ui'#from '@/shared/ui'#; s#from '../types/ToolTypes'#from '@/app/tool'#" src/app/*.tsx
sed -i "s#import App from './App.tsx';#import App from './app/App';#" src/main.tsx
```

In `src/app/Dashboard.tsx` and `src/app/Footer.tsx`, replace `import { getEnabledTools } from '../data/ToolDefinitions';` with `import { getEnabledTools } from './registry';`. In `src/app/Dashboard.tsx`, replace any remaining `ToolDefinition` type import with `import type { ToolDefinition } from './tool';`.

- [ ] **Step 7: Rewrite `src/app/App.tsx`**

```tsx
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Center, Spinner, Stack, Text } from '@/shared/ui';
import ErrorBoundary from './ErrorBoundary';
import { TOOLS } from './registry';

const Dashboard = lazy(() => import('./Dashboard'));
const ToolLayout = lazy(() => import('./ToolLayout'));
const NotFound = lazy(() => import('./NotFound'));

// Built once at module scope: one lazy component per tool, stable across renders.
const toolRoutes = TOOLS.map((manifest) => ({
  manifest,
  Component: lazy(manifest.load),
}));

const GlobalLoadingFallback = () => (
  <Center minScreen>
    <Stack gap="4" align="center">
      <Spinner size="xl" label="Loading" />
      <Text size="lg" weight="semibold" mono>
        Loading
      </Text>
    </Stack>
  </Center>
);

const App: React.FC = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <Toaster theme="dark" richColors position="bottom-right" />
      <Suspense fallback={<GlobalLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          {toolRoutes.map(({ manifest, Component }) => (
            <Route
              key={manifest.id}
              path={`/${manifest.id}/*`}
              element={
                manifest.enabled ? (
                  <ToolLayout definition={manifest} ToolComponent={Component} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
```

- [ ] **Step 8: Shim old types and delete the old registry**

Replace `src/types/ToolTypes.ts` entirely with:

```ts
// TEMP shim (removed in phase 4): import from '@/app/tool'.
export type {
  ToolCategory,
  ToolComponent,
  ToolDefinition,
  ToolProps,
} from '@/app/tool';
```

```bash
git rm src/constants.ts src/data/ToolDefinitions.ts src/registry/ToolRegistry.ts
```

- [ ] **Step 9: Verify**

Run: `grep -rn "TOOL_IDS\|data/ToolDefinitions\|registry/ToolRegistry\|LazyToolComponent" src` → Expected: no output.
Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build` → Expected: all exit 0.
Run: `pnpm test:e2e` → Expected: smoke passes.

Manual check: `pnpm dev`, open `/`, then `/pdf-merger` and `/pomodoro`. Both render, and `/pdf-compressor` redirects to `/`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor(app): one-file tool manifests discovered by import.meta.glob

Replaces constants.ts + ToolDefinitions.ts + ToolRegistry.ts. Lazy tool
components are created once at module scope instead of on every render.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: PDF test fixtures

**Files:**

- Create: `test/fixtures/builders.ts`, `test/fixtures/builders.test.ts`, `scripts/gen-fixtures.ts`

**Interfaces:**

- Produces:
  - `makeTextPdf(opts?: { pages?: number; label?: string; size?: [number, number] }): Promise<Uint8Array>`. Each page draws `"<label> <n>"`, and the title is set to `"<label> fixture"`.
  - `makeShapesOnlyPdf(pages?: number): Promise<Uint8Array>`. Pages have no text, only vector shapes.
  - `makeEncryptMarkedPdf(): Promise<Uint8Array>`. The trailer carries `/Encrypt`, which triggers encrypted-PDF detection in pdf-lib.
  - `pdfPageTexts(bytes): Promise<string[]>`, a test helper using the pdf.js legacy build.
  - `pnpm fixtures`, which writes `test/fixtures/generated/{text-3,text-12,text-300,shapes-2}.pdf`.

- [ ] **Step 1: Install pdf.js** (also used by Task 12)

```bash
pnpm add pdfjs-dist@^6.3.289
```

Add `"fixtures": "tsx scripts/gen-fixtures.ts"` to `package.json` scripts.

- [ ] **Step 2: Write failing test** — `test/fixtures/builders.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  makeEncryptMarkedPdf,
  makeShapesOnlyPdf,
  makeTextPdf,
  pdfPageTexts,
} from './builders';

describe('fixture builders', () => {
  it('makeTextPdf creates labelled pages', async () => {
    const bytes = await makeTextPdf({ pages: 3, label: 'Doc' });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(3);
    expect(doc.getTitle()).toBe('Doc fixture');
    expect(await pdfPageTexts(bytes)).toEqual(['Doc 1', 'Doc 2', 'Doc 3']);
  });
  it('makeShapesOnlyPdf has no text', async () => {
    expect(await pdfPageTexts(await makeShapesOnlyPdf(2))).toEqual(['', '']);
  });
  it('makeEncryptMarkedPdf is detected as encrypted by pdf-lib', async () => {
    await expect(
      PDFDocument.load(await makeEncryptMarkedPdf()),
    ).rejects.toThrow(/encrypted/i);
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `pnpm test test/fixtures` → Expected: FAIL.

- [ ] **Step 4: Implement** — `test/fixtures/builders.ts`

```ts
import { PDFDocument, PDFName, rgb, StandardFonts } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function makeTextPdf({
  pages = 3,
  label = 'Page',
  size = [612, 792] as [number, number],
}: {
  pages?: number;
  label?: string;
  size?: [number, number];
} = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage(size);
    page.drawText(`${label} ${i}`, { x: 72, y: size[1] - 96, size: 24, font });
  }
  doc.setTitle(`${label} fixture`);
  return doc.save();
}

export async function makeShapesOnlyPdf(pages = 2): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    doc
      .addPage([612, 792])
      .drawRectangle({
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        color: rgb(0.2, 0.4, 0.8),
      });
  }
  return doc.save();
}

/**
 * A PDF whose trailer references a Standard security handler. pdf-lib detects
 * this as encrypted. It is NOT decryptable; real encrypted fixtures arrive with
 * qpdf-wasm in phase 3.
 */
export async function makeEncryptMarkedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const encrypt = doc.context.obj({
    Filter: PDFName.of('Standard'),
    V: 1,
    R: 2,
    P: -4,
  });
  doc.context.trailerInfo.Encrypt = doc.context.register(encrypt);
  return doc.save({ useObjectStreams: false });
}

/** Per-page text via pdf.js (legacy build runs in Node). */
export async function pdfPageTexts(bytes: Uint8Array): Promise<string[]> {
  const pdf = await getDocument({ data: bytes.slice(), useSystemFonts: false })
    .promise;
  const out: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    out.push(
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join('')
        .trim(),
    );
  }
  await pdf.destroy();
  return out;
}
```

`scripts/gen-fixtures.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { makeShapesOnlyPdf, makeTextPdf } from '../test/fixtures/builders';

const out = new URL('../test/fixtures/generated/', import.meta.url);
await mkdir(out, { recursive: true });

const files: Record<string, Uint8Array> = {
  'text-3.pdf': await makeTextPdf({ pages: 3, label: 'Alpha' }),
  'text-12.pdf': await makeTextPdf({ pages: 12, label: 'Beta' }),
  'text-300.pdf': await makeTextPdf({ pages: 300, label: 'Big' }),
  'shapes-2.pdf': await makeShapesOnlyPdf(2),
};
for (const [name, bytes] of Object.entries(files)) {
  await writeFile(new URL(name, out), bytes);
}
console.log(
  `wrote ${Object.keys(files).length} fixtures to test/fixtures/generated`,
);
```

In `playwright.config.ts`, add `globalSetup: './test/e2e/global-setup.ts'` and create that file:

```ts
import { execSync } from 'node:child_process';

export default function globalSetup() {
  execSync('pnpm fixtures', { stdio: 'inherit' });
}
```

- [ ] **Step 5: Run tests and the generator**

Run: `pnpm test test/fixtures && pnpm fixtures` → Expected: 3 passed; "wrote 4 fixtures".

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml test scripts playwright.config.ts
git commit -m "test: add generated PDF fixtures and builders

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: `pdf/edit` — load, ranges, page operations

**Files:**

- Create: `src/pdf/edit/load.ts`, `src/pdf/edit/ranges.ts`, `src/pdf/edit/ops.ts`, `src/pdf/edit/index.ts`, `src/pdf/edit/load.test.ts`, `src/pdf/edit/ranges.test.ts`, `src/pdf/edit/ops.test.ts`

**Interfaces:**

- Consumes: `ToolError` (Task 2), fixtures (Task 10)
- Produces (all exported from `@/pdf/edit`):
  - `loadPdf(bytes: Uint8Array): Promise<PDFDocument>`, which throws `ENCRYPTED` or `INVALID_FILE`
  - `getPageCount(bytes): Promise<number>`
  - `interface PageRange { start: number; end: number }`, 0-based and inclusive
  - `parsePageRanges(input: string, pageCount: number): PageRange[]`, which throws `INVALID_INPUT`
  - `rangesToIndices(ranges): number[]`
  - `everyNPages(pageCount, n): PageRange[]`
  - `formatRange(r): string`, 1-based, e.g. `"1-3"` or `"5"`
  - `merge(inputs: { bytes: Uint8Array; pages?: number[] }[]): Promise<Uint8Array>`
  - `extract(bytes, indices: number[]): Promise<Uint8Array>`
  - `split(bytes, ranges: PageRange[]): Promise<Uint8Array[]>`
  - `type Rotation = 0 | 90 | 180 | 270`
  - `interface PageEdit { source: number; rotate: Rotation }`
  - `applyPageEdits(bytes, edits: PageEdit[]): Promise<Uint8Array>`. This reorders, deletes (omitted pages) and adds rotation in one call; the spec's `rotate`/`reorder` are expressed through it.

- [ ] **Step 1: Write failing tests**

`src/pdf/edit/ranges.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  everyNPages,
  formatRange,
  parsePageRanges,
  rangesToIndices,
} from './ranges';

describe('parsePageRanges', () => {
  it.each([
    ['1', 5, [{ start: 0, end: 0 }]],
    ['1-3', 5, [{ start: 0, end: 2 }]],
    [
      ' 1 - 3 , 5 ',
      5,
      [
        { start: 0, end: 2 },
        { start: 4, end: 4 },
      ],
    ],
    ['3-', 5, [{ start: 2, end: 4 }]],
    ['-2', 5, [{ start: 0, end: 1 }]],
    [
      '2,2',
      5,
      [
        { start: 1, end: 1 },
        { start: 1, end: 1 },
      ],
    ],
  ])('%j on %d pages', (input, count, expected) => {
    expect(parsePageRanges(input, count)).toEqual(expected);
  });

  it.each([
    ['', 5, 'Enter at least one page or range'],
    ['  , ', 5, 'Enter at least one page or range'],
    ['0', 5, 'Page 0 is out of range (1–5)'],
    ['9', 5, 'Page 9 is out of range (1–5)'],
    ['2-9', 5, 'Page 9 is out of range (1–5)'],
    ['5-2', 5, 'Range 5-2 runs backwards'],
    ['abc', 5, '"abc" is not a page number or range'],
    ['1-2-3', 5, '"1-2-3" is not a page number or range'],
  ])('%j on %d pages fails with %s', (input, count, message) => {
    expect(() => parsePageRanges(input, count)).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT', message }),
    );
  });
});

describe('range helpers', () => {
  it('flattens to indices', () => {
    expect(
      rangesToIndices([
        { start: 0, end: 2 },
        { start: 4, end: 4 },
      ]),
    ).toEqual([0, 1, 2, 4]);
  });
  it('chunks every N pages', () => {
    expect(everyNPages(5, 2)).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 3 },
      { start: 4, end: 4 },
    ]);
    expect(() => everyNPages(5, 0)).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
  it('formats 1-based labels', () => {
    expect(formatRange({ start: 0, end: 2 })).toBe('1-3');
    expect(formatRange({ start: 4, end: 4 })).toBe('5');
  });
});
```

`src/pdf/edit/load.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  makeEncryptMarkedPdf,
  makeTextPdf,
} from '../../../test/fixtures/builders';
import { getPageCount, loadPdf } from './load';

describe('loadPdf', () => {
  it('loads a valid PDF', async () => {
    expect(
      (await loadPdf(await makeTextPdf({ pages: 2 }))).getPageCount(),
    ).toBe(2);
  });
  it('rejects encrypted PDFs with ENCRYPTED', async () => {
    await expect(loadPdf(await makeEncryptMarkedPdf())).rejects.toMatchObject({
      code: 'ENCRYPTED',
      message:
        'This PDF is password-protected. Encrypted files are not supported by this tool yet.',
    });
  });
  it('rejects a header followed by garbage with INVALID_FILE', async () => {
    const garbage = new TextEncoder().encode(
      '%PDF-1.7\nthis is not a pdf body at all',
    );
    await expect(loadPdf(garbage)).rejects.toMatchObject({
      code: 'INVALID_FILE',
    });
  });
  it('rejects a truncated PDF with INVALID_FILE', async () => {
    const bytes = await makeTextPdf({ pages: 2 });
    await expect(loadPdf(bytes.slice(0, 200))).rejects.toMatchObject({
      code: 'INVALID_FILE',
    });
  });
  it('counts pages', async () => {
    expect(await getPageCount(await makeTextPdf({ pages: 4 }))).toBe(4);
  });
});
```

`src/pdf/edit/ops.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { makeTextPdf, pdfPageTexts } from '../../../test/fixtures/builders';
import { applyPageEdits, extract, merge, split } from './ops';

const rotations = async (bytes: Uint8Array) =>
  (await PDFDocument.load(bytes)).getPages().map((p) => p.getRotation().angle);

describe('merge', () => {
  it('concatenates documents in order', async () => {
    const a = await makeTextPdf({ pages: 2, label: 'A' });
    const b = await makeTextPdf({ pages: 1, label: 'B' });
    expect(
      await pdfPageTexts(await merge([{ bytes: a }, { bytes: b }])),
    ).toEqual(['A 1', 'A 2', 'B 1']);
  });
  it('honours per-input page subsets', async () => {
    const a = await makeTextPdf({ pages: 3, label: 'A' });
    const b = await makeTextPdf({ pages: 2, label: 'B' });
    const out = await merge([
      { bytes: a, pages: [2, 0] },
      { bytes: b, pages: [1] },
    ]);
    expect(await pdfPageTexts(out)).toEqual(['A 3', 'A 1', 'B 2']);
  });
  it('requires at least one input', async () => {
    await expect(merge([])).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});

describe('extract / split', () => {
  it('extracts pages in the given order', async () => {
    const src = await makeTextPdf({ pages: 4, label: 'P' });
    expect(await pdfPageTexts(await extract(src, [3, 1]))).toEqual([
      'P 4',
      'P 2',
    ]);
  });
  it('rejects empty or out-of-range indices', async () => {
    const src = await makeTextPdf({ pages: 2 });
    await expect(extract(src, [])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(extract(src, [2])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });
  it('splits into one document per range', async () => {
    const src = await makeTextPdf({ pages: 5, label: 'S' });
    const parts = await split(src, [
      { start: 0, end: 1 },
      { start: 4, end: 4 },
    ]);
    expect(parts).toHaveLength(2);
    expect(await pdfPageTexts(parts[0])).toEqual(['S 1', 'S 2']);
    expect(await pdfPageTexts(parts[1])).toEqual(['S 5']);
  });
});

describe('applyPageEdits', () => {
  it('reorders, deletes and rotates in one pass', async () => {
    const src = await makeTextPdf({ pages: 3, label: 'O' });
    const out = await applyPageEdits(src, [
      { source: 2, rotate: 90 },
      { source: 0, rotate: 0 },
    ]);
    expect(await pdfPageTexts(out)).toEqual(['O 3', 'O 1']);
    expect(await rotations(out)).toEqual([90, 0]);
  });
  it('adds to existing rotation modulo 360', async () => {
    const once = await applyPageEdits(await makeTextPdf({ pages: 1 }), [
      { source: 0, rotate: 270 },
    ]);
    const twice = await applyPageEdits(once, [{ source: 0, rotate: 180 }]);
    expect(await rotations(twice)).toEqual([90]);
  });
  it('refuses to produce an empty document', async () => {
    await expect(
      applyPageEdits(await makeTextPdf({ pages: 1 }), []),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/pdf/edit` → Expected: FAIL.

- [ ] **Step 3: Implement**

`src/pdf/edit/load.ts`:

```ts
import { EncryptedPDFError, PDFDocument } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';

export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (cause) {
    if (cause instanceof EncryptedPDFError) {
      throw new ToolError(
        'ENCRYPTED',
        'This PDF is password-protected. Encrypted files are not supported by this tool yet.',
        { cause },
      );
    }
    throw new ToolError(
      'INVALID_FILE',
      'This file could not be read as a PDF. It may be damaged.',
      { cause },
    );
  }
  // pdf-lib is lenient: a header plus garbage can "load" with no page tree.
  let count = 0;
  try {
    count = doc.getPageCount();
  } catch (cause) {
    throw new ToolError(
      'INVALID_FILE',
      'This file could not be read as a PDF. It may be damaged.',
      { cause },
    );
  }
  if (count === 0)
    throw new ToolError('INVALID_FILE', 'This PDF has no pages.');
  return doc;
}

export async function getPageCount(bytes: Uint8Array): Promise<number> {
  return (await loadPdf(bytes)).getPageCount();
}
```

`src/pdf/edit/ranges.ts`:

```ts
import { ToolError } from '@/shared/lib/errors';

/** 0-based, inclusive. */
export interface PageRange {
  start: number;
  end: number;
}

const invalid = (message: string) => new ToolError('INVALID_INPUT', message);

/** Parses 1-based `1-3, 5, 8-, -2` against a document's page count. */
export function parsePageRanges(input: string, pageCount: number): PageRange[] {
  const tokens = input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) throw invalid('Enter at least one page or range');

  const page = (raw: string, token: string): number => {
    if (!/^\d+$/.test(raw))
      throw invalid(`"${token}" is not a page number or range`);
    const n = Number(raw);
    if (n < 1 || n > pageCount)
      throw invalid(`Page ${n} is out of range (1–${pageCount})`);
    return n - 1;
  };

  return tokens.map((token) => {
    const parts = token.split('-').map((p) => p.trim());
    if (parts.length === 1) {
      const n = page(parts[0], token);
      return { start: n, end: n };
    }
    if (parts.length !== 2 || (parts[0] === '' && parts[1] === '')) {
      throw invalid(`"${token}" is not a page number or range`);
    }
    const start = parts[0] === '' ? 0 : page(parts[0], token);
    const end = parts[1] === '' ? pageCount - 1 : page(parts[1], token);
    if (start > end)
      throw invalid(`Range ${start + 1}-${end + 1} runs backwards`);
    return { start, end };
  });
}

export function rangesToIndices(ranges: PageRange[]): number[] {
  return ranges.flatMap((r) =>
    Array.from({ length: r.end - r.start + 1 }, (_, i) => r.start + i),
  );
}

export function everyNPages(pageCount: number, n: number): PageRange[] {
  if (!Number.isInteger(n) || n < 1)
    throw invalid('Pages per file must be a whole number of at least 1');
  const out: PageRange[] = [];
  for (let start = 0; start < pageCount; start += n) {
    out.push({ start, end: Math.min(start + n, pageCount) - 1 });
  }
  return out;
}

export function formatRange(r: PageRange): string {
  return r.start === r.end ? `${r.start + 1}` : `${r.start + 1}-${r.end + 1}`;
}
```

`src/pdf/edit/ops.ts`:

```ts
import { degrees, PDFDocument } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { loadPdf } from './load';
import type { PageRange } from './ranges';
import { rangesToIndices } from './ranges';

export type Rotation = 0 | 90 | 180 | 270;

export interface PageEdit {
  /** 0-based index into the source document. */
  source: number;
  /** Added to the page's existing rotation. */
  rotate: Rotation;
}

const save = (doc: PDFDocument) => doc.save({ useObjectStreams: true });

function assertIndices(indices: number[], pageCount: number) {
  if (indices.length === 0)
    throw new ToolError('INVALID_INPUT', 'Select at least one page');
  const bad = indices.find(
    (i) => !Number.isInteger(i) || i < 0 || i >= pageCount,
  );
  if (bad !== undefined)
    throw new ToolError(
      'INVALID_INPUT',
      `Page ${bad + 1} is out of range (1–${pageCount})`,
    );
}

async function copyInto(
  target: PDFDocument,
  source: PDFDocument,
  indices: number[],
) {
  const pages = await target.copyPages(source, indices);
  pages.forEach((p) => target.addPage(p));
  return pages;
}

export async function merge(
  inputs: { bytes: Uint8Array; pages?: number[] }[],
): Promise<Uint8Array> {
  if (inputs.length === 0)
    throw new ToolError('INVALID_INPUT', 'Add at least one PDF');
  const out = await PDFDocument.create();
  for (const input of inputs) {
    const src = await loadPdf(input.bytes);
    const indices = input.pages ?? src.getPageIndices();
    assertIndices(indices, src.getPageCount());
    await copyInto(out, src, indices);
  }
  return save(out);
}

export async function extract(
  bytes: Uint8Array,
  indices: number[],
): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  assertIndices(indices, src.getPageCount());
  const out = await PDFDocument.create();
  await copyInto(out, src, indices);
  return save(out);
}

export async function split(
  bytes: Uint8Array,
  ranges: PageRange[],
): Promise<Uint8Array[]> {
  if (ranges.length === 0)
    throw new ToolError('INVALID_INPUT', 'Enter at least one page or range');
  const src = await loadPdf(bytes);
  const results: Uint8Array[] = [];
  for (const range of ranges) {
    const indices = rangesToIndices([range]);
    assertIndices(indices, src.getPageCount());
    const out = await PDFDocument.create();
    await copyInto(out, src, indices);
    results.push(await save(out));
  }
  return results;
}

export async function applyPageEdits(
  bytes: Uint8Array,
  edits: PageEdit[],
): Promise<Uint8Array> {
  if (edits.length === 0)
    throw new ToolError(
      'INVALID_INPUT',
      'The document must keep at least one page',
    );
  const src = await loadPdf(bytes);
  assertIndices(
    edits.map((e) => e.source),
    src.getPageCount(),
  );
  const out = await PDFDocument.create();
  const pages = await copyInto(
    out,
    src,
    edits.map((e) => e.source),
  );
  pages.forEach((page, i) => {
    const angle =
      (((page.getRotation().angle + edits[i].rotate) % 360) + 360) % 360;
    page.setRotation(degrees(angle));
  });
  return save(out);
}
```

`src/pdf/edit/index.ts`:

```ts
export { loadPdf, getPageCount } from './load';
export {
  parsePageRanges,
  rangesToIndices,
  everyNPages,
  formatRange,
  type PageRange,
} from './ranges';
export {
  merge,
  extract,
  split,
  applyPageEdits,
  type PageEdit,
  type Rotation,
} from './ops';
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/pdf/edit` → Expected: PASS. If the truncated-PDF case loads successfully (pdf-lib can recover xref-less files), assert on whatever is actually true and remove the case. The garbage-body case must still pass.

- [ ] **Step 5: Commit**

```bash
git add src/pdf/edit
git commit -m "feat(pdf): add pdf-lib load/ranges/merge/extract/split/page-edit core

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: `pdf/render` — worker, client, text, bitmap cache, hooks

**Files:**

- Create: `scripts/copy-pdfjs-assets.mjs`, `src/pdf/render/types.ts`, `src/pdf/render/text.ts`, `src/pdf/render/text.test.ts`, `src/pdf/render/canvas-factory.ts`, `src/pdf/render/render.worker.ts`, `src/pdf/render/pdfjs-worker.d.ts`, `src/pdf/render/client.ts`, `src/pdf/render/bitmap-cache.ts`, `src/pdf/render/bitmap-cache.test.ts`, `src/pdf/render/hooks.ts`, `src/pdf/render/index.ts`
- Modify: `package.json` scripts `dev` and `build`

**Interfaces:**

- Consumes: `createRpcClient`, `exposeRpc`, `Transferred`, `RpcEndpoint` (Task 7); `ToolError` (Task 2)
- Produces (from `@/pdf/render`):
  - `interface PageInfo { width: number; height: number }`. CSS px at scale 1, with the page's own rotation applied.
  - `interface DocInfo { docId: string; pageCount: number; pages: PageInfo[] }`
  - `interface PageText { text: string; hasTextLayer: boolean }`
  - `textFromItems(items): PageText`
  - `pdfRender.open(bytes, signal?) → Promise<DocInfo>`
  - `pdfRender.renderPage(docId, pageIndex, widthPx, signal?) → Promise<ImageBitmap>`
  - `pdfRender.extractText(docId, pageIndex, signal?) → Promise<PageText>`
  - `pdfRender.close(docId) → Promise<void>`
  - `usePdfDocument(file: { bytes: Uint8Array } | null) → { doc: DocInfo | null; loading: boolean; error: ToolError | null }`
  - `usePageBitmap(docId: string | null, pageIndex: number, widthPx: number, enabled: boolean) → ImageBitmap | null`
  - `BitmapCache` (internal, exported for tests)

- [ ] **Step 1: Asset copy script.** pdf.js loads standard fonts, CMaps, ICC profiles and its wasm decoders by URL. Create `scripts/copy-pdfjs-assets.mjs`:

```js
import { cp, rm } from 'node:fs/promises';

const src = new URL('../node_modules/pdfjs-dist/', import.meta.url);
const dest = new URL('../public/pdfjs/', import.meta.url);

await rm(dest, { recursive: true, force: true });
for (const dir of ['standard_fonts', 'cmaps', 'iccs', 'wasm']) {
  await cp(new URL(`${dir}/`, src), new URL(`${dir}/`, dest), {
    recursive: true,
  });
}
console.log('copied pdf.js assets to public/pdfjs');
```

pnpm 10 does not run `pre*` scripts, so chain the copy in `package.json`:

```json
"dev": "node scripts/copy-pdfjs-assets.mjs && vite",
"build": "node scripts/copy-pdfjs-assets.mjs && tsc -b && vite build",
```

Run: `node scripts/copy-pdfjs-assets.mjs && ls public/pdfjs` → Expected: `cmaps iccs standard_fonts wasm`.

- [ ] **Step 2: Write failing tests**

`src/pdf/render/text.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  makeShapesOnlyPdf,
  makeTextPdf,
} from '../../../test/fixtures/builders';
import { textFromItems } from './text';

async function firstPageItems(bytes: Uint8Array) {
  const pdf = await getDocument({ data: bytes.slice(), useSystemFonts: false })
    .promise;
  const items = (await (await pdf.getPage(1)).getTextContent()).items;
  await pdf.destroy();
  return items;
}

describe('textFromItems', () => {
  it('joins strings and honours end-of-line markers', () => {
    expect(
      textFromItems([
        { str: 'Hello', hasEOL: false },
        { str: ' world', hasEOL: true },
        { str: 'next', hasEOL: false },
      ]),
    ).toEqual({ text: 'Hello world\nnext', hasTextLayer: true });
  });
  it('reports pages with only whitespace as having no text layer', () => {
    expect(textFromItems([{ str: '  ', hasEOL: false }])).toEqual({
      text: '',
      hasTextLayer: false,
    });
  });
  it('works on real pdf.js output', async () => {
    expect(
      textFromItems(await firstPageItems(await makeTextPdf({ label: 'Real' }))),
    ).toEqual({
      text: 'Real 1',
      hasTextLayer: true,
    });
    expect(
      textFromItems(await firstPageItems(await makeShapesOnlyPdf(1)))
        .hasTextLayer,
    ).toBe(false);
  });
});
```

`src/pdf/render/bitmap-cache.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { BitmapCache } from './bitmap-cache';

const bmp = (width = 10) =>
  ({ width, close: vi.fn() }) as unknown as ImageBitmap & {
    close: ReturnType<typeof vi.fn>;
  };

describe('BitmapCache', () => {
  it('evicts least-recently-used entries past capacity and closes them', () => {
    const cache = new BitmapCache(2);
    const a = bmp();
    const b = bmp();
    const c = bmp();
    cache.set('d1', 0, 100, a);
    cache.set('d1', 1, 100, b);
    cache.get('d1', 0, 100); // touch a
    cache.set('d1', 2, 100, c); // evicts b
    expect(cache.get('d1', 1, 100)).toBeUndefined();
    expect(b.close).toHaveBeenCalledOnce();
    expect(cache.get('d1', 0, 100)).toBe(a);
    expect(cache.size).toBe(2);
  });
  it('drops every bitmap of a document', () => {
    const cache = new BitmapCache(10);
    const a = bmp();
    const other = bmp();
    cache.set('d1', 0, 100, a);
    cache.set('d2', 0, 100, other);
    cache.deleteDoc('d1');
    expect(a.close).toHaveBeenCalledOnce();
    expect(cache.get('d2', 0, 100)).toBe(other);
  });
  it('treats closed (zero-width) bitmaps as misses', () => {
    const cache = new BitmapCache(10);
    cache.set('d', 0, 100, bmp(0));
    expect(cache.get('d', 0, 100)).toBeUndefined();
    expect(cache.size).toBe(0);
  });
  it('stays bounded for a 300-page document', () => {
    const cache = new BitmapCache(150);
    for (let i = 0; i < 300; i++) cache.set('big', i, 160, bmp());
    expect(cache.size).toBe(150);
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `pnpm test src/pdf/render` → Expected: FAIL.

- [ ] **Step 4: Implement pure modules**

`src/pdf/render/types.ts`:

```ts
export interface PageInfo {
  /** CSS px at scale 1, with the page's own /Rotate applied. */
  width: number;
  height: number;
}

export interface DocInfo {
  docId: string;
  pageCount: number;
  pages: PageInfo[];
}

export interface PageText {
  text: string;
  hasTextLayer: boolean;
}
```

`src/pdf/render/text.ts`:

```ts
import type { PageText } from './types';

type Item = { str?: string; hasEOL?: boolean } | object;

/** Flattens pdf.js text-content items into plain text. */
export function textFromItems(items: readonly Item[]): PageText {
  let text = '';
  for (const item of items) {
    if (!('str' in item) || typeof item.str !== 'string') continue;
    text += item.str;
    if ('hasEOL' in item && item.hasEOL) text += '\n';
  }
  const trimmed = text.trim();
  return { text: trimmed, hasTextLayer: trimmed.length > 0 };
}
```

`src/pdf/render/bitmap-cache.ts`:

```ts
const key = (docId: string, page: number, width: number) =>
  `${docId}:${page}:${width}`;

/** LRU of rendered page bitmaps; closes bitmaps it evicts. */
export class BitmapCache {
  private entries = new Map<string, { docId: string; bitmap: ImageBitmap }>();

  constructor(private readonly capacity = 150) {}

  get size() {
    return this.entries.size;
  }

  get(docId: string, page: number, width: number): ImageBitmap | undefined {
    const k = key(docId, page, width);
    const entry = this.entries.get(k);
    if (!entry) return undefined;
    this.entries.delete(k);
    if (entry.bitmap.width === 0) return undefined; // closed elsewhere
    this.entries.set(k, entry);
    return entry.bitmap;
  }

  set(docId: string, page: number, width: number, bitmap: ImageBitmap) {
    const k = key(docId, page, width);
    const existing = this.entries.get(k);
    if (existing && existing.bitmap !== bitmap) existing.bitmap.close();
    this.entries.delete(k);
    this.entries.set(k, { docId, bitmap });
    while (this.entries.size > this.capacity) {
      const [oldest, entry] = this.entries.entries().next().value!;
      this.entries.delete(oldest);
      entry.bitmap.close();
    }
  }

  deleteDoc(docId: string) {
    for (const [k, entry] of this.entries) {
      if (entry.docId === docId) {
        entry.bitmap.close();
        this.entries.delete(k);
      }
    }
  }
}
```

- [ ] **Step 5: Run unit tests**

Run: `pnpm test src/pdf/render` → Expected: PASS.

- [ ] **Step 6: Implement the worker side**

`src/pdf/render/pdfjs-worker.d.ts`:

```ts
declare module 'pdfjs-dist/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown;
}
```

`src/pdf/render/canvas-factory.ts`:

```ts
/**
 * pdf.js defaults to DOM factories that call document.createElement, which
 * does not exist in a worker. These are the worker-safe equivalents.
 */
export class OffscreenCanvasFactory {
  create(width: number, height: number) {
    if (width <= 0 || height <= 0) throw new Error('Invalid canvas size');
    const canvas = new OffscreenCanvas(width, height);
    return {
      canvas,
      context: canvas.getContext('2d', { willReadFrequently: true }),
    };
  }
  reset(
    target: { canvas: OffscreenCanvas | null },
    width: number,
    height: number,
  ) {
    if (!target.canvas) throw new Error('Canvas is not specified');
    target.canvas.width = width;
    target.canvas.height = height;
  }
  destroy(target: { canvas: OffscreenCanvas | null; context: unknown }) {
    if (target.canvas) target.canvas.width = target.canvas.height = 0;
    target.canvas = null;
    target.context = null;
  }
}

/** SVG filters need the DOM; "none" makes pdf.js skip them (same as its base class). */
export class NoopFilterFactory {
  addFilter() {
    return 'none';
  }
  addHCMFilter() {
    return 'none';
  }
  addAlphaFilter() {
    return 'none';
  }
  addLuminosityFilter() {
    return 'none';
  }
  addKnockoutFilter() {
    return 'none';
  }
  addHighlightHCMFilter() {
    return 'none';
  }
  addSelectionHCMFilter() {
    return 'none';
  }
  addSelectionFilter() {
    return 'none';
  }
  createSelectionStyle() {
    return 'none';
  }
  destroy() {}
}
```

`src/pdf/render/render.worker.ts`:

```ts
import * as pdfjs from 'pdfjs-dist';
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { ToolError } from '@/shared/lib/errors';
import {
  exposeRpc,
  Transferred,
  type RpcContext,
  type RpcEndpoint,
} from '@/shared/lib/worker-rpc';
import { NoopFilterFactory, OffscreenCanvasFactory } from './canvas-factory';
import { textFromItems } from './text';
import type { DocInfo, PageText } from './types';

// Run pdf.js's parser in this same worker (no nested worker).
(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;

const asset = (dir: string) =>
  new URL(`/pdfjs/${dir}/`, self.location.origin).href;
const docs = new Map<string, PDFDocumentProxy>();

function getDoc(docId: string) {
  const doc = docs.get(docId);
  if (!doc) throw new ToolError('UNKNOWN', 'Document is no longer open');
  return doc;
}

const handlers = {
  async open(_ctx: RpcContext, bytes: Uint8Array): Promise<DocInfo> {
    const task = pdfjs.getDocument({
      data: bytes,
      CanvasFactory: OffscreenCanvasFactory,
      FilterFactory: NoopFilterFactory,
      isOffscreenCanvasSupported: true,
      disableFontFace: true, // FontFace needs a document; glyphs render as paths instead
      useSystemFonts: false,
      useWorkerFetch: false, // its default probe reads document.baseURI
      standardFontDataUrl: asset('standard_fonts'),
      cMapUrl: asset('cmaps'),
      cMapPacked: true,
      iccUrl: asset('iccs'),
      wasmUrl: asset('wasm'),
    });
    let doc: PDFDocumentProxy;
    try {
      doc = await task.promise;
    } catch (cause) {
      if (cause instanceof pdfjs.PasswordException) {
        throw new ToolError(
          'ENCRYPTED',
          'This PDF is password-protected. Encrypted files are not supported by this tool yet.',
          { cause },
        );
      }
      throw new ToolError(
        'INVALID_FILE',
        'This file could not be read as a PDF. It may be damaged.',
        { cause },
      );
    }
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const vp = (await doc.getPage(i)).getViewport({ scale: 1 });
      pages.push({ width: vp.width, height: vp.height });
    }
    const docId = crypto.randomUUID();
    docs.set(docId, doc);
    return { docId, pageCount: doc.numPages, pages };
  },

  async renderPage(
    ctx: RpcContext,
    docId: string,
    pageIndex: number,
    widthPx: number,
  ) {
    const page = await getDoc(docId).getPage(pageIndex + 1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({
      scale: Math.min(4, widthPx / base.width),
    });
    const canvas = new OffscreenCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    );
    const task = page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: canvas.getContext(
        '2d',
      ) as unknown as CanvasRenderingContext2D,
      viewport,
      background: '#ffffff',
    });
    const onAbort = () => task.cancel();
    ctx.signal.addEventListener('abort', onAbort, { once: true });
    try {
      await task.promise;
    } finally {
      ctx.signal.removeEventListener('abort', onAbort);
      page.cleanup();
    }
    const bitmap = canvas.transferToImageBitmap();
    return new Transferred(bitmap, [bitmap]);
  },

  async extractText(
    _ctx: RpcContext,
    docId: string,
    pageIndex: number,
  ): Promise<PageText> {
    const page = await getDoc(docId).getPage(pageIndex + 1);
    return textFromItems((await page.getTextContent()).items);
  },

  async close(_ctx: RpcContext, docId: string) {
    const doc = docs.get(docId);
    docs.delete(docId);
    await doc?.destroy();
  },
};

export type RenderHandlers = typeof handlers;

exposeRpc(handlers, self as unknown as RpcEndpoint);
```

- [ ] **Step 7: Implement the main-thread side**

`src/pdf/render/client.ts`:

```ts
import { createRpcClient } from '@/shared/lib/worker-rpc';
import type { RenderHandlers } from './render.worker';

const client = createRpcClient<RenderHandlers>(
  () =>
    new Worker(new URL('./render.worker.ts', import.meta.url), {
      type: 'module',
    }),
);

// Bound concurrent page renders so a scrolled grid can't queue hundreds at once.
const MAX_RENDERS = 4;
let active = 0;
const waiting: (() => void)[] = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_RENDERS) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

export const pdfRender = {
  /** Copies the bytes (callers keep theirs) and transfers the copy to the worker. */
  open(bytes: Uint8Array, signal?: AbortSignal) {
    const copy = bytes.slice();
    return client.call('open', [copy], { signal, transfer: [copy.buffer] });
  },
  renderPage(
    docId: string,
    pageIndex: number,
    widthPx: number,
    signal?: AbortSignal,
  ) {
    return withSlot(() =>
      client.call('renderPage', [docId, pageIndex, widthPx], { signal }),
    );
  },
  extractText(docId: string, pageIndex: number, signal?: AbortSignal) {
    return client.call('extractText', [docId, pageIndex], { signal });
  },
  close(docId: string) {
    return client.call('close', [docId]);
  },
};
```

`src/pdf/render/hooks.ts`:

```ts
import { useEffect, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { BitmapCache } from './bitmap-cache';
import { pdfRender } from './client';
import type { DocInfo } from './types';

const cache = new BitmapCache(150);
const inflight = new Map<string, Promise<ImageBitmap>>();

interface DocState {
  doc: DocInfo | null;
  loading: boolean;
  error: ToolError | null;
}

/** Opens `file` in the render worker; closes it on change/unmount. */
export function usePdfDocument(file: { bytes: Uint8Array } | null): DocState {
  const [state, setState] = useState<DocState>({
    doc: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!file) {
      setState({ doc: null, loading: false, error: null });
      return;
    }
    const ctrl = new AbortController();
    let opened: string | null = null;
    let alive = true;
    setState({ doc: null, loading: true, error: null });
    pdfRender.open(file.bytes, ctrl.signal).then(
      (doc) => {
        opened = doc.docId;
        if (alive) setState({ doc, loading: false, error: null });
        else void pdfRender.close(doc.docId);
      },
      (e) => {
        if (alive)
          setState({ doc: null, loading: false, error: toToolError(e) });
      },
    );
    return () => {
      alive = false;
      ctrl.abort();
      if (opened) {
        cache.deleteDoc(opened);
        void pdfRender.close(opened).catch(() => {});
      }
    };
  }, [file]);

  return state;
}

/** A rendered page bitmap, fetched once `enabled` (e.g. scrolled into view). */
export function usePageBitmap(
  docId: string | null,
  pageIndex: number,
  widthPx: number,
  enabled: boolean,
) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(() =>
    docId ? (cache.get(docId, pageIndex, widthPx) ?? null) : null,
  );

  useEffect(() => {
    if (!docId || !enabled) return;
    const cached = cache.get(docId, pageIndex, widthPx);
    if (cached) {
      setBitmap(cached);
      return;
    }
    let alive = true;
    const k = `${docId}:${pageIndex}:${widthPx}`;
    let p = inflight.get(k);
    if (!p) {
      p = pdfRender
        .renderPage(docId, pageIndex, widthPx)
        .then((b) => {
          cache.set(docId, pageIndex, widthPx, b);
          return b;
        })
        .finally(() => inflight.delete(k));
      inflight.set(k, p);
    }
    p.then(
      (b) => alive && setBitmap(b),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [docId, pageIndex, widthPx, enabled]);

  return bitmap;
}
```

`src/pdf/render/index.ts`:

```ts
export { pdfRender } from './client';
export { usePdfDocument, usePageBitmap } from './hooks';
export { textFromItems } from './text';
export type { DocInfo, PageInfo, PageText } from './types';
```

- [ ] **Step 8: Typecheck, then spike the worker in a real browser.** This is the riskiest integration in the phase, so prove it before building UI on it.

Run: `pnpm typecheck` → Expected: exit 0. If `getDocument`'s option types reject `CanvasFactory`/`FilterFactory`, cast the options object `as Parameters<typeof pdfjs.getDocument>[0]`.

Create a temporary `test/e2e/render-spike.spec.ts`:

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('render worker opens and renders a page', async ({ page }) => {
  await page.goto('/');
  const bytes = Array.from(readFileSync('test/fixtures/generated/text-3.pdf'));
  const result = await page.evaluate(async (data) => {
    const { pdfRender } = await import('/src/pdf/render/client.ts');
    const doc = await pdfRender.open(new Uint8Array(data));
    const bmp = await pdfRender.renderPage(doc.docId, 0, 200);
    const text = await pdfRender.extractText(doc.docId, 0);
    await pdfRender.close(doc.docId);
    return {
      pages: doc.pageCount,
      w: bmp.width,
      h: bmp.height,
      text: text.text,
    };
  }, bytes);
  expect(result).toEqual({ pages: 3, w: 200, h: 259, text: 'Alpha 1' });
});
```

Run: `pnpm test:e2e render-spike` → Expected: PASS. A US Letter page is 612×792, so 200 wide gives 259 tall (ceil).

If it fails with `document is not defined`, add `ownerDocument: undefined` and check which pdf.js factory still touches the DOM. Fix it here, not later. Once it passes, delete the spike file; the Organize e2e (Task 16) covers this path permanently.

- [ ] **Step 9: Commit**

```bash
git rm -f --cached test/e2e/render-spike.spec.ts 2>/dev/null; rm -f test/e2e/render-spike.spec.ts
git add package.json scripts src/pdf/render
git commit -m "feat(pdf): add pdf.js render worker, bitmap cache and document hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: PDF components

**Files:**

- Create in `src/pdf/components/`: `useSortableList.ts`, `useSortableList.test.ts`, `PdfDropzone.tsx`, `PdfDropzone.test.tsx`, `PageThumb.tsx`, `PageGrid.tsx`, `SortableFileList.tsx`, `JobPanel.tsx`, `JobPanel.test.tsx`, `ResultFiles.tsx`, `index.ts`
- Modify: `package.json` (add `@arshad-shah/detent`, `@arshad-shah/detent-react`)

**Interfaces:**

- Consumes:
  - `LoadedFile`, `loadFile`, `isOverSoftLimit`, `acceptAttribute`, `describeKinds` (Task 3)
  - `formatBytes`, `formatSizeChange` (Task 2)
  - `saveBlob`, `saveZip` (Task 4)
  - `notify` (Task 5)
  - `JobState` (Task 6)
  - `DocInfo`, `usePageBitmap` (Task 12)
  - `Rotation` (Task 11)
- Produces (from `@/pdf/components`):
  - `moveItem<T>(list, from, to): T[]`
  - `restoreDomOrder(container, item, fromIndex, selector)`
  - `useSortableList<T>(items: T[], onReorder: (next: T[]) => void, opts?: { disabled?: boolean; direction?: 'auto' | 'x' | 'y' | 'grid' }): (node: HTMLElement | null) => void`. Children must carry `data-sortable-item`.
  - `<PdfDropzone onFiles(files: LoadedFile[]) multiple? disabled? accept?: FileKind[] label? hint? />`
  - `<PageThumb docId pageIndex page: PageInfo width rotation? label />`
  - `interface PageTile { key: string; pageIndex: number; rotation: Rotation }`
  - `<PageGrid doc tiles thumbWidth? selected?: ReadonlySet<string> onToggle?(key, e: { shift: boolean; meta: boolean }) onReorder?(next: PageTile[]) renderActions?(tile, position) />`
  - `<SortableFileList items: { id; name; size }[] onReorder onRemove renderExtra?(item) />`
  - `<JobPanel job onCancel runningLabel? >{doneContent}</JobPanel>`
  - `interface ResultFile { name: string; bytes: Uint8Array; detail?: string }`
  - `<ResultFiles files inputSize? zipName? />`

- [ ] **Step 1: Install**

```bash
pnpm add @arshad-shah/detent @arshad-shah/detent-react
```

- [ ] **Step 2: Write failing tests**

`src/pdf/components/useSortableList.test.ts`:

```ts
/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { moveItem, restoreDomOrder } from './useSortableList';

describe('moveItem', () => {
  it.each([
    [0, 2, ['b', 'c', 'a', 'd']],
    [3, 0, ['d', 'a', 'b', 'c']],
    [1, 1, ['a', 'b', 'c', 'd']],
  ])('moves %d → %d', (from, to, expected) => {
    expect(moveItem(['a', 'b', 'c', 'd'], from, to)).toEqual(expected);
  });
  it('does not mutate the input', () => {
    const input = ['a', 'b'];
    moveItem(input, 0, 1);
    expect(input).toEqual(['a', 'b']);
  });
});

describe('restoreDomOrder', () => {
  const build = () => {
    const ul = document.createElement('ul');
    ul.innerHTML =
      ['a', 'b', 'c', 'd']
        .map((t) => `<li data-sortable-item>${t}</li>`)
        .join('') + '<li>footer</li>';
    return ul;
  };
  const order = (ul: HTMLElement) =>
    Array.from(ul.children).map((n) => n.textContent);

  it('puts a moved item back at its original index', () => {
    const ul = build();
    const a = ul.children[0];
    ul.insertBefore(a, ul.children[3]); // detent moved a after c
    restoreDomOrder(ul, a as HTMLElement, 0, '[data-sortable-item]');
    expect(order(ul)).toEqual(['a', 'b', 'c', 'd', 'footer']);
  });
  it('restores an item that came from the end, before non-sortable trailing nodes', () => {
    const ul = build();
    const d = ul.children[3];
    ul.insertBefore(d, ul.children[0]);
    restoreDomOrder(ul, d as HTMLElement, 3, '[data-sortable-item]');
    expect(order(ul)).toEqual(['a', 'b', 'c', 'd', 'footer']);
  });
});
```

`src/pdf/components/PdfDropzone.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PdfDropzone } from './PdfDropzone';

const pdf = (name: string) =>
  new File([new TextEncoder().encode('%PDF-1.7\n%%EOF')], name, {
    type: 'application/pdf',
  });
const fake = (name: string) =>
  new File([new TextEncoder().encode('nope')], name);

describe('PdfDropzone', () => {
  it('passes valid files and lists rejected ones', async () => {
    const onFiles = vi.fn();
    const { container } = render(<PdfDropzone multiple onFiles={onFiles} />);
    const input = container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [pdf('good.pdf'), fake('bad.pdf')] },
    });
    await waitFor(() => expect(onFiles).toHaveBeenCalledOnce());
    expect(
      onFiles.mock.calls[0][0].map((f: { name: string }) => f.name),
    ).toEqual(['good.pdf']);
    expect(await screen.findByText('bad.pdf is not a PDF file')).toBeTruthy();
  });

  it('does not call onFiles when everything is rejected', async () => {
    const onFiles = vi.fn();
    const { container } = render(<PdfDropzone onFiles={onFiles} />);
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [fake('x.pdf')] },
    });
    expect(await screen.findByText('x.pdf is not a PDF file')).toBeTruthy();
    expect(onFiles).not.toHaveBeenCalled();
  });
});
```

`src/pdf/components/JobPanel.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { JobPanel } from './JobPanel';

const base = { progress: null, result: null, error: null };

describe('JobPanel', () => {
  it('renders nothing when idle', () => {
    const { container } = render(
      <JobPanel job={{ ...base, status: 'idle' }} onCancel={() => {}} />,
    );
    expect(container.textContent).toBe('');
  });
  it('shows progress and cancels', () => {
    const onCancel = vi.fn();
    render(
      <JobPanel
        job={{
          ...base,
          status: 'running',
          progress: { done: 2, total: 4, label: 'Copying pages' },
        }}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByText('Copying pages · 2 / 4')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
  it('shows the error message', () => {
    render(
      <JobPanel
        job={{
          ...base,
          status: 'error',
          error: new ToolError('INVALID_INPUT', 'Range 5-2 runs backwards'),
        }}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain(
      'Range 5-2 runs backwards',
    );
  });
  it('shows children when done', () => {
    render(
      <JobPanel
        job={{ ...base, status: 'done', result: 1 }}
        onCancel={() => {}}
      >
        <p>result here</p>
      </JobPanel>,
    );
    expect(screen.getByText('result here')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `pnpm test src/pdf/components` → Expected: FAIL.

- [ ] **Step 4: Implement**

`src/pdf/components/useSortableList.ts`:

```ts
import { useSortable } from '@arshad-shah/detent-react';

const ITEM = '[data-sortable-item]';

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * detent moves the dragged node in the DOM itself. React must stay the only
 * owner of DOM order, so we put the node back and let React re-render from
 * state.
 */
export function restoreDomOrder(
  container: HTMLElement,
  item: HTMLElement,
  fromIndex: number,
  selector = ITEM,
) {
  const siblings = Array.from(
    container.querySelectorAll<HTMLElement>(`:scope > ${selector}`),
  ).filter((el) => el !== item);
  const anchor =
    siblings[fromIndex] ?? siblings[siblings.length - 1]?.nextSibling ?? null;
  container.insertBefore(item, anchor);
}

/** Drag/keyboard reordering for a React-rendered list. Children need `data-sortable-item`. */
export function useSortableList<T>(
  items: readonly T[],
  onReorder: (next: T[]) => void,
  opts: { disabled?: boolean; direction?: 'auto' | 'x' | 'y' | 'grid' } = {},
) {
  return useSortable({
    items: ITEM,
    animation: 150,
    direction: opts.direction ?? 'auto',
    disabled: opts.disabled,
    onSort: ({ item, from, to }) => {
      restoreDomOrder(from.container, item, from.index);
      onReorder(moveItem(items, from.index, to.index));
    },
  });
}
```

`src/pdf/components/PdfDropzone.tsx`:

```tsx
import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle, FileUpload } from '@/shared/ui';
import {
  acceptAttribute,
  describeKinds,
  isOverSoftLimit,
  loadFile,
  type FileKind,
  type LoadedFile,
} from '@/shared/lib/files';
import { toToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';
import { notify } from '@/shared/lib/notify';

interface PdfDropzoneProps {
  onFiles: (files: LoadedFile[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  accept?: FileKind[];
  label?: React.ReactNode;
  hint?: React.ReactNode;
}

export const PdfDropzone: React.FC<PdfDropzoneProps> = ({
  onFiles,
  multiple,
  disabled,
  accept = ['pdf'],
  label,
  hint,
}) => {
  const [rejected, setRejected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const handle = async (files: File[]) => {
    setBusy(true);
    const results = await Promise.allSettled(
      files.map((f) => loadFile(f, accept)),
    );
    setBusy(false);
    const ok: LoadedFile[] = [];
    const errors: string[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') ok.push(r.value);
      else errors.push(toToolError(r.reason).message);
    }
    setRejected(errors);
    for (const f of ok) {
      if (isOverSoftLimit(f.size))
        notify.info(
          `${f.name} is ${formatBytes(f.size)}. Large files may be slow.`,
        );
    }
    if (ok.length) onFiles(ok);
  };

  return (
    <div className="flex flex-col gap-3">
      <FileUpload
        onFiles={handle}
        accept={acceptAttribute(accept)}
        multiple={multiple}
        disabled={disabled || busy}
        label={
          label ??
          (multiple
            ? `Drop ${describeKinds(accept)} files or click to browse`
            : `Drop a ${describeKinds(accept)} or click to browse`)
        }
        hint={hint ?? 'Files never leave your browser'}
      />
      {rejected.length > 0 && (
        <Alert status="danger">
          <AlertTitle>
            {rejected.length === 1
              ? 'A file was skipped'
              : `${rejected.length} files were skipped`}
          </AlertTitle>
          {rejected.map((m) => (
            <AlertDescription key={m}>{m}</AlertDescription>
          ))}
        </Alert>
      )}
    </div>
  );
};
```

> The dropzone only checks the file signature. Encrypted or damaged PDFs are reported by the tool when it calls `loadPdf` or `usePdfDocument`, through the same error UI.

`src/pdf/components/PageThumb.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from '@/shared/ui';
import { cn } from '@/lib/utils';
import { usePageBitmap, type PageInfo } from '@/pdf/render';
import type { Rotation } from '@/pdf/edit';

const rotationClass: Record<Rotation, string> = {
  0: '',
  90: 'rotate-90',
  180: 'rotate-180',
  270: '-rotate-90',
};

interface PageThumbProps {
  docId: string;
  pageIndex: number;
  page: PageInfo;
  /** CSS px. */
  width: number;
  /** Extra rotation previewed on top of the page's own. */
  rotation?: Rotation;
  label: string;
}

/** Renders only once scrolled near the viewport; keeps pixels after the cache evicts. */
export const PageThumb: React.FC<PageThumbProps> = ({
  docId,
  pageIndex,
  page,
  width,
  rotation = 0,
  label,
}) => {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const pixelWidth = Math.round(width * (window.devicePixelRatio || 1));
  const bitmap = usePageBitmap(docId, pageIndex, pixelWidth, visible);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !bitmap || bitmap.width === 0) return;
    c.width = bitmap.width;
    c.height = bitmap.height;
    c.getContext('2d')?.drawImage(bitmap, 0, 0);
  }, [bitmap]);

  return (
    <div
      ref={box}
      className="flex items-center justify-center overflow-hidden"
      style={{
        width,
        height:
          width * Math.max(page.height / page.width, page.width / page.height),
      }}
    >
      <div
        className={cn(
          'relative bg-white shadow-sm transition-transform',
          rotationClass[rotation],
        )}
        style={{ width, aspectRatio: `${page.width} / ${page.height}` }}
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label={label}
          className="block size-full"
        />
        {!bitmap && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="sm" />
          </div>
        )}
      </div>
    </div>
  );
};
```

`src/pdf/components/PageGrid.tsx`:

```tsx
import React from 'react';
import { cn } from '@/lib/utils';
import type { DocInfo } from '@/pdf/render';
import type { Rotation } from '@/pdf/edit';
import { PageThumb } from './PageThumb';
import { useSortableList } from './useSortableList';

export interface PageTile {
  /** Stable identity across reorders. */
  key: string;
  pageIndex: number;
  rotation: Rotation;
}

interface PageGridProps {
  doc: DocInfo;
  tiles: PageTile[];
  thumbWidth?: number;
  selected?: ReadonlySet<string>;
  onToggle?: (key: string, mods: { shift: boolean; meta: boolean }) => void;
  /** Present → tiles can be dragged, or lifted with Space and moved with arrows. */
  onReorder?: (next: PageTile[]) => void;
  renderActions?: (tile: PageTile, position: number) => React.ReactNode;
}

export const PageGrid: React.FC<PageGridProps> = ({
  doc,
  tiles,
  thumbWidth = 140,
  selected,
  onToggle,
  onReorder,
  renderActions,
}) => {
  const sortRef = useSortableList(tiles, (next) => onReorder?.(next), {
    disabled: !onReorder,
    direction: 'grid',
  });

  return (
    <ul
      ref={sortRef}
      aria-label="Pages"
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${thumbWidth + 24}px, 1fr))`,
      }}
    >
      {tiles.map((tile, position) => {
        const isSelected = selected?.has(tile.key) ?? false;
        return (
          <li
            key={tile.key}
            data-sortable-item
            tabIndex={0}
            aria-selected={onToggle ? isSelected : undefined}
            onClick={(e) =>
              onToggle?.(tile.key, {
                shift: e.shiftKey,
                meta: e.metaKey || e.ctrlKey,
              })
            }
            onKeyDown={(e) => {
              // Space belongs to detent's keyboard reordering when sortable.
              if (
                onToggle &&
                (e.key === 'Enter' || (!onReorder && e.key === ' '))
              ) {
                e.preventDefault();
                onToggle(tile.key, {
                  shift: e.shiftKey,
                  meta: e.metaKey || e.ctrlKey,
                });
              }
            }}
            className={cn(
              'flex flex-col items-center gap-2 rounded-md border p-3 outline-none focus-visible:ring-2 focus-visible:ring-accent',
              onReorder && 'cursor-grab',
              isSelected
                ? 'border-accent bg-accent/5'
                : 'border-line hover:border-line-strong',
            )}
          >
            <PageThumb
              docId={doc.docId}
              pageIndex={tile.pageIndex}
              page={doc.pages[tile.pageIndex]}
              width={thumbWidth}
              rotation={tile.rotation}
              label={`Page ${tile.pageIndex + 1}`}
            />
            <div className="flex w-full items-center justify-between gap-2">
              <span className="font-mono text-xs text-fg-muted">
                {tile.pageIndex + 1}
              </span>
              {renderActions?.(tile, position)}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
```

`src/pdf/components/SortableFileList.tsx`:

```tsx
import React from 'react';
import { GripVertical, X } from 'lucide-react';
import { IconButton } from '@/shared/ui';
import { formatBytes } from '@/shared/lib/format';
import { useSortableList } from './useSortableList';

interface FileItem {
  id: string;
  name: string;
  size: number;
}

interface SortableFileListProps<T extends FileItem> {
  items: T[];
  onReorder: (next: T[]) => void;
  onRemove: (id: string) => void;
  renderExtra?: (item: T) => React.ReactNode;
}

export function SortableFileList<T extends FileItem>({
  items,
  onReorder,
  onRemove,
  renderExtra,
}: SortableFileListProps<T>) {
  const ref = useSortableList(items, onReorder, { direction: 'y' });
  return (
    <ol
      ref={ref}
      aria-label="Files (drag or use Space + arrows to reorder)"
      className="flex flex-col gap-2"
    >
      {items.map((item, i) => (
        <li
          key={item.id}
          data-sortable-item
          tabIndex={0}
          className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <GripVertical
            size={16}
            className="cursor-grab text-fg-faint"
            aria-hidden
          />
          <span className="font-mono text-xs text-fg-subtle">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-fg">{item.name}</p>
            <p className="font-mono text-xs text-fg-muted">
              {formatBytes(item.size)}
            </p>
          </div>
          {renderExtra?.(item)}
          <IconButton
            aria-label={`Remove ${item.name}`}
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.id)}
          >
            <X size={16} />
          </IconButton>
        </li>
      ))}
    </ol>
  );
}
```

> If `IconButton` uses a different prop for its accessible name (check `src/shared/ui/button.tsx`; it "requires a label"), use that prop instead of `aria-label`.

`src/pdf/components/JobPanel.tsx`:

```tsx
import React from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Progress,
  Spinner,
  Text,
} from '@/shared/ui';
import type { JobState } from '@/shared/state/useJob';

interface JobPanelProps {
  job: JobState<unknown>;
  onCancel: () => void;
  runningLabel?: string;
  children?: React.ReactNode;
}

export const JobPanel: React.FC<JobPanelProps> = ({
  job,
  onCancel,
  runningLabel = 'Working',
  children,
}) => {
  if (job.status === 'idle') return null;

  if (job.status === 'running') {
    const p = job.progress;
    return (
      <div className="flex flex-col gap-3 rounded-md border border-line p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Spinner size="sm" />
            <Text size="sm">
              {p
                ? `${p.label ?? runningLabel} · ${p.done} / ${p.total}`
                : `${runningLabel}…`}
            </Text>
          </div>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        {p && <Progress value={p.done} max={p.total} />}
      </div>
    );
  }

  if (job.status === 'error' && job.error) {
    return (
      <Alert status="danger">
        <AlertTitle>That didn't work</AlertTitle>
        <AlertDescription>{job.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (job.status === 'cancelled') {
    return (
      <Alert status="info">
        <AlertDescription>Cancelled.</AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};
```

`src/pdf/components/ResultFiles.tsx`:

```tsx
import React from 'react';
import { Download, FileDown } from 'lucide-react';
import { Button, Text } from '@/shared/ui';
import { saveBlob, saveZip } from '@/shared/lib/download';
import { formatBytes, formatSizeChange } from '@/shared/lib/format';
import { notify } from '@/shared/lib/notify';

export interface ResultFile {
  name: string;
  bytes: Uint8Array;
  detail?: string;
}

interface ResultFilesProps {
  files: ResultFile[];
  /** Shown as a before/after comparison when there is exactly one output. */
  inputSize?: number;
  /** When set and there are several files, offers a ZIP of all of them. */
  zipName?: string;
}

export const ResultFiles: React.FC<ResultFilesProps> = ({
  files,
  inputSize,
  zipName,
}) => {
  const total = files.reduce((n, f) => n + f.bytes.byteLength, 0);
  return (
    <div className="flex flex-col gap-3 rounded-md border border-success/40 bg-success/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text size="sm" weight="semibold">
          {files.length === 1 ? 'Ready' : `${files.length} files ready`} ·{' '}
          {formatBytes(total)}
          {inputSize !== undefined && files.length === 1 && (
            <span className="ml-2 font-mono text-xs text-fg-muted">
              from {formatBytes(inputSize)} (
              {formatSizeChange(inputSize, total)})
            </span>
          )}
        </Text>
        {zipName && files.length > 1 && (
          <Button
            size="sm"
            variant="solid"
            leftIcon={<Download size={14} />}
            onClick={async () => {
              await saveZip(
                files.map((f) => ({ name: f.name, data: f.bytes })),
                zipName,
              );
              notify.success(`Saved ${zipName}`);
            }}
          >
            Download all (ZIP)
          </Button>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {files.map((f) => (
          <li key={f.name} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-fg">{f.name}</p>
              <p className="font-mono text-xs text-fg-muted">
                {formatBytes(f.bytes.byteLength)}
                {f.detail && ` · ${f.detail}`}
              </p>
            </div>
            <Button
              size="sm"
              variant={files.length === 1 ? 'solid' : 'soft'}
              leftIcon={<FileDown size={14} />}
              onClick={() => saveBlob(f.bytes, f.name, 'application/pdf')}
            >
              Download
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

`src/pdf/components/index.ts`:

```ts
export { PdfDropzone } from './PdfDropzone';
export { PageThumb } from './PageThumb';
export { PageGrid, type PageTile } from './PageGrid';
export { SortableFileList } from './SortableFileList';
export { JobPanel } from './JobPanel';
export { ResultFiles, type ResultFile } from './ResultFiles';
export { useSortableList, moveItem } from './useSortableList';
```

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm test src/pdf/components && pnpm typecheck && pnpm lint` → Expected: PASS / exit 0.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/pdf/components
git commit -m "feat(pdf): add dropzone, page grid, sortable list, job and result components

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Rebuild PDF Merger

**Files:**

- Create: `src/tools/pdf-merger/index.ts`, `src/tools/pdf-merger/Tool.tsx`, `test/e2e/pdf-merger.spec.ts`
- Delete: `src/tools/PdfMerger/`, `src/types/PdfMergerTypes.ts`

**Interfaces:**

- Consumes: `PdfDropzone`, `SortableFileList`, `JobPanel`, `ResultFiles` (Task 13); `merge`, `getPageCount`, `parsePageRanges`, `rangesToIndices` (Task 11); `useJob` (Task 6); `deriveFilename` (Task 4); `defineTool` (Task 9)
- Behaviour:
  - Add PDFs (multi), reorder by drag or keyboard, remove.
  - Optional page selection per file (blank = all pages).
  - Merge needs ≥ 2 files.
  - Encrypted or invalid files are rejected when added, with an Alert naming the file.

- [ ] **Step 1: Write the failing e2e** — `test/e2e/pdf-merger.spec.ts`

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

test('merges two PDFs honouring order and page selection', async ({ page }) => {
  await page.goto('/pdf-merger');
  await page
    .locator('input[type=file]')
    .setInputFiles([
      'test/fixtures/generated/text-3.pdf',
      'test/fixtures/generated/text-12.pdf',
    ]);
  await expect(page.getByText('text-12.pdf')).toBeVisible();

  // Move text-12 above text-3 with the keyboard (detent: Space lift, ArrowUp, Space drop).
  const second = page.locator('li[data-sortable-item]', {
    hasText: 'text-12.pdf',
  });
  await second.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(page.locator('li[data-sortable-item]').first()).toContainText(
    'text-12.pdf',
  );

  await page.getByLabel('Pages from text-12.pdf').fill('1-2');
  await page.getByRole('button', { name: 'Merge PDFs' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-12.merged.pdf');
  const doc = await PDFDocument.load(readFileSync((await download.path())!));
  expect(doc.getPageCount()).toBe(2 + 3);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test:e2e pdf-merger` → Expected: FAIL (old UI has no "Pages from" field).

- [ ] **Step 3: Implement**

`src/tools/pdf-merger/index.ts`:

```ts
import { FilePlus } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-merger',
  name: 'PDF Merger',
  description: 'Merge multiple PDF files into a single document',
  icon: FilePlus,
  category: 'pdf',
  version: '2.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
```

`src/tools/pdf-merger/Tool.tsx`:

```tsx
import React, { useState } from 'react';
import { Merge } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  Input,
  Stack,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import type { LoadedFile } from '@/shared/lib/files';
import { toToolError } from '@/shared/lib/errors';
import { deriveFilename } from '@/shared/lib/download';
import { useJob } from '@/shared/state/useJob';
import {
  getPageCount,
  merge,
  parsePageRanges,
  rangesToIndices,
} from '@/pdf/edit';
import {
  JobPanel,
  PdfDropzone,
  ResultFiles,
  SortableFileList,
  type ResultFile,
} from '@/pdf/components';

interface MergeItem extends LoadedFile {
  pageCount: number;
  /** Blank = all pages. 1-based range syntax. */
  pages: string;
}

const PdfMergerTool: React.FC<ToolProps> = () => {
  const [items, setItems] = useState<MergeItem[]>([]);
  const [addErrors, setAddErrors] = useState<string[]>([]);
  const job = useJob(async (ctx, list: MergeItem[]): Promise<ResultFile> => {
    const inputs = list.map((item) => ({
      bytes: item.bytes,
      pages: item.pages.trim()
        ? rangesToIndices(parsePageRanges(item.pages, item.pageCount))
        : undefined,
    }));
    ctx.progress({ done: 0, total: 1, label: 'Merging' });
    const bytes = await merge(inputs);
    const total = inputs.reduce(
      (n, inp, i) => n + (inp.pages?.length ?? list[i].pageCount),
      0,
    );
    return {
      name: deriveFilename(list[0].name, 'merged', 'pdf'),
      bytes,
      detail: `${total} pages`,
    };
  });

  const add = async (files: LoadedFile[]) => {
    job.reset();
    const results = await Promise.allSettled(
      files.map(async (f) => ({
        ...f,
        pageCount: await getPageCount(f.bytes),
        pages: '',
      })),
    );
    const ok: MergeItem[] = [];
    const errors: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') ok.push(r.value);
      else errors.push(`${files[i].name}: ${toToolError(r.reason).message}`);
    });
    setAddErrors(errors);
    setItems((prev) => [...prev, ...ok]);
  };

  const update = (next: MergeItem[]) => {
    job.reset();
    setItems(next);
  };

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          <PdfDropzone multiple onFiles={add} />
          {addErrors.length > 0 && (
            <Alert status="danger">
              {addErrors.map((m) => (
                <AlertDescription key={m}>{m}</AlertDescription>
              ))}
            </Alert>
          )}
          {items.length > 0 && (
            <>
              <Text size="sm" tone="muted">
                Drag files to set the order. Leave pages blank to include the
                whole file, or enter ranges like 1-3, 5.
              </Text>
              <SortableFileList
                items={items}
                onReorder={update}
                onRemove={(id) => update(items.filter((i) => i.id !== id))}
                renderExtra={(item) => (
                  <div className="w-40">
                    <Input
                      value={item.pages}
                      onChange={(pages) =>
                        update(
                          items.map((i) =>
                            i.id === item.id ? { ...i, pages } : i,
                          ),
                        )
                      }
                      placeholder={`All ${item.pageCount} pages`}
                      aria-label={`Pages from ${item.name}`}
                    />
                  </div>
                )}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="solid"
                  leftIcon={<Merge size={16} />}
                  disabled={items.length < 2 || job.status === 'running'}
                  onClick={() => job.run(items)}
                >
                  Merge PDFs
                </Button>
                <Button variant="ghost" onClick={() => update([])}>
                  Clear
                </Button>
              </div>
              {items.length < 2 && (
                <Text size="sm" tone="muted">
                  Add at least two PDFs to merge.
                </Text>
              )}
            </>
          )}
          <JobPanel job={job} onCancel={job.cancel} runningLabel="Merging">
            {job.result && <ResultFiles files={[job.result]} />}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfMergerTool;
```

Delete the old tool:

```bash
git rm -r src/tools/PdfMerger src/types/PdfMergerTypes.ts
```

- [ ] **Step 4: Run tests**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm test:e2e pdf-merger` → Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(pdf-merger): rebuild on shared PDF core with reorder and page selection

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Rebuild PDF Splitter

**Files:**

- Create: `src/tools/pdf-splitter/index.ts`, `src/tools/pdf-splitter/Tool.tsx`, `src/tools/pdf-splitter/store.ts`, `src/tools/pdf-splitter/lib/plan.ts`, `src/tools/pdf-splitter/lib/plan.test.ts`, `test/e2e/pdf-splitter.spec.ts`
- Delete: `src/tools/PdfSplitter/`, `src/types/PdfSplitterTypes.ts`

**Interfaces:**

- Consumes: Tasks 4, 6, 11, 12, 13
- Produces:
  - `type SplitMode = 'ranges' | 'every-n' | 'individual' | 'selection'`
  - `planSplit(mode, { pageCount, rangeText, everyN, selected: number[] }): PageRange[]`. For `selection` this returns a single range list to extract into one file.
  - `useSplitterSettings`, a store-kit store `{ mode, everyN }` persisted under `tool:pdf-splitter`
- Behaviour:
  - The four modes from the old tool are kept.
  - The page grid preview uses real pdf.js thumbnails, selectable in `selection` mode.
  - Results are one file per range, plus a ZIP.

- [ ] **Step 1: Write failing unit test** — `src/tools/pdf-splitter/lib/plan.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { planSplit } from './plan';

const base = {
  pageCount: 5,
  rangeText: '',
  everyN: 2,
  selected: [] as number[],
};

describe('planSplit', () => {
  it('ranges mode parses the text', () => {
    expect(planSplit('ranges', { ...base, rangeText: '1-2, 5' })).toEqual([
      { start: 0, end: 1 },
      { start: 4, end: 4 },
    ]);
  });
  it('every-n chunks', () => {
    expect(planSplit('every-n', base)).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 3 },
      { start: 4, end: 4 },
    ]);
  });
  it('individual makes one range per page', () => {
    expect(planSplit('individual', base)).toHaveLength(5);
  });
  it('selection merges selected pages into contiguous runs, ascending', () => {
    expect(planSplit('selection', { ...base, selected: [4, 0, 1] })).toEqual([
      { start: 0, end: 1 },
      { start: 4, end: 4 },
    ]);
  });
  it('selection with nothing selected is an input error', () => {
    expect(() => planSplit('selection', base)).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: 'Select at least one page',
      }),
    );
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/tools/pdf-splitter` → Expected: FAIL.

- [ ] **Step 3: Implement the logic and store**

`src/tools/pdf-splitter/lib/plan.ts`:

```ts
import { ToolError } from '@/shared/lib/errors';
import { everyNPages, parsePageRanges, type PageRange } from '@/pdf/edit';

export type SplitMode = 'ranges' | 'every-n' | 'individual' | 'selection';

interface PlanInput {
  pageCount: number;
  rangeText: string;
  everyN: number;
  selected: number[];
}

/** For 'selection' the ranges are extracted into ONE file; otherwise one file per range. */
export function planSplit(
  mode: SplitMode,
  { pageCount, rangeText, everyN, selected }: PlanInput,
): PageRange[] {
  switch (mode) {
    case 'ranges':
      return parsePageRanges(rangeText, pageCount);
    case 'every-n':
      return everyNPages(pageCount, everyN);
    case 'individual':
      return everyNPages(pageCount, 1);
    case 'selection': {
      if (selected.length === 0)
        throw new ToolError('INVALID_INPUT', 'Select at least one page');
      const sorted = [...new Set(selected)].sort((a, b) => a - b);
      const runs: PageRange[] = [];
      for (const i of sorted) {
        const last = runs[runs.length - 1];
        if (last && i === last.end + 1) last.end = i;
        else runs.push({ start: i, end: i });
      }
      return runs;
    }
  }
}
```

`src/tools/pdf-splitter/store.ts`:

```ts
import { createToolStore } from '@/shared/state/createToolStore';
import type { SplitMode } from './lib/plan';

export const useSplitterSettings = createToolStore({
  toolId: 'pdf-splitter',
  initial: { mode: 'selection' as SplitMode, everyN: 2 },
  actions: (set) => ({
    setMode: (mode: SplitMode) => set({ mode }),
    setEveryN: (everyN: number) => set({ everyN }),
  }),
});
```

- [ ] **Step 4: Run unit tests**

Run: `pnpm test src/tools/pdf-splitter` → Expected: PASS.

- [ ] **Step 5: Write the failing e2e** — `test/e2e/pdf-splitter.spec.ts`

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';

test('splits by ranges into a zip of documents', async ({ page }) => {
  await page.goto('/pdf-splitter');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-12.pdf');
  await expect(page.getByRole('img', { name: 'Page 1' })).toBeVisible();

  await page.getByRole('tab', { name: 'Page ranges' }).click();
  await page.getByLabel('Ranges').fill('1-3, 10-');
  await page.getByRole('button', { name: 'Split PDF' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all (ZIP)' }).click();
  const zip = unzipSync(readFileSync((await (await downloadPromise).path())!));
  const names = Object.keys(zip).sort();
  expect(names).toEqual(['text-12.pages-1-3.pdf', 'text-12.pages-10-12.pdf']);
  expect(
    (await PDFDocument.load(zip['text-12.pages-10-12.pdf'])).getPageCount(),
  ).toBe(3);
});

test('shows a precise error for a bad range', async ({ page }) => {
  await page.goto('/pdf-splitter');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('tab', { name: 'Page ranges' }).click();
  await page.getByLabel('Ranges').fill('2-9');
  await page.getByRole('button', { name: 'Split PDF' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Page 9 is out of range (1–3)',
  );
});
```

- [ ] **Step 6: Implement the tool**

`src/tools/pdf-splitter/index.ts`:

```ts
import { Scissors } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-splitter',
  name: 'PDF Splitter',
  description: 'Split PDF files into multiple documents by pages or ranges',
  icon: Scissors,
  category: 'pdf',
  version: '2.0.0',
  enabled: true,
  load: () => import('./Tool'),
});
```

`src/tools/pdf-splitter/Tool.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import { Scissors } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  Input,
  Label,
  NumberInput,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import type { LoadedFile } from '@/shared/lib/files';
import { deriveFilename } from '@/shared/lib/download';
import { useJob } from '@/shared/state/useJob';
import { extract, formatRange, rangesToIndices, split } from '@/pdf/edit';
import { usePdfDocument } from '@/pdf/render';
import {
  JobPanel,
  PageGrid,
  PdfDropzone,
  ResultFiles,
  type PageTile,
  type ResultFile,
} from '@/pdf/components';
import { planSplit, type SplitMode } from './lib/plan';
import { useSplitterSettings } from './store';

const MODES: { value: SplitMode; label: string }[] = [
  { value: 'selection', label: 'Select pages' },
  { value: 'ranges', label: 'Page ranges' },
  { value: 'every-n', label: 'Every N pages' },
  { value: 'individual', label: 'Every page' },
];

const PdfSplitterTool: React.FC<ToolProps> = () => {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [rangeText, setRangeText] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { mode, everyN, setMode, setEveryN } = useSplitterSettings();
  const { doc, loading, error } = usePdfDocument(file);

  const tiles = useMemo<PageTile[]>(
    () =>
      doc
        ? Array.from({ length: doc.pageCount }, (_, i) => ({
            key: String(i),
            pageIndex: i,
            rotation: 0,
          }))
        : [],
    [doc],
  );

  const job = useJob(
    async (
      ctx,
      source: LoadedFile,
      pageCount: number,
    ): Promise<ResultFile[]> => {
      const ranges = planSplit(mode, {
        pageCount,
        rangeText,
        everyN,
        selected: [...selected].map(Number),
      });
      if (mode === 'selection') {
        const indices = rangesToIndices(ranges);
        const label = ranges.map(formatRange).join('_');
        return [
          {
            name: deriveFilename(source.name, `pages-${label}`, 'pdf'),
            bytes: await extract(source.bytes, indices),
            detail: `${indices.length} pages`,
          },
        ];
      }
      ctx.progress({ done: 0, total: ranges.length, label: 'Splitting' });
      const parts = await split(source.bytes, ranges);
      return parts.map((bytes, i) => ({
        name: deriveFilename(
          source.name,
          `pages-${formatRange(ranges[i])}`,
          'pdf',
        ),
        bytes,
        detail: `${ranges[i].end - ranges[i].start + 1} pages`,
      }));
    },
  );

  const pick = (files: LoadedFile[]) => {
    job.reset();
    setSelected(new Set());
    setFile(files[0]);
  };

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          {!file ? (
            <PdfDropzone onFiles={pick} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Text weight="semibold">{file.name}</Text>
              <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
                Choose another file
              </Button>
            </div>
          )}
          {loading && <Text tone="muted">Opening…</Text>}
          {error && (
            <Alert status="danger">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {file && doc && (
            <>
              <Tabs
                value={mode}
                onValueChange={(v) => setMode(v as SplitMode)}
                variant="soft"
              >
                <TabsList>
                  {MODES.map((m) => (
                    <TabsTrigger key={m.value} value={m.value}>
                      {m.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {mode === 'ranges' && (
                <Stack gap="2">
                  <Label htmlFor="split-ranges">Ranges</Label>
                  <Input
                    id="split-ranges"
                    value={rangeText}
                    onChange={setRangeText}
                    placeholder="e.g. 1-3, 4-6, 10-"
                    aria-label="Ranges"
                  />
                  <Text size="sm" tone="muted">
                    Each range becomes its own file. {doc.pageCount} pages in
                    total.
                  </Text>
                </Stack>
              )}
              {mode === 'every-n' && (
                <Stack gap="2">
                  <Label htmlFor="split-every">Pages per file</Label>
                  <NumberInput
                    id="split-every"
                    value={everyN}
                    onValueChange={setEveryN}
                    min={1}
                    max={doc.pageCount}
                  />
                </Stack>
              )}
              {mode === 'individual' && (
                <Text size="sm" tone="muted">
                  Creates {doc.pageCount} single-page files.
                </Text>
              )}
              {mode === 'selection' && (
                <Text size="sm" tone="muted">
                  Click pages to select them. They are extracted into one new
                  PDF ({selected.size} selected).
                </Text>
              )}
              <PageGrid
                doc={doc}
                tiles={tiles}
                selected={mode === 'selection' ? selected : undefined}
                onToggle={mode === 'selection' ? toggle : undefined}
              />
              <Button
                variant="solid"
                leftIcon={<Scissors size={16} />}
                disabled={job.status === 'running'}
                onClick={() => job.run(file, doc.pageCount)}
              >
                Split PDF
              </Button>
            </>
          )}
          <JobPanel job={job} onCancel={job.cancel} runningLabel="Splitting">
            {job.result && (
              <ResultFiles
                files={job.result}
                zipName={
                  file ? deriveFilename(file.name, 'split', 'zip') : 'split.zip'
                }
              />
            )}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfSplitterTool;
```

> Check `Label`'s props in `src/shared/ui/typography.tsx` (it may expect `htmlFor` via `React.LabelHTMLAttributes`) and `TabsTrigger`'s `value` prop in `tabs.tsx`. Adjust prop names to match the kit; do not change the kit.

```bash
git rm -r src/tools/PdfSplitter src/types/PdfSplitterTypes.ts
```

- [ ] **Step 7: Run tests**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm test:e2e pdf-splitter` → Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(pdf-splitter): rebuild with real pdf.js thumbnails, four modes and zip output

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: New tool — Organize Pages

**Files:**

- Create: `src/tools/pdf-organize/index.ts`, `src/tools/pdf-organize/Tool.tsx`, `src/tools/pdf-organize/lib/edits.ts`, `src/tools/pdf-organize/lib/edits.test.ts`, `test/e2e/pdf-organize.spec.ts`

**Interfaces:**

- Consumes: Tasks 6, 11, 12, 13
- Produces:
  - `initialTiles(pageCount): PageTile[]`
  - `rotateTiles(tiles, keys: ReadonlySet<string>, delta: 90 | -90): PageTile[]`
  - `removeTiles(tiles, keys): PageTile[]`
  - `tilesToEdits(tiles): PageEdit[]`
- Behaviour:
  - Drag, or Space + arrows, to reorder.
  - Each tile has rotate left/right and delete actions. Multi-select (click, ctrl/shift-click) gets bulk rotate and delete.
  - Reset restores the original document. Apply downloads the result.
  - At least one page must remain.

- [ ] **Step 1: Write failing unit test** — `src/tools/pdf-organize/lib/edits.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { initialTiles, removeTiles, rotateTiles, tilesToEdits } from './edits';

describe('organize edits', () => {
  it('starts with one unrotated tile per page', () => {
    expect(initialTiles(2)).toEqual([
      { key: 'p0', pageIndex: 0, rotation: 0 },
      { key: 'p1', pageIndex: 1, rotation: 0 },
    ]);
  });
  it('rotates selected tiles and wraps around', () => {
    const t = rotateTiles(initialTiles(2), new Set(['p0']), -90);
    expect(t.map((x) => x.rotation)).toEqual([270, 0]);
    expect(rotateTiles(t, new Set(['p0']), 90)[0].rotation).toBe(0);
  });
  it('removes tiles and converts to page edits in display order', () => {
    const reordered = [...initialTiles(3)].reverse();
    const kept = removeTiles(
      rotateTiles(reordered, new Set(['p0']), 90),
      new Set(['p1']),
    );
    expect(tilesToEdits(kept)).toEqual([
      { source: 2, rotate: 0 },
      { source: 0, rotate: 90 },
    ]);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/tools/pdf-organize` → Expected: FAIL.

- [ ] **Step 3: Implement** — `src/tools/pdf-organize/lib/edits.ts`

```ts
import type { PageEdit, Rotation } from '@/pdf/edit';
import type { PageTile } from '@/pdf/components';

export function initialTiles(pageCount: number): PageTile[] {
  return Array.from({ length: pageCount }, (_, i) => ({
    key: `p${i}`,
    pageIndex: i,
    rotation: 0,
  }));
}

export function rotateTiles(
  tiles: PageTile[],
  keys: ReadonlySet<string>,
  delta: 90 | -90,
): PageTile[] {
  return tiles.map((t) =>
    keys.has(t.key)
      ? {
          ...t,
          rotation: ((((t.rotation + delta) % 360) + 360) % 360) as Rotation,
        }
      : t,
  );
}

export function removeTiles(
  tiles: PageTile[],
  keys: ReadonlySet<string>,
): PageTile[] {
  return tiles.filter((t) => !keys.has(t.key));
}

export function tilesToEdits(tiles: PageTile[]): PageEdit[] {
  return tiles.map((t) => ({ source: t.pageIndex, rotate: t.rotation }));
}
```

Run: `pnpm test src/tools/pdf-organize` → Expected: PASS.

- [ ] **Step 4: Write the failing e2e** — `test/e2e/pdf-organize.spec.ts`

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

test('reorders, rotates and deletes pages', async ({ page }) => {
  await page.goto('/pdf-organize');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  const tiles = page.locator('li[data-sortable-item]');
  await expect(tiles).toHaveCount(3);
  await expect(page.getByRole('img', { name: 'Page 1' })).toBeVisible();

  // Move page 3 to the front with the keyboard.
  await tiles.nth(2).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  await expect(tiles.first()).toContainText('3');

  await page.getByRole('button', { name: 'Rotate page 3 right' }).click();
  await page.getByRole('button', { name: 'Delete page 2' }).click();
  await expect(tiles).toHaveCount(2);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Apply & download' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-3.organized.pdf');
  const doc = await PDFDocument.load(readFileSync((await download.path())!));
  expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([90, 0]);
});

test('handles a 300-page document without rendering every page up front', async ({
  page,
}) => {
  await page.goto('/pdf-organize');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-300.pdf');
  await expect(page.locator('li[data-sortable-item]')).toHaveCount(300);
  await expect(page.getByRole('img', { name: 'Page 1' })).toBeVisible();
  // Thumbnails far below the fold stay as spinners until scrolled into view.
  const rendered = await page.evaluate(
    () =>
      Array.from(
        document.querySelectorAll('canvas[aria-label^="Page"]'),
      ).filter((c) => (c as HTMLCanvasElement).width > 0).length,
  );
  expect(rendered).toBeLessThan(100);
});
```

- [ ] **Step 5: Implement the tool**

`src/tools/pdf-organize/index.ts`:

```ts
import { LayoutGrid } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-organize',
  name: 'Organize PDF Pages',
  description: 'Reorder, rotate and delete pages visually',
  icon: LayoutGrid,
  category: 'pdf',
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
```

`src/tools/pdf-organize/Tool.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { RotateCcw, RotateCw, Trash2, Undo2, Download } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  IconButton,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import type { LoadedFile } from '@/shared/lib/files';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { notify } from '@/shared/lib/notify';
import { useJob } from '@/shared/state/useJob';
import { applyPageEdits } from '@/pdf/edit';
import { usePdfDocument } from '@/pdf/render';
import {
  JobPanel,
  PageGrid,
  PdfDropzone,
  type PageTile,
} from '@/pdf/components';
import {
  initialTiles,
  removeTiles,
  rotateTiles,
  tilesToEdits,
} from './lib/edits';

const OrganizeTool: React.FC<ToolProps> = () => {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [tiles, setTiles] = useState<PageTile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { doc, loading, error } = usePdfDocument(file);

  useEffect(() => {
    setTiles(doc ? initialTiles(doc.pageCount) : []);
    setSelected(new Set());
  }, [doc]);

  const job = useJob(async (_ctx, source: LoadedFile, current: PageTile[]) => {
    const bytes = await applyPageEdits(source.bytes, tilesToEdits(current));
    const name = deriveFilename(source.name, 'organized', 'pdf');
    saveBlob(bytes, name, 'application/pdf');
    notify.success(`Saved ${name}`);
    return name;
  });

  const only = (key: string) => new Set([key]);
  const toggle = (key: string, mods: { shift: boolean; meta: boolean }) =>
    setSelected((prev) => {
      if (!mods.meta && !mods.shift)
        return prev.has(key) && prev.size === 1 ? new Set() : only(key);
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const dirty =
    doc !== null &&
    JSON.stringify(tiles) !== JSON.stringify(initialTiles(doc.pageCount));

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          {!file ? (
            <PdfDropzone onFiles={(f) => setFile(f[0])} />
          ) : (
            <Inline justify="between" align="center" gap="3" wrap>
              <Text weight="semibold">{file.name}</Text>
              <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
                Choose another file
              </Button>
            </Inline>
          )}
          {loading && <Text tone="muted">Opening…</Text>}
          {error && (
            <Alert status="danger">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {file && doc && (
            <>
              <Inline gap="2" wrap align="center">
                <Text size="sm" tone="muted">
                  {tiles.length} of {doc.pageCount} pages · {selected.size}{' '}
                  selected
                </Text>
                <Button
                  size="sm"
                  leftIcon={<RotateCcw size={14} />}
                  disabled={!selected.size}
                  onClick={() => setTiles((t) => rotateTiles(t, selected, -90))}
                >
                  Rotate left
                </Button>
                <Button
                  size="sm"
                  leftIcon={<RotateCw size={14} />}
                  disabled={!selected.size}
                  onClick={() => setTiles((t) => rotateTiles(t, selected, 90))}
                >
                  Rotate right
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  leftIcon={<Trash2 size={14} />}
                  disabled={!selected.size || selected.size >= tiles.length}
                  onClick={() => {
                    setTiles((t) => removeTiles(t, selected));
                    setSelected(new Set());
                  }}
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<Undo2 size={14} />}
                  disabled={!dirty}
                  onClick={() => setTiles(initialTiles(doc.pageCount))}
                >
                  Reset
                </Button>
              </Inline>
              <PageGrid
                doc={doc}
                tiles={tiles}
                selected={selected}
                onToggle={toggle}
                onReorder={setTiles}
                renderActions={(tile) => (
                  <span
                    className="flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconButton
                      aria-label={`Rotate page ${tile.pageIndex + 1} left`}
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        setTiles((t) => rotateTiles(t, only(tile.key), -90))
                      }
                    >
                      <RotateCcw size={12} />
                    </IconButton>
                    <IconButton
                      aria-label={`Rotate page ${tile.pageIndex + 1} right`}
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        setTiles((t) => rotateTiles(t, only(tile.key), 90))
                      }
                    >
                      <RotateCw size={12} />
                    </IconButton>
                    <IconButton
                      aria-label={`Delete page ${tile.pageIndex + 1}`}
                      size="xs"
                      variant="ghost"
                      disabled={tiles.length === 1}
                      onClick={() =>
                        setTiles((t) => removeTiles(t, only(tile.key)))
                      }
                    >
                      <Trash2 size={12} />
                    </IconButton>
                  </span>
                )}
              />
              <Button
                variant="solid"
                leftIcon={<Download size={16} />}
                disabled={job.status === 'running'}
                onClick={() => job.run(file, tiles)}
              >
                Apply & download
              </Button>
            </>
          )}
          <JobPanel
            job={job}
            onCancel={job.cancel}
            runningLabel="Building PDF"
          />
        </Stack>
      </CardBody>
    </Card>
  );
};

export default OrganizeTool;
```

> As in Task 13, use the kit's actual accessible-label prop for `IconButton` if it is not `aria-label`.

- [ ] **Step 6: Run tests**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm test:e2e` → Expected: all PASS (smoke, merger, splitter, organize).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(pdf-organize): add visual page organizer (reorder, rotate, delete)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Phase 1 verification and handoff notes

**Files:**

- Modify: `docs/superpowers/specs/2026-10-01-pdf-suite-and-modular-architecture-design.md` (status line only)
- Create: `docs/superpowers/plans/2026-10-01-phase-1-foundation.notes.md`

- [ ] **Step 1: Confirm deleted files are gone and shims are the only legacy paths**

Run:

```bash
ls src/constants.ts src/data src/registry src/tools/PdfMerger src/tools/PdfSplitter 2>&1 | grep -c "No such file"
grep -rn "PdfMergerTypes\|PdfSplitterTypes\|TOOL_IDS" src | wc -l
```

Expected: `5`, then `0`.

- [ ] **Step 2: Full verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`
Expected: every command exits 0. Record the test counts in the notes file.

- [ ] **Step 3: Manual browser pass.** Run `pnpm dev`.
  - Dashboard: shows "Organize PDF Pages" with a NEW badge.
  - Merger: merge two fixtures.
  - Splitter: all four modes work.
  - Organize: reorder, rotate and delete work on `text-300.pdf`, and scrolling stays smooth.
  - Encrypted file: drop `makeEncryptMarkedPdf` output. Generate it with `pnpm tsx -e "import('./test/fixtures/builders.ts').then(async m => require('fs').writeFileSync('enc.pdf', await m.makeEncryptMarkedPdf()))"`. Each tool must show the ENCRYPTED message. Delete `enc.pdf` afterwards.

- [ ] **Step 4: Write notes** — `docs/superpowers/plans/2026-10-01-phase-1-foundation.notes.md`

Record:

- Test counts from Step 2.
- Any deviation from this plan, and why: kit prop-name adjustments, the pdf.js worker spike outcome, the store-kit key format.
- Temporary shims still present: `src/components/ui/index.ts`, `src/hooks/useClipboard.tsx`, `src/types/ToolTypes.ts`. Phase 4 removes them.
- An upstream suggestion for `@arshad-shah/detent-react`: offer an option to revert the DOM move in `onSort`, so React consumers don't need `restoreDomOrder`.

- [ ] **Step 5: Update spec status** to `Phase 1 implemented on feat/pdf-suite-foundation`, then commit.

```bash
git add docs
git commit -m "docs: record phase 1 verification notes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
