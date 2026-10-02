import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../../test/helpers/settings-guard';
import { TEXT_ENCODER_DEFAULTS, textEncoderSettings } from '../settings';
import { asUrl } from './as-url';

describe('asUrl', () => {
  it('accepts one absolute http(s) URL', () => {
    expect(asUrl(' https://example.com/a?b=1 ')).toBe(
      'https://example.com/a?b=1',
    );
    expect(asUrl('example.com')).toBeNull();
    expect(asUrl('https://a.test b')).toBeNull();
    expect(asUrl('javascript:alert(1)')).toBeNull();
  });
});

describe('text encoder settings', () => {
  it('holds options only', () => {
    expect(() => assertNoDataFields(TEXT_ENCODER_DEFAULTS)).not.toThrow();
    expect(textEncoderSettings.getSettings()).toEqual(TEXT_ENCODER_DEFAULTS);
  });
});
