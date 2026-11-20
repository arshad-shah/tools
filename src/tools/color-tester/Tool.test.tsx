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

// ColorField reads typed text on Enter or when the field is left.
const anyField = () => screen.getByRole('textbox', { name: 'Base colour' });
const typeColour = (field: HTMLElement, value: string) => {
  fireEvent.change(field, { target: { value } });
  fireEvent.keyDown(field, { key: 'Enter' });
};
/** The text a format's Copy button puts on the clipboard. */
const copied = async (label: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Copy ${label}` }));
  await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
  return writeText.mock.calls.at(-1)?.[0];
};

describe('Color & Contrast', () => {
  it('has one entry point for the base colour, beside formats and contrast', () => {
    renderTool();
    expect(
      screen.getAllByRole('textbox', { name: 'Base colour' }),
    ).toHaveLength(1);
    const colour = screen.getByRole('region', { name: 'Colour' });
    expect(
      within(colour).getByRole('button', { name: 'Copy Hex' }),
    ).toBeTruthy();
    const contrast = screen.getByRole('region', { name: 'Contrast' });
    expect(
      within(contrast).getByRole('group', { name: 'WCAG 2.2 results' }),
    ).toBeTruthy();
  });

  it('reads any CSS colour: hsl(120 100% 25%) is #008000, named green', async () => {
    renderTool();
    typeColour(anyField(), 'hsl(120 100% 25%)');
    expect(await copied('Hex')).toBe('#008000');
    expect(screen.getByText('Named colour: green (exact match)')).toBeTruthy();
  });

  it('shows an inline error for text that is not a colour', () => {
    renderTool();
    typeColour(anyField(), 'not a colour');
    expect(anyField().getAttribute('aria-invalid')).toBe('true');
  });

  it('copies every format with its own button', async () => {
    renderTool();
    typeColour(anyField(), '#3366cc');
    for (const { label } of FORMATS) {
      const n = writeText.mock.calls.length;
      fireEvent.click(screen.getByRole('button', { name: `Copy ${label}` }));
      await vi.waitFor(() => expect(writeText.mock.calls.length).toBe(n + 1));
      // The copied text is the one shown in that row.
      expect(
        screen.getAllByText(writeText.mock.calls[n][0]).length,
      ).toBeGreaterThan(0);
    }
    expect(writeText).toHaveBeenCalledTimes(FORMATS.length);
    expect(writeText.mock.calls[0][0]).toBe('#3366cc');
  });

  it('checks contrast and applies a passing suggestion', () => {
    renderTool();
    typeColour(screen.getByRole('textbox', { name: 'Background' }), '#ffffff');
    typeColour(screen.getByRole('textbox', { name: 'Foreground' }), '#777');
    const results = screen.getByRole('group', { name: 'WCAG 2.2 results' });
    expect(within(results).getByText('AA large: pass')).toBeTruthy();
    expect(within(results).getByText('AA normal: fail')).toBeTruthy();
    expect(screen.getByText('4.48:1')).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'Suggest passing foreground' }),
    );
    expect(within(results).getByText('AA normal: pass')).toBeTruthy();
    // Once the pair passes there is nothing to suggest, so no buttons.
    expect(
      screen.queryByRole('button', { name: /^Suggest passing/ }),
    ).toBeNull();
    expect(screen.getByText(/nothing to suggest/)).toBeTruthy();
  });

  it('offers the export source only once the working palette has colours', () => {
    renderTool();
    expect(
      screen.queryByRole('radiogroup', { name: 'Export source' }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add base colour' }));
    expect(
      screen.getByRole('radiogroup', { name: 'Export source' }),
    ).toBeTruthy();
  });

  it('simulates colour vision on the samples and swatches', () => {
    renderTool();
    expect(screen.getByText('As picked')).toBeTruthy();
    const scale = screen.getByRole('radiogroup', {
      name: 'Tonal scale 50 to 950',
    });
    expect(
      within(scale).queryAllByRole('radio', { name: /protan/ }),
    ).toHaveLength(0);
    fireEvent.click(
      screen.getByRole('combobox', { name: 'Simulate colour vision' }),
    );
    fireEvent.click(screen.getByRole('option', { name: 'Protan' }));
    expect(screen.getByText('As seen with protan colour vision')).toBeTruthy();
    expect(
      within(scale).getAllByRole('radio', { name: /as seen with protan/ }),
    ).toHaveLength(11);
  });

  it('picks a scale step as the base colour', async () => {
    renderTool();
    typeColour(anyField(), '#3366cc');
    const scale = screen.getByRole('radiogroup', {
      name: 'Tonal scale 50 to 950',
    });
    fireEvent.click(within(scale).getAllByRole('radio')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Use as base' }));
    const hex = await copied('Hex');
    expect(hex).not.toBe('#3366cc');
    expect(
      within(scale).getAllByRole('radio')[0].getAttribute('aria-label'),
    ).toMatch(/^50 /);
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
    renderTool();
    expect(screen.getByText('Loaded from a shared link')).toBeTruthy();
    expect(anyField()).toHaveProperty('value', '#ff0000');
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
    expect(screen.getByText('Mine')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Mine' }));
    expect(screen.queryByText('Mine')).toBeNull();
    expect(screen.getByText(/No saved palettes yet/)).toBeTruthy();
  });
});
