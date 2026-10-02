import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { DEFAULT_ALIGN_FIT } from './lib/layout';
import { fromAlignFit, RIVE_DEFAULTS, toAlignFit } from './settings';

describe('rive settings', () => {
  it('hold presentation only, never the file or its text', () => {
    expect(() => assertNoDataFields(RIVE_DEFAULTS)).not.toThrow();
  });
  it('map fit and alignment names to the layout indices and back', () => {
    expect(toAlignFit(RIVE_DEFAULTS)).toEqual(DEFAULT_ALIGN_FIT);
    expect(
      toAlignFit({ ...RIVE_DEFAULTS, fit: 'Contain', alignment: 'TopLeft' }),
    ).toEqual({ fit: 1, alignment: 0 });
    expect(toAlignFit({ ...RIVE_DEFAULTS, fit: 'Nope' })).toEqual(
      DEFAULT_ALIGN_FIT,
    );
    expect(fromAlignFit({ fit: 1, alignment: 0 })).toEqual({
      fit: 'Contain',
      alignment: 'TopLeft',
    });
  });
});
