import { linear, type Category } from './define';

// 1 lbf ft = 4.4482216152605 N * 0.3048 m; 1 lbf in = that / 12.
export const torque: Category = {
  id: 'torque',
  label: 'Torque',
  base: 'Nm',
  units: [
    linear('Nm', 'Newton-metres', 'N m', 1),
    linear('kNm', 'Kilonewton-metres', 'kN m', 1e3),
    linear('lbfft', 'Pound-force feet', 'lbf ft', 0.3048 * 4.4482216152605),
    linear('lbfin', 'Pound-force inches', 'lbf in', 0.0254 * 4.4482216152605),
    linear('kgfm', 'Kilogram-force metres', 'kgf m', 9.80665),
  ],
};
