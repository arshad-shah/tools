import { linear, type Category } from './define';

// Standard gravity 9.80665 m/s^2 (so 1 kgf = 9.80665 N); 1 lbf =
// 0.45359237 kg * 9.80665 = 4.4482216152605 N; 1 dyn = 1e-5 N.
export const force: Category = {
  id: 'force',
  label: 'Force',
  base: 'N',
  units: [
    linear('N', 'Newtons', 'N', 1),
    linear('kN', 'Kilonewtons', 'kN', 1e3),
    linear('dyn', 'Dynes', 'dyn', 1e-5),
    linear('lbf', 'Pound-force', 'lbf', 4.4482216152605),
    linear('kgf', 'Kilogram-force', 'kgf', 9.80665),
  ],
};
