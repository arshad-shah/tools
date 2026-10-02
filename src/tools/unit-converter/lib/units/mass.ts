import { linear, type Category } from './define';

// 1 lb = 0.45359237 kg exactly (1959 agreement); 1 oz = 1/16 lb;
// 1 st = 14 lb; short ton 2000 lb; long ton 2240 lb.
export const mass: Category = {
  id: 'mass',
  label: 'Mass',
  base: 'kg',
  units: [
    linear('t', 'Tonnes', 't', 1000),
    linear('kg', 'Kilograms', 'kg', 1),
    linear('g', 'Grams', 'g', 1e-3),
    linear('mg', 'Milligrams', 'mg', 1e-6),
    linear('ug', 'Micrograms', 'µg', 1e-9),
    linear('lb', 'Pounds', 'lb', 0.45359237),
    linear('oz', 'Ounces', 'oz', 0.028349523125),
    linear('st', 'Stone', 'st', 6.35029318),
    linear('ton-us', 'Short tons (US)', 'ton', 907.18474),
    linear('ton-uk', 'Long tons (UK)', 'LT', 1016.0469088),
  ],
};
