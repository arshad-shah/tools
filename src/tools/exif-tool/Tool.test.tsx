// @vitest-environment jsdom
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jpegWithMetadata } from '../../../test/fixtures/exif';
import ExifTool from './Tool';

vi.mock('@/shared/lib/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

beforeEach(() => {
  // jsdom has no layout: give the grid a viewport wide enough for all columns.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 2000,
    bottom: 400,
    width: 2000,
    height: 400,
    toJSON: () => ({}),
  } as DOMRect);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const toFile = (bytes: Uint8Array, name: string, type: string) =>
  new File([bytes as Uint8Array<ArrayBuffer>], name, { type });

/**
 * A lone ftyp box with the heic brand. Nothing may follow it: exifr loops
 * forever on a zero-size box after ftyp.
 */
function heicBytes(): Uint8Array {
  const b = new Uint8Array(24);
  const v = new DataView(b.buffer);
  v.setUint32(0, 24);
  b.set(new TextEncoder().encode('ftypheic'), 4);
  b.set(new TextEncoder().encode('mif1heic'), 16);
  return b;
}

function drop(files: File[]) {
  const view = render(
    <MemoryRouter>
      <ExifTool />
    </MemoryRouter>,
  );
  const input = view.container.querySelector(
    'input[type=file]',
  ) as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
  return view;
}

describe('ExifTool', () => {
  it('dropping the JPEG shows the GPS group and a high risk', async () => {
    drop([toFile(jpegWithMetadata(), 'photo.jpg', 'image/jpeg')]);
    expect(
      await screen.findByRole('heading', { name: 'GPS' }, { timeout: 5000 }),
    ).toBeTruthy();
    expect(screen.getByTestId('risk-level').textContent).toBe('High risk');
    expect(
      screen.getByRole('button', { name: 'Copy coordinates' }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Camera' })).toBeTruthy();
  });

  it('remove metadata produces a done row', async () => {
    drop([toFile(jpegWithMetadata(), 'photo.jpg', 'image/jpeg')]);
    await screen.findByRole('heading', { name: 'GPS' }, { timeout: 5000 });
    fireEvent.click(screen.getByRole('button', { name: 'Remove metadata' }));
    const grid = screen.getByRole('grid', { name: 'Files to clean' });
    await waitFor(() => expect(within(grid).getByText('Done')).toBeTruthy(), {
      timeout: 5000,
    });
    expect(
      screen.getByRole('button', { name: 'Download ZIP' }),
    ).not.toHaveProperty('disabled', true);
    expect(
      screen.getByRole('button', { name: 'Download photo.jpg' }),
    ).toBeTruthy();
  });

  it('a HEIC file shows the unsupported message and is not downloadable', async () => {
    drop([toFile(heicBytes(), 'photo.heic', 'image/heic')]);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Remove metadata' }),
      ).not.toHaveProperty('disabled', true),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove metadata' }));
    const alert = await screen.findByRole('list', {
      name: 'Files not cleaned',
    });
    expect(alert.textContent).toMatch(/cannot be removed from HEIC/);
    expect(alert.textContent).toMatch(/Image Compressor/);
    expect(screen.getByRole('button', { name: 'Download ZIP' })).toHaveProperty(
      'disabled',
      true,
    );
  });
});
