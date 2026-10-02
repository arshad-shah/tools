import type { Category } from './define';

// Base Celsius, so the common Fahrenheit and Celsius conversions are
// exact (32 F is 0 C, -40 F is -40 C). K = C + 273.15; R = K * 9/5.
export const temperature: Category = {
  id: 'temperature',
  label: 'Temperature',
  base: 'c',
  units: [
    {
      id: 'c',
      label: 'Celsius',
      symbol: '°C',
      toBase: (v) => v,
      fromBase: (v) => v,
    },
    {
      id: 'f',
      label: 'Fahrenheit',
      symbol: '°F',
      toBase: (v) => ((v - 32) * 5) / 9,
      fromBase: (v) => (v * 9) / 5 + 32,
    },
    {
      id: 'k',
      label: 'Kelvin',
      symbol: 'K',
      toBase: (v) => v - 273.15,
      fromBase: (v) => v + 273.15,
    },
    {
      id: 'r',
      label: 'Rankine',
      symbol: '°R',
      toBase: (v) => ((v - 491.67) * 5) / 9,
      fromBase: (v) => (v * 9) / 5 + 491.67,
    },
  ],
};
