import { linear, type Category } from './define';

// 1 g/cm^3 = 1000 kg/m^3; 1 lb/ft^3 = 0.45359237 / 0.3048^3 kg/m^3;
// 1 lb/in^3 = 0.45359237 / 0.0254^3 kg/m^3.
export const density: Category = {
  id: 'density',
  label: 'Density',
  base: 'kgm3',
  units: [
    linear('kgm3', 'Kilograms per cubic metre', 'kg/m³', 1),
    linear('gcm3', 'Grams per cubic centimetre', 'g/cm³', 1000),
    linear('gml', 'Grams per millilitre', 'g/mL', 1000),
    linear('kgl', 'Kilograms per litre', 'kg/L', 1000),
    linear(
      'lbft3',
      'Pounds per cubic foot',
      'lb/ft³',
      0.45359237 / 0.3048 ** 3,
    ),
    linear(
      'lbin3',
      'Pounds per cubic inch',
      'lb/in³',
      0.45359237 / 0.0254 ** 3,
    ),
  ],
};
