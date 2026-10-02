/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BitmapCanvas } from './bitmap-canvas';
import { ColorInput } from './color-input';
import { DateInput } from './date-input';
import { Image } from './image';
import { PaintCanvas } from './paint-canvas';
import { Positioned, Sized } from './positioned';
import { SignaturePad } from './signature-pad';

const ctx = {
  drawImage: vi.fn(),
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  stroke: vi.fn(),
  lineWidth: 0,
  lineCap: '',
  lineJoin: '',
  strokeStyle: '',
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  vi.stubGlobal(
    'Path2D',
    class {
      constructor(public d: string) {}
    },
  );
  Object.values(ctx).forEach((v) => typeof v === 'function' && v.mockClear());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const bitmap = (w = 10, h = 20) => ({ width: w, height: h }) as ImageBitmap;

describe('BitmapCanvas', () => {
  it('draws each new bitmap once and marks the canvas rendered', () => {
    const onDrawn = vi.fn();
    const b = bitmap();
    const { rerender } = render(
      <BitmapCanvas bitmap={b} width={50} label="Page 1" onDrawn={onDrawn} />,
    );
    const canvas = screen.getByRole('img', { name: 'Page 1' });
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(canvas.dataset.rendered).toBe('true');
    expect(onDrawn).toHaveBeenCalledTimes(1);
    rerender(
      <BitmapCanvas bitmap={b} width={50} label="Page 1" onDrawn={onDrawn} />,
    );
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });
  it('keeps its pixels when the bitmap becomes null', () => {
    const { rerender } = render(
      <BitmapCanvas bitmap={bitmap()} width={50} label="p" />,
    );
    rerender(<BitmapCanvas bitmap={null} width={50} label="p" />);
    const canvas = screen.getByRole('img', { name: 'p' }) as HTMLCanvasElement;
    expect(canvas.width).toBe(10);
    expect(canvas.dataset.rendered).toBe('true');
  });
  it('frees its backing store on release', () => {
    const { rerender } = render(
      <BitmapCanvas bitmap={bitmap()} width={50} label="p" />,
    );
    rerender(<BitmapCanvas bitmap={bitmap()} width={50} label="p" release />);
    const canvas = screen.getByRole('img', { name: 'p' }) as HTMLCanvasElement;
    expect(canvas.width).toBe(0);
    expect(canvas.dataset.rendered).toBeUndefined();
  });
});

describe('Image', () => {
  it('revokes its object URL on unmount', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:one');
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const { unmount } = render(
      <Image src={new Uint8Array([1, 2])} mime="image/png" alt="A photo" />,
    );
    expect(create).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('img', { name: 'A photo' }).getAttribute('src'),
    ).toBe('blob:one');
    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:one');
  });
  it('renders a decorative image with empty alt', () => {
    const { container } = render(<Image src="/x.png" decorative />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('alt')).toBe('');
    expect(img?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('ColorInput', () => {
  it('reports valid hex only', () => {
    const onChange = vi.fn();
    render(<ColorInput label="Ink" value="#000000" onChange={onChange} />);
    const field = screen.getByRole('textbox', { name: 'Ink' });
    fireEvent.change(field, { target: { value: '#12' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(field.getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(field, { target: { value: '#A1B2C3' } });
    expect(onChange).toHaveBeenCalledWith('#a1b2c3');
  });
  it('reports the native picker value', () => {
    const onChange = vi.fn();
    render(<ColorInput label="Ink" value="#000000" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Ink picker'), {
      target: { value: '#ff0000' },
    });
    expect(onChange).toHaveBeenCalledWith('#ff0000');
  });
});

describe('DateInput', () => {
  it('is a labelled date field', () => {
    const onChange = vi.fn();
    render(<DateInput label="Start" value="2026-10-01" onChange={onChange} />);
    const field = screen.getByLabelText('Start');
    expect(field.getAttribute('type')).toBe('date');
    fireEvent.change(field, { target: { value: '2026-10-02' } });
    expect(onChange).toHaveBeenCalledWith('2026-10-02');
  });
});

describe('SignaturePad', () => {
  it('emits one stroke with at least two points per pointer gesture', () => {
    const onChange = vi.fn();
    render(
      <SignaturePad value={[]} onChange={onChange} label="Draw" ink="#000" />,
    );
    const pad = screen.getByRole('img', { name: 'Draw' });
    fireEvent.pointerDown(pad, { clientX: 1, clientY: 1, button: 0 });
    fireEvent.pointerMove(pad, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(pad, { clientX: 20, clientY: 15 });
    fireEvent.pointerUp(pad);
    expect(onChange).toHaveBeenCalledTimes(1);
    const strokes = onChange.mock.calls[0][0];
    expect(strokes).toHaveLength(1);
    expect(strokes[0].length).toBeGreaterThanOrEqual(2);
  });
  it('ignores input while disabled', () => {
    const onChange = vi.fn();
    render(
      <SignaturePad
        value={[]}
        onChange={onChange}
        label="Draw"
        ink="#000"
        disabled
      />,
    );
    const pad = screen.getByRole('img', { name: 'Draw' });
    fireEvent.pointerDown(pad, { clientX: 1, clientY: 1, button: 0 });
    fireEvent.pointerUp(pad);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('PaintCanvas', () => {
  it('can be decorative', () => {
    const { container } = render(<PaintCanvas decorative paint={() => {}} />);
    expect(container.querySelector('canvas')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});

describe('Positioned and Sized', () => {
  it('place and size boxes from data', () => {
    render(
      <Sized width={100} aspect={2} data-testid="sized">
        <Positioned x={3} y={4} width={5} height={6} data-testid="pos" />
      </Sized>,
    );
    const pos = screen.getByTestId('pos');
    expect(pos.style.left).toBe('3px');
    expect(pos.style.top).toBe('4px');
    expect(pos.style.width).toBe('5px');
    expect(screen.getByTestId('sized').style.width).toBe('100px');
  });
});
