import type { Command } from '@/shared/lib/commands';
import { OPTIMIZE_OPS } from '@/pdf/doc/ops';
import type { ModeContext, ModeModule } from '../types';
import { compress, repair } from './actions';
import { OptimizeInspector } from './OptimizeInspector';
import { OptimizeToolbar } from './OptimizeToolbar';
import { refreshSizeBreakdown } from './settings-store';

const GROUP = 'Optimize';

function commands(ctx: ModeContext): Command[] {
  return [
    {
      id: 'optimize-compress',
      label: 'Compress document',
      group: GROUP,
      run: () => void compress(ctx.doc),
    },
    {
      id: 'optimize-repair',
      label: 'Repair document',
      group: GROUP,
      run: () => void repair(ctx.doc),
    },
    {
      id: 'optimize-measure',
      label: 'Measure size again',
      group: GROUP,
      run: refreshSizeBreakdown,
    },
  ];
}

const mode: ModeModule = {
  operations: [...OPTIMIZE_OPS],
  Toolbar: OptimizeToolbar,
  Inspector: OptimizeInspector,
  inspectorPinned: true,
  commands,
};

export default mode;
