import { FilePicker, type ToolGroup } from '@/shared/ui';
import {
  IconArrowAnnot,
  IconCoverReplace,
  IconEllipseAnnot,
  IconHeaderFooter,
  IconImage,
  IconLineAnnot,
  IconPageNumbers,
  IconSelectTool,
  IconSquare,
  IconType,
  IconWatermark,
  type IconComponent,
} from '@/shared/ui/icons';
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

const SHAPES: { id: ShapeKind; label: string; icon: IconComponent }[] = [
  { id: 'rect', label: 'Rectangle', icon: IconSquare },
  { id: 'ellipse', label: 'Ellipse', icon: IconEllipseAnnot },
  { id: 'line', label: 'Line', icon: IconLineAnnot },
  { id: 'arrow', label: 'Arrow', icon: IconArrowAnnot },
];

/** Edit tools (plan D-9). */
export function EditToolbar(ctx: ModeProps) {
  const ui = useEditUi();
  const tool = toolOf(ctx.tool.id);
  const choose = (id: EditTool) => ctx.tool.set(id === 'select' ? null : id);
  const toggle = (
    id: EditTool,
    label: string,
    icon: IconComponent,
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
        toggle('select', 'Select', IconSelectTool, 'V'),
        toggle('text', 'Text', IconType, 'T'),
        { ...toggle('image', 'Image', IconImage), onSelect: pick },
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
        toggle('cover', 'Cover and replace', IconCoverReplace),
      ],
    },
    {
      id: 'page',
      label: 'Page markup',
      items: [
        toggle('watermark', 'Watermark', IconWatermark),
        toggle('page-numbers', 'Page numbers', IconPageNumbers),
        toggle('header-footer', 'Header and footer', IconHeaderFooter),
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
