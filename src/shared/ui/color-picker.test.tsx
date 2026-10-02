/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatColor, gamutMap, parseColor } from '@/shared/lib/colour';
import { ColorPicker, type ColorPickerProps } from './color-picker';
import { colorToState, hsvToColor, stateToColor } from './color-picker-model';

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

  it('alpha slider changes show in the RGB output', async () => {
    const spy = vi.fn();
    render(<Harness value="#336699" alpha onChangeSpy={spy} />);
    fireEvent.click(screen.getByRole('radio', { name: 'RGB' }));
    expect(spy).toHaveBeenLastCalledWith('rgb(51 102 153)', expect.any(Object));
    fireEvent.change(screen.getByRole('slider', { name: 'Alpha' }), {
      target: { value: '50' },
    });
    expect(spy).toHaveBeenLastCalledWith(
      'rgb(51 102 153 / 0.5)',
      expect.objectContaining({ alpha: 0.5 }),
    );
    expect(
      (screen.getByLabelText('Colour value') as HTMLInputElement).value,
    ).toBe('rgb(51 102 153 / 0.5)');
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
