import type { Category, Unit } from './define';

// Base L/100 km. Distance-per-volume units are inverses of it:
// L/100 km = 100 / (km/L); mpg = miles per gallon with 1 mi = 1.609344 km,
// US gallon 3.785411784 L and UK gallon 4.54609 L.
const inverse = (
  id: string,
  label: string,
  symbol: string,
  k: number,
): Unit => ({
  id,
  label,
  symbol,
  toBase: (v) => k / v,
  fromBase: (v) => k / v,
});

export const fuel: Category = {
  id: 'fuel',
  label: 'Fuel economy',
  base: 'l100km',
  units: [
    {
      id: 'l100km',
      label: 'Litres per 100 km',
      symbol: 'L/100 km',
      toBase: (v) => v,
      fromBase: (v) => v,
    },
    inverse('kml', 'Kilometres per litre', 'km/L', 100),
    inverse(
      'mpg-us',
      'Miles per gallon (US)',
      'mpg',
      (100 * 3.785411784) / 1.609344,
    ),
    inverse(
      'mpg-uk',
      'Miles per gallon (UK)',
      'mpg (UK)',
      (100 * 4.54609) / 1.609344,
    ),
  ],
};
