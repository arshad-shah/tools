import type { Command } from '@/shared/lib/commands';
import type { ShortcutDef } from '@/shared/lib/hotkeys';
import { ANNOTATE_OPS } from '@/pdf/doc/ops';
import type { ModeContext, ModeModule } from '../types';
import { deleteSelected } from './actions';
import { AnnotateToolbar } from './AnnotateToolbar';
import { AnnotationsOverlay } from './AnnotationsOverlay';
import { CommentsPanel } from './CommentsPanel';
import { placeStamp } from './place';
import { TOOLS, type AnnotateTool } from './tools';
import { getAnnotateUi, setAnnotateUi } from './ui-store';

const GROUP = 'Annotate';

const pick = (ctx: ModeContext, id: AnnotateTool) => {
  setAnnotateUi({ noTextPage: null });
  ctx.tool.set(id === 'select' ? null : id);
};

/** The centre of the current page, page space. */
function pageCentre(
  ctx: ModeContext,
): { pageId: string; at: [number, number] } | null {
  const page = ctx.doc.view.pages.find((p) => p.id === ctx.doc.currentPage);
  if (!page) return null;
  const [x0, y0, x1, y1] = ctx.doc.pageGeom(page).view;
  const c = page.crop;
  return {
    pageId: page.id,
    at: c
      ? [c.x + c.width / 2, c.y + c.height / 2]
      : [(x0 + x1) / 2, (y0 + y1) / 2],
  };
}

function commands(ctx: ModeContext): Command[] {
  const tools: Command[] = TOOLS.map((t) => ({
    id: `annotate-tool-${t.id}`,
    label: `${t.label} tool`,
    group: GROUP,
    shortcut: t.shortcut,
    run: () => pick(ctx, t.id),
  }));
  return [
    ...tools,
    {
      id: 'annotate-hide-existing',
      label: getAnnotateUi().hideExisting
        ? 'Show existing annotations'
        : 'Hide existing annotations',
      group: GROUP,
      run: () => setAnnotateUi({ hideExisting: !getAnnotateUi().hideExisting }),
    },
    {
      id: 'annotate-show-comments',
      label: 'Show comments',
      group: GROUP,
      run: () =>
        document
          .querySelector<HTMLElement>('#annotate-author')
          ?.focus({ preventScroll: false }),
    },
    {
      id: 'annotate-note-centre',
      label: 'Add note at the centre of the current page',
      group: GROUP,
      run: () => {
        const c = pageCentre(ctx);
        if (c)
          setAnnotateUi({
            editor: { kind: 'note', pageId: c.pageId, at: c.at },
          });
      },
    },
    {
      id: 'annotate-stamp-centre',
      label: 'Add stamp at the centre of the current page',
      group: GROUP,
      run: () => {
        const c = pageCentre(ctx);
        if (c) placeStamp(ctx.doc, c.pageId, c.at);
      },
    },
  ];
}

function shortcuts(ctx: ModeContext): ShortcutDef[] {
  const keys: ShortcutDef[] = TOOLS.filter((t) => t.shortcut).map((t) => ({
    id: `annotate-${t.id}`,
    combo: t.shortcut!,
    description: `${t.label} tool`,
    group: GROUP,
    run: () => pick(ctx, t.id),
  }));
  return [
    ...keys,
    {
      id: 'annotate-delete',
      combo: 'Delete',
      description: 'Delete the selected annotation',
      group: GROUP,
      run: () => void deleteSelected(ctx),
    },
    {
      id: 'annotate-backspace',
      combo: 'Backspace',
      description: 'Delete the selected annotation',
      group: GROUP,
      run: () => void deleteSelected(ctx),
    },
  ];
}

const mode: ModeModule = {
  operations: [...ANNOTATE_OPS],
  Toolbar: AnnotateToolbar,
  Inspector: CommentsPanel,
  inspectorPinned: true,
  PageOverlay: AnnotationsOverlay,
  commands,
  shortcuts,
  onLeave: (ctx) => {
    ctx.tool.set(null);
    setAnnotateUi({ editor: null, selectedExisting: null, noTextPage: null });
  },
};

export default mode;
