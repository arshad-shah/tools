// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { encodePng, noiseImage } from '../../../../test/fixtures/images';
import { ToolError } from '@/shared/lib/errors';
import type { ImageJob } from '@/shared/lib/image/pipeline';

const SAMPLE_BYTES: Record<string, number> = {
  webp: 100,
  jpeg: 300,
  png: 900,
  'png-palette': 400,
};

vi.mock('@/shared/workers/image-client', () => ({
  imageClient: () => ({
    call: (_m: string, [, job]: [Blob, ImageJob]) =>
      job.encoding === 'avif'
        ? Promise.reject(new ToolError('UNSUPPORTED_FEATURE', 'No AVIF'))
        : Promise.resolve({
            bytes: new Uint8Array(SAMPLE_BYTES[job.encoding]),
            mime: 'image/png',
            width: 512,
            height: 256,
          }),
    terminate: () => {},
  }),
}));

const { EstimateCard } = await import('./EstimateCard');

describe('EstimateCard', () => {
  it('scales each sample, marks the smallest and flags unsupported formats', async () => {
    // 1024x512 is four times the 512x256 sample.
    const file = new File(
      [
        encodePng(
          1024,
          512,
          noiseImage(1024, 512, 4, 1),
        ) as Uint8Array<ArrayBuffer>,
      ],
      'wide.png',
      { type: 'image/png' },
    );
    render(
      <EstimateCard
        file={file}
        quality={0.8}
        background="#ffffff"
        current="jpeg"
        onUse={() => {}}
      />,
    );
    const list = await screen.findByRole('list', {
      name: 'Size estimate by format',
    });
    const items = within(list).getAllByRole('listitem');
    const webp = items.find((i) => i.textContent?.startsWith('WebP'))!;
    expect(webp.textContent).toContain('400 B estimate');
    expect(within(webp).getByText('Smallest')).toBeTruthy();
    const avif = items.find((i) => i.textContent?.startsWith('AVIF'))!;
    expect(avif.textContent).toContain('Not supported in this browser');
    expect(screen.getAllByText('Smallest')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Use WebP' })).toBeTruthy();
  });
});
