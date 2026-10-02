/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeviceFrame } from './device-frame';

const viewport = () =>
  screen.getByRole('figure').querySelector<HTMLElement>('[data-viewport]')!;

describe('DeviceFrame', () => {
  it('phone is 390 by 844 and labels its size', () => {
    render(
      <DeviceFrame preset="phone">
        <p>Page</p>
      </DeviceFrame>,
    );
    expect(
      screen.getByRole('figure', { name: 'Phone, 390 by 844' }),
    ).toBeTruthy();
    expect(screen.getByText('Phone, 390 by 844')).toBeTruthy();
    expect(viewport().style.width).toBe('390px');
    expect(viewport().style.height).toBe('844px');
    expect(viewport().textContent).toBe('Page');
  });

  it('has tablet and desktop presets', () => {
    const { rerender } = render(<DeviceFrame preset="tablet">x</DeviceFrame>);
    expect(
      screen.getByRole('figure', { name: 'Tablet, 820 by 1180' }),
    ).toBeTruthy();
    expect(viewport().style.height).toBe('1180px');
    rerender(<DeviceFrame preset="desktop">x</DeviceFrame>);
    expect(
      screen.getByRole('figure', { name: 'Desktop, 1280 by 800' }),
    ).toBeTruthy();
    expect(viewport().style.width).toBe('1280px');
  });

  it('takes a custom size', () => {
    render(<DeviceFrame preset={{ width: 600, height: 400 }}>x</DeviceFrame>);
    expect(
      screen.getByRole('figure', { name: 'Custom, 600 by 400' }),
    ).toBeTruthy();
    expect(viewport().style.width).toBe('600px');
  });
});
