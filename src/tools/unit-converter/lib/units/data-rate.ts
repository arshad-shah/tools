import { linear, type Category } from './define';

// Base bits per second; SI multiples are powers of 1000, IEC 1024.
export const dataRate: Category = {
  id: 'data-rate',
  label: 'Data rate',
  base: 'bps',
  units: [
    linear('bps', 'Bits per second', 'bit/s', 1),
    linear('kbps', 'Kilobits per second', 'kbit/s', 1e3),
    linear('Mbps', 'Megabits per second', 'Mbit/s', 1e6),
    linear('Gbps', 'Gigabits per second', 'Gbit/s', 1e9),
    linear('Bps', 'Bytes per second', 'B/s', 8),
    linear('kBps', 'Kilobytes per second', 'kB/s', 8e3),
    linear('MBps', 'Megabytes per second', 'MB/s', 8e6),
    linear('GBps', 'Gigabytes per second', 'GB/s', 8e9),
    linear('KiBps', 'Kibibytes per second', 'KiB/s', 8 * 1024),
    linear('MiBps', 'Mebibytes per second', 'MiB/s', 8 * 1024 ** 2),
  ],
};
