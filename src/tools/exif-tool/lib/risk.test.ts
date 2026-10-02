import { describe, expect, it } from 'vitest';
import { jpegWithMetadata } from '../../../../test/fixtures/exif';
import { encodePng } from '../../../../test/fixtures/images';
import { readMetadata } from './read';
import { assessRisk } from './risk';

describe('assessRisk', () => {
  it('GPS is high risk; serial and owner are listed', async () => {
    const r = assessRisk(await readMetadata(jpegWithMetadata()));
    expect(r.level).toBe('high');
    expect(r.reasons).toContain('GPS location (51.5015, -0.1406)');
    expect(r.reasons).toContain('Device serial number');
    expect(r.reasons).toContain('Owner name (Jane Fixture)');
  });

  it('a clean image has no risk', async () => {
    const r = assessRisk(
      await readMetadata(encodePng(2, 2, new Uint8Array(16))),
    );
    expect(r).toEqual({ level: 'none', reasons: [] });
  });

  it('a serial number alone is low risk', async () => {
    const base = await readMetadata(encodePng(2, 2, new Uint8Array(16)));
    const r = assessRisk({
      ...base,
      groups: { ...base.groups, camera: [['SerialNumber', 'X1']] },
    });
    expect(r).toEqual({ level: 'low', reasons: ['Device serial number'] });
  });
});
