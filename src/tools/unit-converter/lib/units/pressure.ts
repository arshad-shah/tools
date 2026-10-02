import { linear, type Category } from './define';

// 1 atm = 101325 Pa; 1 bar = 1e5 Pa; 1 torr = 101325/760 Pa; 1 mmHg =
// 133.322387415 Pa; 1 psi = 1 lbf/in^2 = 6894.757293168361 Pa; 1 inHg
// = 3386.389 Pa (conventional, 0 C).
export const pressure: Category = {
  id: 'pressure',
  label: 'Pressure',
  base: 'Pa',
  units: [
    linear('Pa', 'Pascals', 'Pa', 1),
    linear('hPa', 'Hectopascals', 'hPa', 100),
    linear('kPa', 'Kilopascals', 'kPa', 1e3),
    linear('MPa', 'Megapascals', 'MPa', 1e6),
    linear('GPa', 'Gigapascals', 'GPa', 1e9),
    linear('bar', 'Bars', 'bar', 1e5),
    linear('mbar', 'Millibars', 'mbar', 100),
    linear('atm', 'Atmospheres', 'atm', 101325),
    linear('psi', 'Pounds per square inch', 'psi', 6894.757293168361),
    linear('torr', 'Torr', 'Torr', 101325 / 760),
    linear('mmHg', 'Millimetres of mercury', 'mmHg', 133.322387415),
    linear('inHg', 'Inches of mercury', 'inHg', 3386.389),
  ],
};
