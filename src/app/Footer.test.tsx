/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IconBox } from '@/shared/ui/icons';
import Footer from './Footer';
import { formatBuildStamp } from './footerUtils';
import { getEnabledTools } from './registry';
import type { ToolDefinition } from './tool';

const REPO = 'https://github.com/arshad-shah/tools';

const tool: ToolDefinition = {
  id: 'pdf-merger',
  name: 'PDF Merger',
  description: 'Merge PDFs',
  icon: IconBox,
  enabled: true,
  category: 'pdf',
  slug: 'merge',
  kind: 'quick-task',
  keywords: ['combine', 'join', 'pdf'],
};

describe('Footer', () => {
  it('shows tool count and the local-processing note', () => {
    render(<Footer />);
    expect(screen.getByText(`${getEnabledTools().length} tools`)).toBeTruthy();
    expect(
      screen.getByText(
        /Your files are processed on this device and never uploaded/,
      ),
    ).toBeTruthy();
  });

  it('links issues without a tool context, name starting with the visible text', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: 'issues: report a problem' });
    expect(link.getAttribute('href')).toBe(`${REPO}/issues/new`);
    expect(link.textContent).toBe('issues');
  });

  it('prefills the issue title with the tool id', () => {
    render(<Footer tool={tool} />);
    const href = screen
      .getByRole('link', { name: 'issues: report a problem with PDF Merger' })
      .getAttribute('href');
    expect(href).not.toBeNull();
    const url = new URL(href ?? '');
    expect(url.pathname).toBe('/arshad-shah/tools/issues/new');
    expect(url.searchParams.get('title')).toBe('[pdf-merger] ');
  });

  describe('production build stamp', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    });

    it('links the commit and keeps separators decorative', () => {
      vi.stubEnv('DEV', false);
      vi.stubGlobal('__BUILD_SHA__', 'a1b2c3d');
      vi.stubGlobal('__BUILD_DATE__', '2026-10-01');
      render(<Footer />);
      const link = screen.getByRole('link', {
        name: 'Build a1b2c3d on GitHub',
      });
      expect(link.getAttribute('href')).toBe(`${REPO}/commit/a1b2c3d`);
      expect(screen.getByText(/v2026\.10\.01/)).toBeTruthy();
    });
  });

  it('separates items with decorative elements, never characters', () => {
    const { container } = render(<Footer />);
    const seps = container.querySelectorAll('[data-separator]');
    expect(seps.length).toBeGreaterThanOrEqual(3);
    for (const sep of seps) {
      expect(sep.getAttribute('aria-hidden')).toBe('true');
      expect(sep.textContent).toBe('');
    }
  });

  it('offers the theme switch', () => {
    render(<Footer />);
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeTruthy();
  });

  it('links the source to the repo', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: /view source/i });
    expect(link.getAttribute('href')).toBe(REPO);
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });
});

describe('formatBuildStamp', () => {
  it('renders dev in dev mode', () => {
    expect(formatBuildStamp('abc1234', '2026-10-01', true)).toEqual({
      label: 'dev',
      href: null,
      sha: null,
      version: null,
    });
  });

  it('renders dev when the sha is empty', () => {
    expect(formatBuildStamp('', '2026-10-01', false).label).toBe('dev');
    expect(formatBuildStamp('', '2026-10-01', false).href).toBeNull();
  });

  it('renders version and commit link for a real sha', () => {
    expect(formatBuildStamp('a1b2c3d', '2026-10-01', false)).toEqual({
      label: 'v2026.10.01 · a1b2c3d',
      href: `${REPO}/commit/a1b2c3d`,
      sha: 'a1b2c3d',
      version: 'v2026.10.01',
    });
  });
});
