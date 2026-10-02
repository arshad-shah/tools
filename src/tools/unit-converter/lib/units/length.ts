import { linear, type Category } from './define';

// International yard and pound agreement (1959): 1 yd = 0.9144 m exactly,
// so 1 ft = 0.3048 m, 1 in = 0.0254 m and 1 mi = 1609.344 m. The nautical
// mile is 1852 m by definition.
export const length: Category = {
  id: 'length',
  label: 'Length',
  base: 'm',
  units: [
    linear('km', 'Kilometres', 'km', 1000),
    linear('m', 'Metres', 'm', 1),
    linear('cm', 'Centimetres', 'cm', 0.01),
    linear('mm', 'Millimetres', 'mm', 0.001),
    linear('um', 'Micrometres', 'µm', 1e-6),
    linear('nm', 'Nanometres', 'nm', 1e-9),
    linear('mi', 'Miles', 'mi', 1609.344),
    linear('yd', 'Yards', 'yd', 0.9144),
    linear('ft', 'Feet', 'ft', 0.3048),
    linear('in', 'Inches', 'in', 0.0254),
    linear('nmi', 'Nautical miles', 'nmi', 1852),
  ],
};
