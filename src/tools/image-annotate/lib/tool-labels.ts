import type { ToolId } from './draft';

/** The name of each drawing tool, as its control and the palette show it. */
export const TOOL_LABELS: Record<ToolId, string> = {
  select: 'Select and move',
  arrow: 'Arrow',
  line: 'Line',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  pen: 'Pen',
  text: 'Text',
  step: 'Numbered step',
  highlight: 'Highlighter',
  blur: 'Blur (redact)',
  pixelate: 'Pixelate (redact)',
};

/** "Add arrow in the middle": the keyboard path for drawing with a tool. */
export const placeLabel = (tool: ToolId) =>
  `Add ${TOOL_LABELS[tool].replace(/ \(redact\)$/, '').toLowerCase()} in the middle`;
