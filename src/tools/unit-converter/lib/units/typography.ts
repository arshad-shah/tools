import { linear, type Category } from './define';

// CSS units, base px: 1 in = 96 px, 1 pt = 1/72 in, 1 pc = 12 pt,
// 1 mm = 96/25.4 px; rem and em are the base font size.
export function typography(basePx = 16): Category {
  return {
    id: 'typography',
    label: 'Typography',
    base: 'px',
    units: [
      linear('px', 'Pixels', 'px', 1),
      linear('pt', 'Points', 'pt', 96 / 72),
      linear('pc', 'Picas', 'pc', 16),
      linear('rem', 'Root em', 'rem', basePx, `at a ${basePx} px base size`),
      linear('em', 'Em', 'em', basePx, `at a ${basePx} px font size`),
      linear('in', 'Inches', 'in', 96),
      linear('mm', 'Millimetres', 'mm', 96 / 25.4),
      linear('cm', 'Centimetres', 'cm', 96 / 2.54),
    ],
  };
}
