import { Button, Inline, SegmentedControl } from '@arshad-shah/cynosure';
import {
  brush,
  cursor,
  highlighter,
  listOrdered,
  plus,
  redactArea,
  shapeArrow,
  shapeEllipse,
  shapeLine,
  square,
  type as typeIcon,
  grid,
} from '@arshad-shah/cynosure/icons';
import type { IconData } from '@arshad-shah/cynosure/icons';
import type { ToolId } from '../lib/draft';

interface ToolOption {
  value: ToolId;
  label: string;
  icon: IconData;
}

const SHAPES: ToolOption[] = [
  { value: 'select', label: 'Select and move', icon: cursor },
  { value: 'arrow', label: 'Arrow', icon: shapeArrow },
  { value: 'line', label: 'Line', icon: shapeLine },
  { value: 'rect', label: 'Rectangle', icon: square },
  { value: 'ellipse', label: 'Ellipse', icon: shapeEllipse },
  { value: 'pen', label: 'Pen', icon: brush },
];

const MARKS: ToolOption[] = [
  { value: 'text', label: 'Text', icon: typeIcon },
  { value: 'step', label: 'Numbered step', icon: listOrdered },
  { value: 'highlight', label: 'Highlighter', icon: highlighter },
  { value: 'blur', label: 'Blur (redact)', icon: redactArea },
  { value: 'pixelate', label: 'Pixelate (redact)', icon: grid },
];

const TOOL_LABELS = Object.fromEntries(
  [...SHAPES, ...MARKS].map((t) => [t.value, t.label]),
) as Record<ToolId, string>;

export interface ToolPaletteProps {
  tool: ToolId;
  onTool(tool: ToolId): void;
  /** The keyboard path: add the tool's object in the middle of the image. */
  onPlace(): void;
  disabled?: boolean;
}

/** The drawing tools, in two groups that wrap on a phone. */
export function ToolPalette({
  tool,
  onTool,
  onPlace,
  disabled,
}: ToolPaletteProps) {
  const shape = SHAPES.some((t) => t.value === tool);
  return (
    <Inline gap="3" align="center" wrap>
      <SegmentedControl
        label="Shape tools"
        iconOnly
        disabled={disabled}
        value={shape ? tool : ''}
        onChange={(v) => onTool(v as ToolId)}
        options={SHAPES.map(({ value, label, icon }) => ({
          value,
          label,
          icon,
        }))}
      />
      <SegmentedControl
        label="Marking tools"
        iconOnly
        disabled={disabled}
        value={shape ? '' : tool}
        onChange={(v) => onTool(v as ToolId)}
        options={MARKS.map(({ value, label, icon }) => ({
          value,
          label,
          icon,
        }))}
      />
      {tool !== 'select' ? (
        <Button
          variant="soft"
          size="sm"
          icon={plus}
          disabled={disabled}
          onClick={onPlace}
        >
          {`Add ${TOOL_LABELS[tool].replace(/ \(redact\)$/, '').toLowerCase()} in the middle`}
        </Button>
      ) : null}
    </Inline>
  );
}
