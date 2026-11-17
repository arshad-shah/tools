import { requestProperties } from '../../properties-request';
import { type ToolGroup } from '../../ui/tool-groups';
import { fileChart, fileRepair, minimize } from '@arshad-shah/cynosure/icons';
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
          icon: minimize,
          kind: 'button',
          onSelect: () => void compress(doc),
        },
        {
          id: 'repair',
          label: 'Repair',
          icon: fileRepair,
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
          icon: fileChart,
          kind: 'button',
          onSelect: () => {
            refreshSizeBreakdown();
            requestProperties();
          },
        },
      ],
    },
  ];
  return <ModeToolbar groups={groups} />;
}
