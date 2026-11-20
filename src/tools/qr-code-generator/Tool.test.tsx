/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toolsAccepting } from '@/app/registry';
import { putHandoff } from '@/shared/lib/handoff';
import { qrSettings } from './settings';
import QrCodeGenerator from './Tool';

vi.mock('./lib/render', () => ({
  qrSvg: async () => '<svg xmlns="http://www.w3.org/2000/svg"/>',
  svgToPng: async () => new Blob([]),
}));
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

  it('takes {fg, bg} into the style shown beside the content', async () => {
    openWith(JSON.stringify({ fg: '#112233', bg: '#fafafa' }));
    await act(async () => {});
    const s = qrSettings.getSettings();
    expect(s.fg).toBe('#112233');
    expect(s.bg).toBe('#fafafa');
    expect(screen.getByRole('region', { name: 'Style' })).toBeTruthy();
    expect(
      screen
        .getByRole('radio', { name: 'One code' })
        .getAttribute('aria-checked') ??
        (screen.getByRole('radio', { name: 'One code' }) as HTMLInputElement)
          .checked,
    ).toBeTruthy();
  });

  it('ignores values that are not hex colours', async () => {
    const before = qrSettings.getSettings();
    openWith(JSON.stringify({ fg: 'red', bg: 42 }));
    await act(async () => {});
    expect(qrSettings.getSettings().fg).toBe(before.fg);
    expect(qrSettings.getSettings().bg).toBe(before.bg);
  });
});

describe('QR Code Generator layout', () => {
  const renderTool = () =>
    render(
      <MemoryRouter>
        <QrCodeGenerator />
      </MemoryRouter>,
    );

  it('shows Export and the encoded text only once there is something to encode', async () => {
    renderTool();
    await act(async () => {});
    const url = screen.getByRole('textbox', { name: 'URL' });
    await act(async () => {
      fireEvent.change(url, { target: { value: '' } });
    });
    expect(screen.getByText('Nothing to encode yet')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Export' })).toBeNull();
    expect(screen.queryByRole('figure', { name: 'Encoded text' })).toBeNull();
    await act(async () => {
      fireEvent.change(url, { target: { value: 'https://example.org' } });
    });
    expect(screen.getByRole('region', { name: 'Export' })).toBeTruthy();
  });

  it('keeps the rarely changed style options in More options', async () => {
    renderTool();
    await act(async () => {});
    const more = screen.getByRole('button', { name: 'More options' });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(more);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(
      screen.getByRole('radiogroup', { name: 'Preview render' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('combobox', { name: 'Error correction' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: 'Quiet zone (4 modules)' }),
    ).toBeTruthy();
  });
});
