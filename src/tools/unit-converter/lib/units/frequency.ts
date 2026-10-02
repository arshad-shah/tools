import { linear, type Category } from './define';

// 1 rpm = 1/60 Hz; 1 rad/s = 1/(2 pi) Hz.
export const frequency: Category = {
  id: 'frequency',
  label: 'Frequency',
  base: 'Hz',
  units: [
    linear('Hz', 'Hertz', 'Hz', 1),
    linear('kHz', 'Kilohertz', 'kHz', 1e3),
    linear('MHz', 'Megahertz', 'MHz', 1e6),
    linear('GHz', 'Gigahertz', 'GHz', 1e9),
    linear('rpm', 'Revolutions per minute', 'rpm', 1 / 60),
    linear('rads', 'Radians per second', 'rad/s', 1 / (2 * Math.PI)),
  ],
};
