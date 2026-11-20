import {
  IconButton,
  Inline,
  Menu,
  SegmentedControl,
} from '@arshad-shah/cynosure';
import {
  brush,
  cursor,
  grid,
  highlighter,
  listOrdered,
  moreHorizontal,
  plus,
  redactArea,
  shapeArrow,
  shapeEllipse,
  shapeLine,
  square,
  type as typeIcon,
} from '@arshad-shah/cynosure/icons';
import type { IconData } from '@arshad-shah/cynosure/icons';
import type { ToolId } from '../lib/draft';
import { placeLabel, TOOL_LABELS } from '../lib/tool-labels';

interface ToolOption {
  value: ToolId;
  label: string;
  icon: IconData;
}

/** The tools most mark-ups need, always in view. */
const MAIN: ToolOption[] = [
  { value: 'select', label: TOOL_LABELS.select, icon: cursor },
  { value: 'arrow', label: TOOL_LABELS.arrow, icon: shapeArrow },
  { value: 'rect', label: TOOL_LABELS.rect, icon: square },
  { value: 'text', label: TOOL_LABELS.text, icon: typeIcon },
  { value: 'step', label: TOOL_LABELS.step, icon: listOrdered },
  { value: 'highlight', label: TOOL_LABELS.highlight, icon: highlighter },
  { value: 'blur', label: TOOL_LABELS.blur, icon: redactArea },
];

/** The rest, one menu away. */
const MORE: ToolOption[] = [
  { value: 'line', label: TOOL_LABELS.line, icon: shapeLine },
  { value: 'ellipse', label: TOOL_LABELS.ellipse, icon: shapeEllipse },
  { value: 'pen', label: TOOL_LABELS.pen, icon: brush },
  { value: 'pixelate', label: TOOL_LABELS.pixelate, icon: grid },
];

export interface ToolPaletteProps {
  tool: ToolId;
  onTool(tool: ToolId): void;
  /** The keyboard path: add the tool's object in the middle of the image. */
  onPlace(): void;
  disabled?: boolean;
}

/**
 * The drawing tools: the common ones as one segmented row, the rest in a
 * "More tools" menu whose button takes the icon of the one in use.
 */
export function ToolPalette({
  tool,
  onTool,
  onPlace,
  disabled,
}: ToolPaletteProps) {
  const extra = MORE.find((t) => t.value === tool);
  return (
    <Inline gap="2" align="center" wrap>
      <SegmentedControl
        label="Drawing tools"
        iconOnly
        disabled={disabled}
        value={extra ? '' : tool}
        onChange={(v) => onTool(v as ToolId)}
        options={MAIN.map(({ value, label, icon }) => ({
          value,
          label,
          icon,
        }))}
      />
      <Menu
        label="More tools"
        items={MORE.map(({ value, label, icon }) => ({
          value,
          label,
          icon,
          kind: 'radio' as const,
          checked: value === tool,
          keepOpen: false,
        }))}
        onSelect={(v) => onTool(v as ToolId)}
        trigger={(props) => (
          <IconButton
            {...props}
            // The trigger shows the menu's tool while one is in use.
            icon={extra?.icon ?? moreHorizontal}
            label={extra ? `More tools, ${extra.label} in use` : 'More tools'}
            variant={extra ? 'soft' : 'ghost'}
            tone={extra ? 'accent' : 'neutral'}
            disabled={disabled}
          />
        )}
      />
      {tool !== 'select' ? (
        <IconButton
          variant="soft"
          tone="neutral"
          icon={plus}
          label={placeLabel(tool)}
          disabled={disabled}
          onClick={onPlace}
        />
      ) : null}
    </Inline>
  );
}
