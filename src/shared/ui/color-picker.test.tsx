/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatColor, gamutMap, parseColor } from '@/shared/lib/colour';
import { ColorPicker, type ColorPickerProps } from './color-picker';
import {
  channelsOf,
  colorFromChannels,
  colorToState,
  hsvToColor,
  stateToColor,
  type ChannelFormat,
} from './color-picker-model';

type Props = Partial<ColorPickerProps> & {
  onChangeSpy?: ColorPickerProps['onChange'];
};

function Harness({ onChangeSpy, value: initial = '#336699', ...rest }: Props) {
  const [value, setValue] = useState(initial);
  return (
    <ColorPicker
      label="Ink"
      recent={[]}
      {...rest}
      value={value}
      onChange={(css, c) => {
        setValue(css);
        onChangeSpy?.(css, c);
      }}
    />
  );
}

afterEach(() => {
  delete (window as unknown as { EyeDropper?: unknown }).EyeDropper;
});

describe('ColorPicker', () => {
  it('typing any CSS colour emits the hex-normalised colour', async () => {
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);
    const field = screen.getByLabelText('Colour value');
    fireEvent.change(field, { target: { value: 'oklch(70% 0.1 200)' } });
    const expected = formatColor(
      gamutMap(parseColor('oklch(70% 0.1 200)')),
      'hex',
    );
    expect(spy).toHaveBeenLastCalledWith(expected, expect.any(Object));
  });

  it('invalid text shows the parseColor error inline', async () => {
    render(<Harness />);
    const field = screen.getByLabelText('Colour value');
    fireEvent.change(field, { target: { value: 'nope' } });
    expect(field).toHaveProperty('ariaInvalid', 'true');
    const message = (() => {
      try {
        parseColor('nope');
        return '';
      } catch (e) {
        return (e as Error).message;
      }
    })();
    expect(screen.getByText(message)).toBeTruthy();
  });

  it('ArrowRight on the area raises saturation by 1 percent', () => {
    // hsv(210, 50%, 60%)
    const start = formatColor(hsvToColor(210, 0.5, 0.6), 'hex');
    const spy = vi.fn();
    render(<Harness value={start} onChangeSpy={spy} />);
    const sat = screen.getByRole('slider', { name: 'Saturation' });
    expect(sat.getAttribute('aria-valuetext')).toBe('Saturation 50 percent');
    fireEvent.keyDown(sat, { key: 'ArrowRight' });
    expect(sat.getAttribute('aria-valuetext')).toBe('Saturation 51 percent');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('hue and alpha rails carry aria-valuetext', () => {
    const start = formatColor(hsvToColor(210, 0.5, 0.6), 'hex');
    render(<Harness value={start} alpha />);
    expect(
      screen
        .getByRole('slider', { name: 'Hue' })
        .getAttribute('aria-valuetext'),
    ).toBe('Hue 210 degrees');
    expect(
      screen
        .getByRole('slider', { name: 'Alpha' })
        .getAttribute('aria-valuetext'),
    ).toBe('Alpha 100 percent');
  });

  it('keeps the hue when saturation drops to zero', () => {
    const start = formatColor(hsvToColor(210, 0.05, 0.6), 'hex');
    render(<Harness value={start} />);
    const sat = screen.getByRole('slider', { name: 'Saturation' });
    fireEvent.keyDown(sat, { key: 'Home' });
    fireEvent.keyDown(sat, { key: 'ArrowRight' });
    expect(
      screen
        .getByRole('slider', { name: 'Hue' })
        .getAttribute('aria-valuetext'),
    ).toBe('Hue 210 degrees');
  });

  it('hides the EyeDropper button without the API', () => {
    render(<Harness />);
    expect(
      screen.queryByRole('button', { name: 'Pick a colour from the screen' }),
    ).toBeNull();
  });

  it('emits the EyeDropper result', async () => {
    const open = vi.fn().mockResolvedValue({ sRGBHex: '#123456' });
    (window as unknown as { EyeDropper: unknown }).EyeDropper = class {
      open = open;
    };
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Pick a colour from the screen' }),
    );
    await waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith('#123456', expect.any(Object)),
    );
  });

  it('alpha rail changes show in the RGB output and channels', async () => {
    const spy = vi.fn();
    render(<Harness value="#336699" alpha onChangeSpy={spy} />);
    fireEvent.click(screen.getByRole('radio', { name: 'RGB' }));
    expect(spy).toHaveBeenLastCalledWith('rgb(51 102 153)', expect.any(Object));
    const a = screen.getByRole('slider', { name: 'Alpha' });
    for (let i = 0; i < 5; i++) fireEvent.keyDown(a, { key: 'PageDown' });
    expect(spy).toHaveBeenLastCalledWith(
      'rgb(51 102 153 / 0.5)',
      expect.objectContaining({ alpha: 0.5 }),
    );
    expect(
      (screen.getByRole('spinbutton', { name: 'Alpha' }) as HTMLInputElement)
        .value,
    ).toBe('50');
  });

  it('hue and alpha are dedicated rails, not range inputs', () => {
    const start = formatColor(hsvToColor(210, 0.5, 0.6), 'hex');
    const spy = vi.fn();
    render(<Harness value={start} alpha onChangeSpy={spy} />);
    const hue = screen.getByRole('slider', { name: 'Hue' });
    const alpha = screen.getByRole('slider', { name: 'Alpha' });
    expect(hue.tagName).not.toBe('INPUT');
    expect(alpha.tagName).not.toBe('INPUT');
    fireEvent.keyDown(hue, { key: 'ArrowRight' });
    expect(hue.getAttribute('aria-valuetext')).toBe('Hue 211 degrees');
    fireEvent.keyDown(hue, { key: 'ArrowLeft', shiftKey: true });
    expect(hue.getAttribute('aria-valuetext')).toBe('Hue 201 degrees');
    fireEvent.keyDown(alpha, { key: 'Home' });
    expect(alpha.getAttribute('aria-valuetext')).toBe('Alpha 0 percent');
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('each format tab shows its own channel inputs; hex keeps one field', () => {
    render(<Harness value="#336699" alpha />);
    expect(screen.getByLabelText('Colour value')).toBeTruthy();
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
    const names = (fmt: string) => {
      fireEvent.click(screen.getByRole('radio', { name: fmt }));
      return screen
        .getAllByRole('spinbutton')
        .map((e) => e.getAttribute('aria-label'));
    };
    expect(names('RGB')).toEqual(['Red', 'Green', 'Blue', 'Alpha']);
    expect(screen.queryByLabelText('Colour value')).toBeNull();
    expect(names('HSL')).toEqual(['Hue', 'Saturation', 'Lightness', 'Alpha']);
    expect(names('HWB')).toEqual(['Hue', 'Whiteness', 'Blackness', 'Alpha']);
    expect(names('OKLCH')).toEqual(['Lightness', 'Chroma', 'Hue', 'Alpha']);
  });

  it('typing a channel value emits the colour in that format', () => {
    const spy = vi.fn();
    render(<Harness value="#336699" onChangeSpy={spy} />);
    fireEvent.click(screen.getByRole('radio', { name: 'RGB' }));
    const red = screen.getByRole('spinbutton', { name: 'Red' });
    fireEvent.change(red, { target: { value: '255' } });
    expect(spy).toHaveBeenLastCalledWith(
      'rgb(255 102 153)',
      expect.any(Object),
    );
    // Out-of-range or partial text waits; the field keeps what was typed.
    fireEvent.change(red, { target: { value: '' } });
    expect((red as HTMLInputElement).value).toBe('');
    fireEvent.blur(red);
    expect((red as HTMLInputElement).value).toBe('255');
    fireEvent.click(screen.getByRole('radio', { name: 'HSL' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Lightness' }), {
      target: { value: '0' },
    });
    expect(spy).toHaveBeenLastCalledWith('hsl(0 0% 0%)', expect.any(Object));
  });

  it('the preview shows old and new; old restores the starting colour', () => {
    const spy = vi.fn();
    render(<Harness value="#336699" onChangeSpy={spy} />);
    const restore = screen.getByRole('button', {
      name: 'Restore previous colour #336699',
    });
    expect(restore.hasAttribute('disabled')).toBe(true);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Hue' }), {
      key: 'End',
    });
    expect(restore.hasAttribute('disabled')).toBe(false);
    fireEvent.click(restore);
    expect(spy).toHaveBeenLastCalledWith('#336699', expect.any(Object));
  });

  it('picks from the tool palette and the given recent colours', async () => {
    const spy = vi.fn();
    render(
      <Harness onChangeSpy={spy} palette={['#ff0000']} recent={['#00ff00']} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Use #ff0000' }));
    expect(spy).toHaveBeenLastCalledWith('#ff0000', expect.any(Object));
    fireEvent.click(screen.getByRole('button', { name: 'Use #00ff00' }));
    expect(spy).toHaveBeenLastCalledWith('#00ff00', expect.any(Object));
  });

  it('remembers committed colours in its own recent list', async () => {
    function Own() {
      const [v, setV] = useState('#336699');
      return <ColorPicker label="Own" value={v} onChange={setV} />;
    }
    render(<Own />);
    const field = screen.getByLabelText('Colour value');
    fireEvent.change(field, { target: { value: '#abcdef' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Use #abcdef' })).toBeTruthy();
  });

  it('OKLCH mode maps chroma and lightness and shows a tonal ramp', async () => {
    const spy = vi.fn();
    render(<Harness mode="oklch" showRamp onChangeSpy={spy} />);
    const l = screen.getByRole('slider', { name: 'Lightness' });
    expect(l.getAttribute('aria-valuetext')).toMatch(/^Lightness \d+ percent$/);
    const ramp = screen.getByRole('group', { name: 'Tonal ramp' });
    const steps = ramp.querySelectorAll('button');
    expect(steps).toHaveLength(11);
    fireEvent.click(steps[0]);
    expect(spy).toHaveBeenCalled();
    // The ramp stays anchored after choosing a step.
    expect(
      screen
        .getByRole('group', { name: 'Tonal ramp' })
        .querySelectorAll('button')[0]
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });
});

describe('picker model', () => {
  it('round-trips OKLCH state', () => {
    const c = parseColor('#336699');
    const back = stateToColor(colorToState(c, 'oklch'), 'oklch');
    expect(formatColor(back, 'hex')).toBe('#336699');
  });
});

describe('picker channels', () => {
  const values = (fmt: ChannelFormat, css: string, hue = 0) =>
    channelsOf(parseColor(css), fmt, hue).map((c) => c.value);

  it('reads RGB, HSL, HWB and OKLCH channels', () => {
    expect(values('rgb', '#336699')).toEqual([51, 102, 153]);
    expect(values('hsl', '#ff0000')).toEqual([0, 100, 50]);
    expect(values('hwb', '#808080', 210)).toEqual([210, 50, 50]);
    const [l, c, h] = values('oklch', '#ff0000');
    expect(l).toBeCloseTo(62.8, 1);
    expect(c).toBeCloseTo(0.258, 3);
    expect(h).toBeCloseTo(29.2, 1);
  });

  it('keeps the given hue for a grey', () => {
    expect(values('hsl', '#777777', 123)[0]).toBe(123);
    expect(values('oklch', '#777777', 45)[2]).toBe(45);
  });

  it('labels each channel with its range', () => {
    const rgb = channelsOf(parseColor('#000'), 'rgb', 0);
    expect(rgb.map((c) => c.label)).toEqual(['Red', 'Green', 'Blue']);
    expect(rgb[0]).toMatchObject({ min: 0, max: 255, step: 1 });
    const ok = channelsOf(parseColor('#000'), 'oklch', 0);
    expect(ok.map((c) => c.label)).toEqual(['Lightness', 'Chroma', 'Hue']);
    expect(ok[1]).toMatchObject({ min: 0, max: 0.4, step: 0.001 });
  });

  it('builds a colour from channel values', () => {
    const hex = (fmt: ChannelFormat, v: number[], a = 1) =>
      formatColor(colorFromChannels(fmt, v, a), 'hex');
    expect(hex('rgb', [51, 102, 153])).toBe('#336699');
    expect(hex('hsl', [120, 100, 25])).toBe('#008000');
    expect(hex('hwb', [0, 0, 0])).toBe('#ff0000');
    expect(hex('oklch', [62.8, 0.2577, 29.23])).toBe('#ff0000');
    expect(colorFromChannels('rgb', [0, 0, 0], 0.5).alpha).toBe(0.5);
  });
});
