import type { ToolGroup } from '@/shared/ui';
import {
  IconMinimize2,
  IconRepair,
  IconSizeBreakdown,
} from '@/shared/ui/icons';
import { ModeToolbar } from '../../ModeToolbar';
import type { ModeProps } from '../types';
import { compress, repair } from './actions';
import { refreshSizeBreakdown } from './settings-store';

/** Optimize tools: compress, repair, measure. Linearize lives in Export. */
export function OptimizeToolbar({ doc }: ModeProps) {
  const groups: ToolGroup[] = [
    {
      id: 'optimize',
      label: 'Optimize',
      items: [
        {
          id: 'compress',
          label: 'Compress',
          icon: IconMinimize2,
          kind: 'button',
          onSelect: () => void compress(doc),
        },
        {
          id: 'repair',
          label: 'Repair',
          icon: IconRepair,
          kind: 'button',
          onSelect: () => void repair(doc),
        },
      ],
    },
    {
      id: 'measure',
      label: 'Measure',
      items: [
        {
          id: 'size-breakdown',
          label: 'Measure size again',
          icon: IconSizeBreakdown,
          kind: 'button',
          onSelect: refreshSizeBreakdown,
        },
      ],
    },
  ];
  return <ModeToolbar groups={groups} />;
}
