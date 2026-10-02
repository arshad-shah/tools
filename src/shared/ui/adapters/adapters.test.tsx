/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { resetThemeForTests } from '@/shared/lib/theme';

const received: Record<string, unknown> = {};

vi.mock('qrcode.react', () => ({
  QRCodeSVG: (props: Record<string, unknown>) => {
    received.qr = { ...props, kind: 'svg' };
    return null;
  },
  QRCodeCanvas: (props: Record<string, unknown>) => {
    received.qr = { ...props, kind: 'canvas' };
    return null;
  },
}));

const { QrCode } = await import('./QrCode');
const { RivePlayer } = await import('./RivePlayer');

afterEach(() => {
  resetThemeForTests();
  localStorage.clear();
});

describe('kit adapters', () => {
  it('QrCode renders the chosen format with a name', () => {
    render(
      <QrCode
        value="hi"
        size={128}
        level="M"
        fg="#000000"
        bg="#ffffff"
        label="QR code for hi"
        format="canvas"
      />,
    );
    expect(screen.getByRole('img', { name: 'QR code for hi' })).toBeTruthy();
    expect(received.qr).toMatchObject({
      kind: 'canvas',
      fgColor: '#000000',
      level: 'M',
    });
  });
  it('RivePlayer owns a labelled canvas and forwards its ref', () => {
    const ref = { current: null as HTMLCanvasElement | null };
    render(<RivePlayer ref={ref} label="Animation" background="white" />);
    expect(screen.getByRole('img', { name: 'Animation' })).toBe(ref.current);
  });
});
