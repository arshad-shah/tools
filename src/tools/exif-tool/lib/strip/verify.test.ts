import { describe, expect, it, vi } from 'vitest';
import { jpegWithMetadata } from '../../../../../test/fixtures/exif';

vi.mock('../read', async (importOriginal) => {
  const real = await importOriginal<typeof import('../read')>();
  return {
    ...real,
    readMetadata: vi.fn(async (b: Uint8Array) => {
      const m = await real.readMetadata(b);
      return { ...m, gps: { lat: 1, lon: 2 } };
    }),
  };
});

const { stripMetadata } = await import('./index');

describe('stripMetadata verification', () => {
  it('gives VERIFICATION_FAILED when metadata is still there', async () => {
    await expect(
      stripMetadata(
        new File(
          [jpegWithMetadata() as Uint8Array<ArrayBuffer>],
          'holiday.jpg',
        ),
      ),
    ).rejects.toMatchObject({
      code: 'VERIFICATION_FAILED',
      message: 'Metadata could not be fully removed from holiday.jpg',
    });
  });
});
