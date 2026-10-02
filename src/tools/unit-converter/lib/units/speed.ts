import { linear, type Category } from './define';

// 1 km/h = 1/3.6 m/s; 1 mph = 1609.344/3600 = 0.44704 m/s; 1 knot =
// 1852/3600 m/s.
export const speed: Category = {
  id: 'speed',
  label: 'Speed',
  base: 'mps',
  units: [
    linear('mps', 'Metres per second', 'm/s', 1),
    linear('kmh', 'Kilometres per hour', 'km/h', 1 / 3.6),
    linear('mph', 'Miles per hour', 'mph', 0.44704),
    linear('kn', 'Knots', 'kn', 1852 / 3600),
    linear('fps', 'Feet per second', 'ft/s', 0.3048),
  ],
};
