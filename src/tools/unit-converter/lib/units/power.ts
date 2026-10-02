import { linear, type Category } from './define';

// Mechanical horsepower = 550 ft lbf/s = 745.6998715822702 W; metric
// horsepower (PS) = 75 kgf m/s = 735.49875 W; 1 BTU/h = 1055.05585262/3600 W.
export const power: Category = {
  id: 'power',
  label: 'Power',
  base: 'W',
  units: [
    linear('W', 'Watts', 'W', 1),
    linear('kW', 'Kilowatts', 'kW', 1e3),
    linear('MW', 'Megawatts', 'MW', 1e6),
    linear('hp', 'Horsepower (mechanical)', 'hp', 745.6998715822702),
    linear('ps', 'Horsepower (metric)', 'PS', 735.49875),
    linear('btuh', 'BTU per hour', 'BTU/h', 1055.05585262 / 3600),
    linear(
      'ftlbfs',
      'Foot-pounds per second',
      'ft lbf/s',
      0.3048 * 4.4482216152605,
    ),
  ],
};
