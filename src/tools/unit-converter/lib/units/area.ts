import { linear, type Category } from './define';

// Squares of the exact lengths; 1 acre = 4840 yd^2 = 4046.8564224 m^2.
export const area: Category = {
  id: 'area',
  label: 'Area',
  base: 'm2',
  units: [
    linear('km2', 'Square kilometres', 'km²', 1e6),
    linear('ha', 'Hectares', 'ha', 1e4),
    linear('m2', 'Square metres', 'm²', 1),
    linear('cm2', 'Square centimetres', 'cm²', 1e-4),
    linear('mm2', 'Square millimetres', 'mm²', 1e-6),
    linear('mi2', 'Square miles', 'mi²', 2589988.110336),
    linear('ac', 'Acres', 'ac', 4046.8564224),
    linear('yd2', 'Square yards', 'yd²', 0.83612736),
    linear('ft2', 'Square feet', 'ft²', 0.09290304),
    linear('in2', 'Square inches', 'in²', 0.00064516),
  ],
};
