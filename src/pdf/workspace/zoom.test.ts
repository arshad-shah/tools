import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ZOOM,
  effectiveZoom,
  migrateZoom,
  nextZoom,
  zoomScale,
} from './zoom';

const LETTER = [{ width: 612, height: 792 }];

describe('default zoom (P5-G)', () => {
  it('is fit width capped at 125 percent', () => {
    expect(DEFAULT_ZOOM).toEqual({ kind: 'fit-width', max: 125 });
  });

  it('on a 1440px screen with the rail open reads at 125, not 204', () => {
    // 1440 - 180 rail = 1260 wide canvas: fit width alone is about 200%.
    const z = effectiveZoom(DEFAULT_ZOOM, {
      railOpen: true,
      inspectorOpen: false,
    });
    expect(zoomScale(z, LETTER, 1260, 760, 16)).toBeCloseTo(1.25);
  });

  it('with the rail and inspector open it fits the page', () => {
    const z = effectiveZoom(DEFAULT_ZOOM, {
      railOpen: true,
      inspectorOpen: true,
    });
    expect(z).toEqual({ kind: 'fit-page', max: 125 });
    // 1440 - 180 - 288 = 972 x 760: the page height decides.
    expect(zoomScale(z, LETTER, 972, 760, 16)).toBeCloseTo((760 - 32) / 792);
  });

  it('a narrow canvas fits the width below the cap', () => {
    expect(zoomScale(DEFAULT_ZOOM, LETTER, 390, 700, 16)).toBeCloseTo(
      (390 - 32) / 612,
    );
  });

  it('a zoom the user chose is kept as is', () => {
    const chosen = { kind: 'percent' as const, value: 200 };
    expect(effectiveZoom(chosen, { railOpen: true, inspectorOpen: true })).toBe(
      chosen,
    );
    const fit = { kind: 'fit-width' as const };
    expect(effectiveZoom(fit, { railOpen: true, inspectorOpen: true })).toBe(
      fit,
    );
    expect(zoomScale(fit, LETTER, 1260, 760, 16)).toBeCloseTo(
      (1260 - 32) / 612,
    );
  });

  it('settings saved with the old uncapped default move to the new one', () => {
    expect(migrateZoom({ kind: 'fit-width' })).toEqual(DEFAULT_ZOOM);
    expect(migrateZoom({ kind: 'percent', value: 150 })).toEqual({
      kind: 'percent',
      value: 150,
    });
    expect(migrateZoom(undefined)).toEqual(DEFAULT_ZOOM);
  });

  it('zoom steps still go from the resolved scale', () => {
    expect(nextZoom(1.25, 1)).toEqual({ kind: 'percent', value: 150 });
  });
});
