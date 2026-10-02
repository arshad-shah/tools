import type { Command } from '@/shared/lib/commands';
import { ORGANIZE_OPS } from '@/pdf/doc/ops';
import type { ModeContext, ModeModule } from '../types';
import {
  deleteBlocked,
  deletePages,
  duplicatePages,
  insertBlank,
  rotate,
} from './actions';
import { CropTool } from './CropTool';
import { OrganizeToolbar } from './OrganizeToolbar';
import { openOrganizeDialog } from './ui-store';

const GROUP = 'Organize';

function commands(ctx: ModeContext): Command[] {
  return [
    {
      id: 'organize-rotate-right',
      label: 'Rotate pages right',
      group: GROUP,
      shortcut: 'R',
      run: () => rotate(ctx, 90),
    },
    {
      id: 'organize-rotate-left',
      label: 'Rotate pages left',
      group: GROUP,
      shortcut: 'Shift+R',
      run: () => rotate(ctx, -90),
    },
    {
      id: 'organize-delete',
      label: 'Delete pages',
      group: GROUP,
      shortcut: 'Delete',
      disabled: deleteBlocked(ctx) ?? false,
      run: () => deletePages(ctx),
    },
    {
      id: 'organize-duplicate',
      label: 'Duplicate pages',
      group: GROUP,
      shortcut: 'Mod+D',
      run: () => duplicatePages(ctx),
    },
    {
      id: 'organize-blank',
      label: 'Insert blank page',
      group: GROUP,
      run: () => insertBlank(ctx),
    },
    {
      id: 'organize-crop',
      label: 'Crop pages',
      group: GROUP,
      run: () => ctx.tool.set('crop'),
    },
    {
      id: 'organize-size',
      label: 'Change page size',
      group: GROUP,
      run: () => openOrganizeDialog('size'),
    },
    {
      id: 'organize-labels',
      label: 'Page labels',
      group: GROUP,
      run: () => openOrganizeDialog('labels'),
    },
    {
      id: 'organize-split',
      label: 'Split into files',
      group: GROUP,
      run: () => openOrganizeDialog('split'),
    },
  ];
}

const mode: ModeModule = {
  operations: [...ORGANIZE_OPS],
  Toolbar: OrganizeToolbar,
  PageOverlay: CropTool,
  commands,
  shortcuts: (ctx) => [
    {
      id: 'organize-r',
      combo: 'R',
      description: 'Rotate right',
      group: GROUP,
      run: () => rotate(ctx, 90),
    },
    {
      id: 'organize-shift-r',
      combo: 'Shift+R',
      description: 'Rotate left',
      group: GROUP,
      run: () => rotate(ctx, -90),
    },
    {
      id: 'organize-delete',
      combo: 'Delete',
      description: 'Delete pages',
      group: GROUP,
      run: () => deletePages(ctx),
    },
    {
      id: 'organize-backspace',
      combo: 'Backspace',
      description: 'Delete pages',
      group: GROUP,
      run: () => deletePages(ctx),
    },
    {
      id: 'organize-duplicate',
      combo: 'Mod+D',
      description: 'Duplicate pages',
      group: GROUP,
      run: () => duplicatePages(ctx),
    },
  ],
  onLeave: (ctx) => ctx.tool.set(null),
};

export default mode;
