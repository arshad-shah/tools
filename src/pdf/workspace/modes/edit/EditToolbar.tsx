import { FilePicker } from '../../ui/FilePicker';
import { type ToolGroup } from '../../ui/tool-groups';
import {
  cursor,
  image as imageIcon,
  pageHeaderFooter,
  pageNumber,
  pageWatermark,
  shapeArrow,
  shapeEllipse,
  shapeLine,
  square,
  type as typeIcon,
  whiteout,
  type IconData,
} from '@arshad-shah/cynosure/icons';
import { ModeToolbar } from '../../ModeToolbar';
import type { ModeProps } from '../types';
import { IMAGE_ACCEPT, pickImage } from './pick-image';
import {
  setEditUi,
  toolOf,
  useEditUi,
  type EditTool,
  type ShapeKind,
} from './ui-store';

const SHAPES: { id: ShapeKind; label: string; icon: IconData }[] = [
  { id: 'rect', label: 'Rectangle', icon: square },
  { id: 'ellipse', label: 'Ellipse', icon: shapeEllipse },
  { id: 'line', label: 'Line', icon: shapeLine },
  { id: 'arrow', label: 'Arrow', icon: shapeArrow },
];

/** Edit tools (plan D-9). */
export function EditToolbar(ctx: ModeProps) {
  const ui = useEditUi();
  const tool = toolOf(ctx.tool.id);
  const choose = (id: EditTool) => ctx.tool.set(id === 'select' ? null : id);
  const toggle = (
    id: EditTool,
    label: string,
    icon: IconData,
    shortcut?: string,
  ) => ({
    id,
    label,
    icon,
    shortcut,
    kind: 'toggle' as const,
    pressed: tool === id,
    onSelect: () => choose(tool === id && id !== 'select' ? 'select' : id),
  });
  const shape = SHAPES.find((s) => s.id === ui.shapeKind)!;
  const groups = (pick: () => void): ToolGroup[] => [
    {
      id: 'content',
      label: 'Content',
      items: [
        toggle('select', 'Select', cursor, 'V'),
        toggle('text', 'Text', typeIcon, 'T'),
        { ...toggle('image', 'Image', imageIcon), onSelect: pick },
        {
          ...toggle('shape', `Shape: ${shape.label}`, shape.icon),
          kind: 'split',
          menu: SHAPES.map((s) => ({
            id: `shape-${s.id}`,
            label: s.label,
            onSelect: () => {
              setEditUi({ shapeKind: s.id });
              choose('shape');
            },
          })),
        },
        toggle('cover', 'Cover and replace', whiteout),
      ],
    },
    {
      id: 'page',
      label: 'Page markup',
      items: [
        toggle('watermark', 'Watermark', pageWatermark),
        toggle('page-numbers', 'Page numbers', pageNumber),
        toggle('header-footer', 'Header and footer', pageHeaderFooter),
      ],
    },
  ];
  return (
    <FilePicker
      accept={IMAGE_ACCEPT}
      onFiles={(files) => files[0] && void pickImage(ctx, files[0])}
    >
      {(pick) => <ModeToolbar groups={groups(pick)} />}
    </FilePicker>
  );
}
