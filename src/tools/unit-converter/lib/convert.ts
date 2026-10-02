import type { Category, Unit } from '../types';

/** Thousands separators on the integer part; non-numbers pass through. */
export const formatNumber = (value: string): string => {
  if (!value || isNaN(parseFloat(value))) return value;
  const parts = value.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

/** `value` in `from` expressed in `to`, at most 10 decimals; '' if not a number. */
export const convertUnits = (
  value: string,
  from: Unit,
  to: Unit,
  category: Category,
): string => {
  if (value === '' || isNaN(parseFloat(value))) return '';
  const v = parseFloat(value);
  if (category.name === 'Temperature') {
    let kelvin: number;
    if (from.name === 'Celsius') kelvin = v + 273.15;
    else if (from.name === 'Fahrenheit') kelvin = (v + 459.67) * (5 / 9);
    else kelvin = v;
    let result: number;
    if (to.name === 'Celsius') result = kelvin - 273.15;
    else if (to.name === 'Fahrenheit') result = kelvin * (9 / 5) - 459.67;
    else result = kelvin;
    return parseFloat(result.toFixed(10)).toString();
  }
  const baseValue = v * from.factor;
  return parseFloat((baseValue / to.factor).toFixed(10)).toString();
};

/** "just now", "5m ago", "3h ago" or "2d ago". */
export const getTimeSince = (timestamp: Date): string => {
  const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};
