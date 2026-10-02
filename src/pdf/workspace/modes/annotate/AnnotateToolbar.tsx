import { FilePicker, type ToolGroup, type ToolItem } from '@/shared/ui';
import {
  IconCircle,
  IconEraser,
  IconHighlighter,
  IconPen,
  IconSquare,
  IconStickyNote,
  IconStrikethrough,
  IconUnderline,
  IconArrowAnnot,
  IconLineAnnot,
  IconSelectTool,
  IconSquiggly,
  IconStampPreset,
  IconTextComment,
  type IconComponent,
} from '@/shared/ui/icons';
import { STAMP_NAMES, STAMP_PRESETS } from '@/pdf/doc/ops/annotate-params';
import { ModeToolbar } from '../../ModeToolbar';
import type { ModeProps } from '../types';
import { IMAGE_ACCEPT, pickImageStamp } from './image-stamp';
import { activeTool, TOOLS, type AnnotateTool } from './tools';
import { setAnnotateUi, useAnnotateUi } from './ui-store';

const ICONS: Record<AnnotateTool, IconComponent> = {
  select: IconSelectTool,
  freetext: IconTextComment,
  highlight: IconHighlighter,
  underline: IconUnderline,
  strike: IconStrikethrough,
  squiggly: IconSquiggly,
  note: IconStickyNote,
  pen: IconPen,
  rect: IconSquare,
  ellipse: IconCircle,
  line: IconLineAnnot,
  arrow: IconArrowAnnot,
  stamp: IconStampPreset,
  eraser: IconEraser,
};

const GROUPS: { id: string; label: string; tools: AnnotateTool[] }[] = [
  { id: 'select', label: 'Select', tools: ['select'] },
  {
    id: 'text',
    label: 'Text',
    tools: ['freetext', 'highlight', 'underline', 'strike', 'squiggly', 'note'],
  },
  {
    id: 'draw',
    label: 'Draw',
    tools: ['pen', 'rect', 'ellipse', 'line', 'arrow', 'stamp', 'eraser'],
  },
];

/** Annotate tools (spec §13.1 labels and shortcuts); style lives in the inspector. */
export function AnnotateToolbar(ctx: ModeProps) {
  const ui = useAnnotateUi();
  const current = activeTool(ctx.tool.id);
  const choose = (id: AnnotateTool) => {
    setAnnotateUi({ noTextPage: null });
    ctx.tool.set(id === 'select' ? null : id);
  };
  const groups = (pickFile: () => void): ToolGroup[] =>
    GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      items: g.tools.map((id): ToolItem => {
        const def = TOOLS.find((t) => t.id === id)!;
        const base: ToolItem = {
          id,
          label: def.label,
          icon: ICONS[id],
          shortcut: def.shortcut,
          kind: 'toggle',
          pressed: current === id,
          onSelect: () => choose(id),
        };
        if (id !== 'stamp') return base;
        return {
          ...base,
          label: ui.imageStamp
            ? 'Stamp: image'
            : `Stamp: ${STAMP_NAMES[ui.stamp ?? 'Approved']}`,
          kind: 'split',
          menu: [
            ...STAMP_PRESETS.map((p) => ({
              id: `stamp-${p}`,
              label: STAMP_NAMES[p],
              onSelect: () => {
                setAnnotateUi({ stamp: p, imageStamp: null });
                choose('stamp');
              },
            })),
            { id: 'stamp-image', label: 'Image stamp...', onSelect: pickFile },
          ],
        };
      }),
    }));
  return (
    <FilePicker
      accept={IMAGE_ACCEPT}
      onFiles={(files) => files[0] && void pickImageStamp(ctx, files[0])}
    >
      {(pick) => <ModeToolbar groups={groups(pick)} />}
    </FilePicker>
  );
}
