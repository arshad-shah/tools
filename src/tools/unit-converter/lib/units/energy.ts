import { linear, type Category } from './define';

// 1 eV = 1.602176634e-19 J exactly (2019 SI); thermochemical calorie
// 4.184 J; 1 Wh = 3600 J; International Table BTU 1055.05585262 J;
// 1 ft lbf = 0.3048 * 4.4482216152605 J.
export const energy: Category = {
  id: 'energy',
  label: 'Energy',
  base: 'J',
  units: [
    linear('J', 'Joules', 'J', 1),
    linear('kJ', 'Kilojoules', 'kJ', 1e3),
    linear('MJ', 'Megajoules', 'MJ', 1e6),
    linear('cal', 'Calories', 'cal', 4.184),
    linear('kcal', 'Kilocalories', 'kcal', 4184),
    linear('Wh', 'Watt-hours', 'Wh', 3600),
    linear('kWh', 'Kilowatt-hours', 'kWh', 3.6e6),
    linear('eV', 'Electronvolts', 'eV', 1.602176634e-19),
    linear('BTU', 'British thermal units', 'BTU', 1055.05585262),
    linear('ftlbf', 'Foot-pounds', 'ft lbf', 0.3048 * 4.4482216152605),
  ],
};
