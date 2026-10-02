import { useState } from 'react';
import {
  Button,
  FloatingDock,
  FloatingPalette,
  ModeTabs,
  Toolbar,
  type ModeTabItem,
  type ToolGroup,
} from '@/shared/ui';
import {
  IconFileDown,
  IconGauge,
  IconHighlighter,
  IconLayoutGrid,
  IconLock,
  IconPen,
  IconRedo,
  IconRotateCw,
  IconSearch,
  IconSquare,
  IconTrash,
  IconType,
  IconUndo,
} from '@/shared/ui/icons';
import { Row, Section } from '../Section';

const MODES: ModeTabItem[] = [
  { id: 'organize', label: 'Organize', icon: IconLayoutGrid, shortcut: '1' },
  { id: 'fill-sign', label: 'Fill and sign', icon: IconPen, shortcut: '2' },
  { id: 'annotate', label: 'Annotate', icon: IconHighlighter, shortcut: '3' },
  { id: 'edit', label: 'Edit', icon: IconType, shortcut: '4' },
  { id: 'redact', label: 'Redact', icon: IconSquare, shortcut: '5' },
  { id: 'protect', label: 'Protect', icon: IconLock, shortcut: '6' },
  { id: 'optimize', label: 'Optimize', icon: IconGauge, shortcut: '7' },
  { id: 'convert', label: 'Convert', icon: IconFileDown, shortcut: '8' },
  { id: 'ocr', label: 'OCR', icon: IconSearch, shortcut: '9', badge: 'New' },
];

/** ModeTabs/FloatingDock and Toolbar/FloatingPalette, each pair from one data set. */
export function WorkspaceBarsSection() {
  const [mode, setMode] = useState('organize');
  const [side, setSide] = useState<'left' | 'right'>('left');
  const [highlight, setHighlight] = useState(true);
  const groups: ToolGroup[] = [
    {
      id: 'history',
      label: 'History',
      items: [
        {
          id: 'undo',
          label: 'Undo',
          icon: IconUndo,
          kind: 'button',
          shortcut: 'Mod+Z',
          onSelect: () => {},
        },
        {
          id: 'redo',
          label: 'Redo',
          icon: IconRedo,
          kind: 'button',
          shortcut: 'Mod+Shift+Z',
          disabled: 'Nothing to redo',
          onSelect: () => {},
        },
      ],
    },
    {
      id: 'pages',
      label: 'Pages',
      items: [
        {
          id: 'rotate',
          label: 'Rotate right',
          icon: IconRotateCw,
          kind: 'split',
          shortcut: 'R',
          onSelect: () => {},
          menu: [
            { id: 'cw', label: 'Rotate right', onSelect: () => {} },
            { id: 'ccw', label: 'Rotate left', onSelect: () => {} },
            { id: 'half', label: 'Rotate half a turn', onSelect: () => {} },
          ],
        },
        {
          id: 'highlight',
          label: 'Highlight',
          icon: IconHighlighter,
          kind: 'toggle',
          pressed: highlight,
          onSelect: () => setHighlight((h) => !h),
        },
        {
          id: 'delete',
          label: 'Delete pages',
          icon: IconTrash,
          kind: 'button',
          shortcut: 'Delete',
          onSelect: () => {},
        },
      ],
    },
  ];
  return (
    <Section name="workspace-bars" title="Mode tabs, dock, toolbar, palette">
      <Row label="ModeTabs (overflow into More)">
        <div className="w-full max-w-2xl border-b border-line">
          <ModeTabs
            label="Modes"
            items={MODES}
            value={mode}
            onChange={setMode}
          />
        </div>
      </Row>
      <Row label="Toolbar (horizontal), the mode tabs' panel">
        <div id="mode-panel" role="tabpanel" aria-label={`${mode} mode`}>
          <Toolbar
            label="Organize tools"
            groups={groups}
            trailing={<Button size="sm">Export</Button>}
          />
        </div>
      </Row>
      <Row label="FloatingDock and FloatingPalette (contained here)">
        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-backdrop [contain:layout]">
          <FloatingPalette
            label="Tools"
            groups={groups}
            side={side}
            onSideChange={setSide}
          />
          <FloatingDock
            label="Modes"
            items={MODES.slice(0, 5)}
            value={mode}
            onChange={setMode}
          />
        </div>
      </Row>
    </Section>
  );
}
