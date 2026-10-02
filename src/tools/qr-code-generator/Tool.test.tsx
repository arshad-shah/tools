/** @vitest-environment jsdom */
import { act, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toolsAccepting } from '@/app/registry';
import { putHandoff } from '@/shared/lib/handoff';
import { qrSettings } from './settings';
import QrCodeGenerator from './Tool';

vi.mock('@/shared/ui/adapters/QrCode', () => ({ QrCode: () => null }));
vi.mock('./components/ScanCheck', () => ({ ScanCheck: () => null }));

const COLORS_MIME = 'application/vnd.tools.colors+json';

beforeEach(() => {
  localStorage.clear();
  renderHook(() => qrSettings.useSettings()).result.current[2]();
});
afterEach(() => window.history.replaceState(null, '', '/'));

function openWith(text: string) {
  const id = putHandoff({
    kind: 'text',
    mime: COLORS_MIME,
    text,
    sourceTool: 'color-tester',
  });
  window.history.replaceState(null, '', `/web/qr?handoff=${id}`);
  render(
    <MemoryRouter>
      <QrCodeGenerator />
    </MemoryRouter>,
  );
}

describe('QR Code Generator colours hand-off (Color "Use colours in QR")', () => {
  it('is listed for the colours mime', () => {
    expect(toolsAccepting(COLORS_MIME).map((t) => t.id)).toContain(
      'qr-code-generator',
    );
  });

  it('takes {fg, bg} into the style and shows the Style pane', async () => {
    openWith(JSON.stringify({ fg: '#112233', bg: '#fafafa' }));
    await act(async () => {});
    const s = qrSettings.getSettings();
    expect(s.fg).toBe('#112233');
    expect(s.bg).toBe('#fafafa');
    expect(
      screen.getByRole('tab', { name: 'Style' }).getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('ignores values that are not hex colours', async () => {
    const before = qrSettings.getSettings();
    openWith(JSON.stringify({ fg: 'red', bg: 42 }));
    await act(async () => {});
    expect(qrSettings.getSettings().fg).toBe(before.fg);
    expect(qrSettings.getSettings().bg).toBe(before.bg);
  });
});
