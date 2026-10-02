import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { MARKDOWN_SETTINGS_DEFAULTS, markdownSettings } from './settings';

describe('markdown settings', () => {
  it('holds only wrap, scrollSync and previewWidth', () => {
    expect(() => assertNoDataFields(MARKDOWN_SETTINGS_DEFAULTS)).not.toThrow();
    expect(Object.keys(MARKDOWN_SETTINGS_DEFAULTS).sort()).toEqual([
      'previewWidth',
      'scrollSync',
      'wrap',
    ]);
    expect(markdownSettings.getSettings()).toEqual(MARKDOWN_SETTINGS_DEFAULTS);
  });
});
