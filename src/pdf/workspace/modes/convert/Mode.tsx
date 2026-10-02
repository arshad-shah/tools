import type { Command } from '@/shared/lib/commands';
import { CONVERT_OPS } from '@/pdf/doc/ops';
import type { ModeContext, ModeModule } from '../types';
import { selectedPages } from './actions';
import { ConvertPanel } from './ConvertPanel';
import { ConvertToolbar } from './ConvertToolbar';
import { requestConvert } from './ui-store';

const GROUP = 'Convert';

/** Palette commands; the mounted toolbar runs them (it owns the job). */
function commands(ctx: ModeContext): Command[] {
  return [
    {
      id: 'convert-images',
      label: 'Convert pages to images',
      group: GROUP,
      run: () => requestConvert('images'),
    },
    {
      id: 'convert-text',
      label: 'Save as text',
      group: GROUP,
      run: () => requestConvert('text'),
    },
    {
      id: 'convert-markdown',
      label: 'Save as Markdown',
      group: GROUP,
      run: () => requestConvert('markdown'),
    },
    {
      id: 'convert-selected-pdf',
      label: 'Save selected pages as PDF',
      group: GROUP,
      disabled:
        selectedPages(ctx).length === 0 ? 'Select pages to export' : false,
      run: () => requestConvert('selected-pdf'),
    },
    {
      id: 'convert-insert-images',
      label: 'Insert images as pages',
      group: GROUP,
      run: () => requestConvert('insert-images'),
    },
  ];
}

const mode: ModeModule = {
  operations: [...CONVERT_OPS],
  Toolbar: ConvertToolbar,
  Inspector: ConvertPanel,
  inspectorPinned: true,
  commands,
};

export default mode;
