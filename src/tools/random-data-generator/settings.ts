import {
  MOCK_LOCALES,
  parseMockSchema,
  type MockLocale,
  type MockSchema,
} from '@/shared/lib/data-formats/mock-schema';
import { createToolSettings, type Json } from '@/shared/lib/tool-settings';
import { MAX_COUNT } from './lib/engine';
import { isPresetId, PRESETS, type PresetId } from './lib/presets';

/**
 * The schema is configuration, not generated data, so it is persisted
 * (spec §8.2). It is stored as plain JSON and validated on every read.
 */
export interface MockSettingsStored {
  schema: Json;
  locale: string;
  count: number;
  lastPreset: string;
}

export interface MockSettings {
  schema: MockSchema;
  locale: MockLocale;
  count: number;
  lastPreset: PresetId | null;
}

export const DEFAULT_COUNT = 100;

export const MOCK_SETTINGS_DEFAULTS: MockSettingsStored = {
  schema: PRESETS.users as unknown as Json,
  locale: 'en-US',
  count: DEFAULT_COUNT,
  lastPreset: 'users',
};

export const mockSettings = createToolSettings<MockSettingsStored>(
  'random-data-generator',
  MOCK_SETTINGS_DEFAULTS,
  { version: 1 },
);

/** Stored settings made safe: an invalid schema or value falls back. */
export function readMockSettings(s: MockSettingsStored): MockSettings {
  let schema: MockSchema;
  try {
    schema = parseMockSchema(s.schema);
  } catch {
    schema = PRESETS.users;
  }
  return {
    schema,
    locale: (MOCK_LOCALES as readonly string[]).includes(s.locale)
      ? (s.locale as MockLocale)
      : 'en-US',
    count:
      Number.isInteger(s.count) && s.count >= 1 && s.count <= MAX_COUNT
        ? s.count
        : DEFAULT_COUNT,
    lastPreset: isPresetId(s.lastPreset) ? s.lastPreset : null,
  };
}
