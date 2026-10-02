import type { Command } from '@/shared/lib/commands';
import { REDACT_OPS } from '@/pdf/doc/ops';
import type { ModeContext, ModeModule } from '../types';
import { applyBlocked, askApply, openSearch, toggleArea } from './actions';
import { MarksOverlay } from './MarksOverlay';
import { RedactRailBadge } from './RailBadge';
import { RedactInspector } from './RedactInspector';
import { RedactToolbar } from './RedactToolbar';
import { setRedactUi } from './ui-store';

const GROUP = 'Redact';

function commands(ctx: ModeContext): Command[] {
  return [
    {
      id: 'redact-area',
      label: 'Mark area for redaction',
      group: GROUP,
      run: () => toggleArea(ctx),
    },
    {
      id: 'redact-find',
      label: 'Find and mark for redaction',
      group: GROUP,
      shortcut: 'Mod+F',
      run: openSearch,
    },
    {
      id: 'redact-apply',
      label: 'Apply redactions',
      group: GROUP,
      disabled: applyBlocked(ctx.doc) ?? false,
      run: () => askApply(ctx.doc),
    },
  ];
}

const mode: ModeModule = {
  operations: [...REDACT_OPS],
  Toolbar: RedactToolbar,
  Inspector: RedactInspector,
  inspectorPinned: true,
  PageOverlay: MarksOverlay,
  RailBadge: RedactRailBadge,
  commands,
  shortcuts: () => [
    {
      id: 'redact-find',
      combo: 'Mod+F',
      description: 'Find and mark',
      group: GROUP,
      allowInFields: true,
      run: (e) => {
        e.preventDefault();
        openSearch();
      },
    },
  ],
  onLeave: (ctx) => {
    ctx.tool.set(null);
    setRedactUi({ searchOpen: false, confirmOpen: false });
  },
};

export default mode;
