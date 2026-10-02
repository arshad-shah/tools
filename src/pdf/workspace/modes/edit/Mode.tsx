import type { Command } from '@/shared/lib/commands';
import type { ShortcutDef } from '@/shared/lib/hotkeys';
import {
  COVER_OPS,
  EDIT_CONTENT_OPS,
  MARKUP_OPS,
  OBJECT_OPS,
} from '@/pdf/doc/ops';
import type { ModeContext, ModeModule } from '../types';
import { objectActions } from '../../objects/useObjectSelection';
import { EditInspector } from './EditInspector';
import { EditOverlay } from './EditOverlay';
import { EditToolbar } from './EditToolbar';
import { setEditUi, type EditTool } from './ui-store';

const GROUP = 'Edit';

const TOOL_COMMANDS: { id: EditTool; label: string; shortcut?: string }[] = [
  { id: 'select', label: 'Select tool', shortcut: 'V' },
  { id: 'text', label: 'Text tool', shortcut: 'T' },
  { id: 'shape', label: 'Shape tool' },
  { id: 'cover', label: 'Cover and replace' },
  { id: 'watermark', label: 'Add watermark' },
  { id: 'page-numbers', label: 'Add page numbers' },
  { id: 'header-footer', label: 'Add header and footer' },
];

const pick = (ctx: ModeContext, id: EditTool) =>
  ctx.tool.set(id === 'select' ? null : id);

function commands(ctx: ModeContext): Command[] {
  const act = objectActions(ctx.doc, ctx.selection);
  return [
    ...TOOL_COMMANDS.map((t) => ({
      id: `edit-tool-${t.id}`,
      label: t.label,
      group: GROUP,
      shortcut: t.shortcut,
      run: () => pick(ctx, t.id),
    })),
    {
      id: 'edit-copy',
      label: 'Copy objects',
      group: GROUP,
      shortcut: 'Mod+C',
      run: () => void act.copy(),
    },
    {
      id: 'edit-paste',
      label: 'Paste objects',
      group: GROUP,
      shortcut: 'Mod+V',
      run: () => void act.paste(ctx.doc.currentPage),
    },
    {
      id: 'edit-duplicate',
      label: 'Duplicate objects',
      group: GROUP,
      shortcut: 'Mod+D',
      run: () => void act.duplicate(),
    },
    {
      id: 'edit-delete',
      label: 'Delete objects',
      group: GROUP,
      shortcut: 'Delete',
      run: () => void act.remove(),
    },
  ];
}

function shortcuts(ctx: ModeContext): ShortcutDef[] {
  const act = objectActions(ctx.doc, ctx.selection);
  const def = (
    id: string,
    combo: string,
    description: string,
    run: () => unknown,
  ): ShortcutDef => ({
    id: `edit-${id}`,
    combo,
    description,
    group: GROUP,
    run: () => void run(),
  });
  return [
    def('v', 'V', 'Select tool', () => pick(ctx, 'select')),
    def('t', 'T', 'Text tool', () => pick(ctx, 'text')),
    def('delete', 'Delete', 'Delete the selected objects', act.remove),
    def('backspace', 'Backspace', 'Delete the selected objects', act.remove),
    def('copy', 'Mod+C', 'Copy the selected objects', act.copy),
    def('paste', 'Mod+V', 'Paste objects on the current page', () =>
      act.paste(ctx.doc.currentPage),
    ),
    def('duplicate', 'Mod+D', 'Duplicate the selected objects', act.duplicate),
    def('select-all', 'Mod+A', 'Select every object on the page', () =>
      act.selectAll(ctx.doc.currentPage),
    ),
  ];
}

const mode: ModeModule = {
  operations: [...EDIT_CONTENT_OPS, ...MARKUP_OPS, ...COVER_OPS, ...OBJECT_OPS],
  Toolbar: EditToolbar,
  Inspector: EditInspector,
  inspectorPinned: true,
  PageOverlay: EditOverlay,
  commands,
  shortcuts,
  onLeave: (ctx) => {
    ctx.tool.set(null);
    setEditUi({ prompt: null });
  },
};

export default mode;
