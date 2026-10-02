// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeShare } from '@/shared/lib/share-state';
import ColorTester from './Tool';
import { FORMATS } from './lib/formats';

vi.mock('@/shared/lib/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock('@/shared/workers/image-client', () => ({
  imageClient: () => ({ call: vi.fn(), terminate: vi.fn() }),
}));

const writeText = vi.fn<(t: string) => Promise<void>>();

beforeEach(() => {
  localStorage.clear();
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText, readText: vi.fn() },
  });
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

const renderTool = () =>
  render(
    <MemoryRouter>
      <ColorTester />
    </MemoryRouter>,
  );

const anyField = () => screen.getByRole('textbox', { name: 'Colour value' });

const formatText = (container: HTMLElement, fmt: string) =>
  container.querySelector(`[data-format="${fmt}"]`)?.textContent;

describe('Color & Contrast', () => {
  it('has one entry point for the base colour: the picker', () => {
    renderTool();
    const picker = screen.getByRole('group', { name: 'Base colour' });
    expect(within(picker).getByRole('textbox', { name: 'Colour value' })).toBe(
      anyField(),
    );
    expect(
      screen.queryByRole('textbox', { name: 'Any CSS colour' }),
    ).toBeNull();
    expect(
      screen.getAllByRole('textbox', { name: 'Colour value' }),
    ).toHaveLength(1);
  });

  it('lays out the picker beside formats and contrast on desktop', () => {
    renderTool();
    const columns = screen.getByTestId('color-tester-columns');
    expect(columns.children).toHaveLength(2);
    const [left, right] = Array.from(columns.children);
    expect(
      within(left as HTMLElement).getByRole('group', { name: 'Base colour' }),
    ).toBeTruthy();
    expect(
      within(right as HTMLElement).getByRole('group', {
        name: 'WCAG 2.2 results',
      }),
    ).toBeTruthy();
  });

  it('reads any CSS colour: hsl(120 100% 25%) is #008000, named green', () => {
    const { container } = renderTool();
    fireEvent.change(anyField(), { target: { value: 'hsl(120 100% 25%)' } });
    expect(formatText(container, 'hex')).toBe('#008000');
    expect(screen.getByText('Named colour: green (exact match)')).toBeTruthy();
  });

  it('shows an inline error for text that is not a colour', () => {
    renderTool();
    fireEvent.change(anyField(), { target: { value: 'not a colour' } });
    expect(anyField().getAttribute('aria-invalid')).toBe('true');
  });

  it('copies every format with its own button', async () => {
    const { container } = renderTool();
    fireEvent.change(anyField(), { target: { value: '#3366cc' } });
    for (const { fmt, label } of FORMATS) {
      const expected = formatText(container, fmt);
      expect(expected).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: `Copy ${label}` }));
      await vi.waitFor(() =>
        expect(writeText).toHaveBeenLastCalledWith(expected),
      );
    }
    expect(writeText).toHaveBeenCalledTimes(FORMATS.length);
  });

  it('checks contrast and applies a passing suggestion', () => {
    renderTool();
    fireEvent.change(screen.getByRole('textbox', { name: 'Background' }), {
      target: { value: '#ffffff' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Foreground' }), {
      target: { value: '#777' },
    });
    const results = screen.getByRole('group', { name: 'WCAG 2.2 results' });
    expect(within(results).getByText('AA large: pass')).toBeTruthy();
    expect(within(results).getByText('AA normal: fail')).toBeTruthy();
    expect(screen.getByText('Ratio 4.48:1')).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'Suggest passing foreground' }),
    );
    expect(within(results).getByText('AA normal: pass')).toBeTruthy();
  });

  it('exposes the simulated colour vision as a data attribute', () => {
    const { container } = renderTool();
    const wrapper = () => container.querySelector('[data-cvd]');
    expect(wrapper()?.getAttribute('data-cvd')).toBe('none');
    fireEvent.click(screen.getByRole('radio', { name: 'Protan' }));
    expect(wrapper()?.getAttribute('data-cvd')).toBe('protan');
    fireEvent.click(screen.getByRole('radio', { name: 'Achroma' }));
    expect(wrapper()?.getAttribute('data-cvd')).toBe('achroma');
  });

  it('hydrates from a share link and offers to dismiss the notice', () => {
    const enc = encodeShare(
      {
        colors: { base: '#ff0000', fg: '#000000', bg: '#ffffff' },
        palette: ['#00ff00'],
        scale: { hueShift: 20, chromaCurve: 0.5 },
      },
      1,
    );
    if (!enc.ok) throw new Error('encode failed');
    window.history.replaceState(null, '', `/#${enc.fragment}`);
    const { container } = renderTool();
    expect(screen.getByText('Loaded from a shared link')).toBeTruthy();
    expect(formatText(container, 'hex')).toBe('#ff0000');
    expect(screen.getByText('Hue shift: 20 degrees')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Loaded from a shared link')).toBeNull();
  });

  it('saves, loads and deletes a named palette', () => {
    renderTool();
    fireEvent.click(screen.getByRole('button', { name: 'Add base colour' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Palette name' }), {
      target: { value: 'Mine' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save palette' }));
    const saved = screen.getByRole('list', { name: 'Saved palettes' });
    expect(within(saved).getByText('Mine')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Mine' }));
    expect(screen.queryByRole('list', { name: 'Saved palettes' })).toBeNull();
  });
});
