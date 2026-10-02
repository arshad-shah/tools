import { describe, expect, it } from 'vitest';
import { parseMockSchema } from '@/shared/lib/data-formats/mock-schema';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { PRESET_IDS, PRESETS } from './lib/presets';
import { MOCK_SETTINGS_DEFAULTS, readMockSettings } from './settings';

describe('mock data settings', () => {
  it('persists configuration, never data', () => {
    expect(() => assertNoDataFields(MOCK_SETTINGS_DEFAULTS)).not.toThrow();
  });

  it('falls back on invalid stored values', () => {
    expect(
      readMockSettings({
        schema: { tables: 'no' },
        locale: 'xx',
        count: 5_000_000,
        lastPreset: 'nope',
      }),
    ).toEqual({
      schema: PRESETS.users,
      locale: 'en-US',
      count: 100,
      lastPreset: null,
    });
  });

  it.each(PRESET_IDS)('the %s preset validates', (id) => {
    expect(parseMockSchema(JSON.parse(JSON.stringify(PRESETS[id])))).toEqual(
      PRESETS[id],
    );
  });
});
