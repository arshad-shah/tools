import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { IMAGE_DEFAULTS, jobFromSettings } from './settings';

describe('image settings', () => {
  it('hold the preset only', () => {
    expect(() => assertNoDataFields(IMAGE_DEFAULTS)).not.toThrow();
  });

  it('map to a worker job', () => {
    expect(jobFromSettings(IMAGE_DEFAULTS)).toEqual({
      encoding: 'webp',
      quality: 0.8,
      background: '#ffffff',
    });
    expect(
      jobFromSettings({
        ...IMAGE_DEFAULTS,
        resize: { mode: 'max', maxWidth: 800, maxHeight: 0, percent: 50 },
        targetKB: 50,
      }),
    ).toMatchObject({ resize: { maxWidth: 800 }, targetBytes: 51_200 });
    expect(
      jobFromSettings({
        ...IMAGE_DEFAULTS,
        resize: { ...IMAGE_DEFAULTS.resize, mode: 'percent' },
      }),
    ).toMatchObject({ resize: { percent: 50 } });
  });
});
