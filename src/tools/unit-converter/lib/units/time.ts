import { linear, type Category } from './define';

const DAY = 86400;

// Months and years vary; these are the Gregorian averages (400-year cycle:
// 146097 days, so a year is 365.2425 d and a month 30.436875 d).
export const time: Category = {
  id: 'time',
  label: 'Time',
  base: 's',
  units: [
    linear(
      'yr',
      'Years',
      'yr',
      365.2425 * DAY,
      'average Gregorian (365.2425 d)',
    ),
    linear(
      'mo',
      'Months',
      'mo',
      30.436875 * DAY,
      'average Gregorian (30.436875 d)',
    ),
    linear('wk', 'Weeks', 'wk', 7 * DAY),
    linear('d', 'Days', 'd', DAY),
    linear('h', 'Hours', 'h', 3600),
    linear('min', 'Minutes', 'min', 60),
    linear('s', 'Seconds', 's', 1),
    linear('ms', 'Milliseconds', 'ms', 1e-3),
    linear('us', 'Microseconds', 'µs', 1e-6),
    linear('ns', 'Nanoseconds', 'ns', 1e-9),
  ],
};
