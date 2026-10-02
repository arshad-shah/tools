/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FRAME_HINT, PhotoCamera } from './PhotoCamera';

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  const track = {
    stop: vi.fn(),
    getCapabilities: () => ({}),
    getSettings: () => ({ deviceId: 'cam' }),
  };
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [track],
        getVideoTracks: () => [track],
      }),
      enumerateDevices: vi.fn().mockResolvedValue([]),
    },
  });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'mediaDevices');
  vi.restoreAllMocks();
});

describe('PhotoCamera', () => {
  it('shows a framing guide over the live camera', async () => {
    render(<PhotoCamera onCapture={() => {}} />);
    expect(screen.queryByText(FRAME_HINT)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await act(async () => {});
    expect(screen.getByText(FRAME_HINT)).toBeTruthy();
  });
});
