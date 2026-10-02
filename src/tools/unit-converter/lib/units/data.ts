import { linear, type Category } from './define';

// SI prefixes are powers of 1000 (kB, MB); IEC binary prefixes are powers
// of 1024 (KiB, MiB), per IEC 80000-13.
export const data: Category = {
  id: 'data',
  label: 'Data',
  base: 'B',
  units: [
    linear('bit', 'Bits', 'bit', 1 / 8),
    linear('B', 'Bytes', 'B', 1),
    linear('kB', 'Kilobytes', 'kB', 1e3),
    linear('MB', 'Megabytes', 'MB', 1e6),
    linear('GB', 'Gigabytes', 'GB', 1e9),
    linear('TB', 'Terabytes', 'TB', 1e12),
    linear('PB', 'Petabytes', 'PB', 1e15),
    linear('KiB', 'Kibibytes', 'KiB', 1024),
    linear('MiB', 'Mebibytes', 'MiB', 1024 ** 2),
    linear('GiB', 'Gibibytes', 'GiB', 1024 ** 3),
    linear('TiB', 'Tebibytes', 'TiB', 1024 ** 4),
    linear('PiB', 'Pebibytes', 'PiB', 1024 ** 5),
  ],
};
