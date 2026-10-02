import { Alignment, Fit } from '@/shared/ui/adapters/rive-runtime';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ALIGN_FIT,
  alignValues,
  fitValues,
  getAlignmentValue,
  getFitValue,
} from './layout';

describe('rive layout', () => {
  it('maps every fit index to the runtime Fit value', () => {
    fitValues.forEach((name, i) => {
      expect(getFitValue({ fit: i, alignment: 0 })).toBe(Fit[name]);
    });
    expect(getFitValue({ fit: 0, alignment: 0 })).toBe(Fit.Cover);
    expect(getFitValue({ fit: fitValues.length - 1, alignment: 0 })).toBe(
      Fit.ScaleDown,
    );
  });

  it('maps every alignment index to the runtime Alignment value', () => {
    alignValues.forEach((name, j) => {
      expect(getAlignmentValue({ fit: 0, alignment: j })).toBe(Alignment[name]);
    });
    expect(getAlignmentValue({ fit: 0, alignment: 0 })).toBe(Alignment.TopLeft);
    expect(
      getAlignmentValue({ fit: 0, alignment: alignValues.length - 1 }),
    ).toBe(Alignment.BottomRight);
  });

  it('lists the selectable fits and alignments in UI order, each distinct', () => {
    expect(fitValues).toEqual([
      'Cover',
      'Contain',
      'Fill',
      'FitWidth',
      'FitHeight',
      'None',
      'ScaleDown',
    ]);
    expect(alignValues).toEqual([
      'TopLeft',
      'TopCenter',
      'TopRight',
      'CenterLeft',
      'Center',
      'CenterRight',
      'BottomLeft',
      'BottomCenter',
      'BottomRight',
    ]);
    // Every index maps to its own runtime value, so no option is a duplicate.
    expect(new Set(fitValues.map((f) => Fit[f])).size).toBe(fitValues.length);
    expect(new Set(alignValues.map((a) => Alignment[a])).size).toBe(
      alignValues.length,
    );
    // Every runtime alignment is offered; of the fits only Layout is left out.
    expect([...alignValues].sort()).toEqual(Object.keys(Alignment).sort());
    expect(
      Object.keys(Fit).filter((k) => !(fitValues as string[]).includes(k)),
    ).toEqual(['Layout']);
  });

  it('starts at Center / Cover', () => {
    expect(getFitValue(DEFAULT_ALIGN_FIT)).toBe(Fit.Cover);
    expect(getAlignmentValue(DEFAULT_ALIGN_FIT)).toBe(Alignment.Center);
  });
});
