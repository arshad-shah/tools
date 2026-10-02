import type { Command } from '@/shared/lib/commands';
import { PROTECT_OPS } from '@/pdf/doc/ops';
import type { ModeContext, ModeModule } from '../types';
import { openSanitize } from './protect-ui';
import { ProtectInspector } from './ProtectInspector';
import { ProtectToolbar } from './ProtectToolbar';

const GROUP = 'Protect';

function commands(ctx: ModeContext): Command[] {
  return [
    {
      id: 'protect-password',
      label: 'Password protection',
      group: GROUP,
      run: () => ctx.tool.set('password'),
    },
    {
      id: 'protect-properties',
      label: 'Document properties',
      group: GROUP,
      run: () => ctx.tool.set('properties'),
    },
    {
      id: 'protect-sanitize',
      label: 'Sanitise document',
      group: GROUP,
      disabled: ctx.doc.state.restricted ? 'Unlock editing first' : false,
      run: () => openSanitize(),
    },
  ];
}

const mode: ModeModule = {
  operations: [...PROTECT_OPS],
  Toolbar: ProtectToolbar,
  Inspector: ProtectInspector,
  inspectorPinned: true,
  commands,
  onLeave: (ctx) => {
    ctx.tool.set(null);
    openSanitize(false);
  },
};

export default mode;
