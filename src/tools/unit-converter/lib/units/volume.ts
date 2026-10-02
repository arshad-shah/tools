import { linear, type Category } from './define';

// US gallon = 231 in^3 = 3.785411784 L; UK (imperial) gallon = 4.54609 L.
// US and UK pints are 1/8 of their gallons; fluid ounces 1/128 (US) and
// 1/160 (UK). 1 ft^3 = 0.3048^3 m^3.
export const volume: Category = {
  id: 'volume',
  label: 'Volume',
  base: 'l',
  units: [
    linear('m3', 'Cubic metres', 'm³', 1000),
    linear('l', 'Litres', 'L', 1),
    linear('ml', 'Millilitres', 'mL', 1e-3),
    linear('cm3', 'Cubic centimetres', 'cm³', 1e-3),
    linear('gal-us', 'Gallons (US)', 'gal', 3.785411784),
    linear('qt-us', 'Quarts (US)', 'qt', 0.946352946),
    linear('pt-us', 'Pints (US)', 'pt', 0.473176473),
    linear('floz-us', 'Fluid ounces (US)', 'fl oz', 0.0295735295625),
    linear('gal-uk', 'Gallons (UK)', 'gal (UK)', 4.54609),
    linear('pt-uk', 'Pints (UK)', 'pt (UK)', 0.56826125),
    linear('floz-uk', 'Fluid ounces (UK)', 'fl oz (UK)', 0.0284130625),
    linear('ft3', 'Cubic feet', 'ft³', 28.316846592),
    linear('in3', 'Cubic inches', 'in³', 0.016387064),
  ],
};
