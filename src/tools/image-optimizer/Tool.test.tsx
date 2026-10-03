// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodePng, noiseImage } from '../../../test/fixtures/images';
import { ToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';
import type { ImageJob } from '@/shared/lib/image/pipeline';
import { mockViewport } from '@/shared/ui/data-grid/test-utils';

type Call = (
  method: string,
  args: [Blob, ImageJob],
  opts?: { signal?: AbortSignal },
) => Promise<unknown>;

const h = vi.hoisted(() => ({
  process: null as unknown as Call,
  terminate: () => {},
  workers: 0,
}));

vi.mock('@/shared/workers/image-client', () => ({
  createImageWorker: () => {
    h.workers++;
    return {
      call: (...a: Parameters<Call>) => h.process(...a),
      terminate: () => h.terminate(),
    };
  },
  imageClient: () => ({
    call: () =>
      Promise.reject(new ToolError('UNSUPPORTED_FEATURE', 'Not in jsdom')),
    terminate: () => {},
  }),
}));
const saveBlob = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/download', async (orig) => ({
  ...(await orig<typeof import('@/shared/lib/download')>()),
  saveBlob,
}));
vi.mock('@/shared/lib/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const { default: ImageCompressor } = await import('./Tool');

const png = (name: string, w = 8, h2 = 6) =>
  new File(
    [encodePng(w, h2, noiseImage(w, h2, 4, 3)) as Uint8Array<ArrayBuffer>],
    name,
    { type: 'image/png' },
  );

const result = (bytes: number) => ({
  bytes: new Uint8Array(bytes),
  mime: 'image/webp',
  width: 8,
  height: 6,
});

function setup(files: File[]) {
  const view = render(
    <MemoryRouter>
      <ImageCompressor />
    </MemoryRouter>,
  );
  const input = view.container.querySelector(
    'input[type=file]',
  ) as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
  return view;
}

const totals = () => within(screen.getByRole('group', { name: 'Totals' }));
const cellTexts = () =>
  screen.getAllByRole('gridcell').map((c) => c.textContent);

beforeEach(() => {
  localStorage.clear();
  mockViewport(2400, 600);
  h.workers = 0;
  h.terminate = vi.fn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ImageCompressor', () => {
  it('compresses a two-file batch and shows the totals', async () => {
    h.process = vi.fn(() => Promise.resolve(result(10)));
    const files = [png('a.png'), png('b.png', 4, 4)];
    setup(files);

    await waitFor(() => expect(totals().getByText('2')).toBeTruthy());
    const before = files[0].size + files[1].size;
    expect(totals().getByText(formatBytes(before))).toBeTruthy();
    expect(totals().getByText(formatBytes(20))).toBeTruthy();
    expect(
      totals().getByText(`${(((before - 20) / before) * 100).toFixed(1)}%`),
    ).toBeTruthy();
    expect(h.process).toHaveBeenCalledTimes(2);
    expect(h.workers).toBe(2);
    expect(screen.getByText('Metadata removed (EXIF, GPS)')).toBeTruthy();
    await waitFor(() => expect(cellTexts()).toContain('8 x 6'));
    expect(cellTexts()).toContain('4 x 4');
    expect(
      screen.getByRole('button', { name: 'Download all as ZIP' }),
    ).toHaveProperty('disabled', false);
  });

  it('cancel all stops the running and pending jobs', async () => {
    h.process = vi.fn(
      (_m, _a, opts) =>
        new Promise((_resolve, reject) =>
          opts?.signal?.addEventListener('abort', () =>
            reject(new ToolError('CANCELLED', 'Cancelled')),
          ),
        ),
    );
    setup([png('a.png'), png('b.png'), png('c.png')]);

    await waitFor(() => expect(h.process).toHaveBeenCalledTimes(2));
    expect(cellTexts().filter((t) => t === 'Compressing')).toHaveLength(2);
    expect(cellTexts()).toContain('Waiting');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel all' }));
    await act(async () => {});

    expect(cellTexts().filter((t) => t === 'Cancelled')).toHaveLength(3);
    expect(h.process).toHaveBeenCalledTimes(2);
    expect(h.terminate).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Cancel all' })).toBeNull();
  });

  it('offers Keep original for a file that did not get smaller', async () => {
    const file = png('big.png');
    h.process = vi.fn(() => Promise.resolve(result(file.size + 100)));
    setup([file]);

    const keep = await screen.findByRole('button', {
      name: 'Keep original for big.png',
    });
    const grid = screen.getByRole('grid', { name: 'Files' });
    expect(grid.contains(keep)).toBe(true);
    expect(cellTexts()).toContain('Not smaller');
    expect(totals().getByText(formatBytes(file.size + 100))).toBeTruthy();

    fireEvent.click(keep);

    expect(cellTexts()).toContain('Kept original');
    expect(
      screen.getByRole('button', { name: 'Use compressed for big.png' }),
    ).toBeTruthy();
    expect(totals().getByText('0.0%')).toBeTruthy();
    expect(totals().getAllByText(formatBytes(file.size))).toHaveLength(2);
  });

  it('downloads one finished file from its grid row', async () => {
    const file = png('small.png');
    h.process = vi.fn(() => Promise.resolve(result(10)));
    setup([file]);

    const download = await screen.findByRole('button', {
      name: 'Download small.png',
    });
    expect(screen.getByRole('grid', { name: 'Files' }).contains(download)).toBe(
      true,
    );
    fireEvent.click(download);
    expect(saveBlob).toHaveBeenCalledWith(
      expect.any(File),
      'small.webp',
      'image/webp',
    );
  });
});
