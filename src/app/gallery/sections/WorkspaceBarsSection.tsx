import { useRef, useState } from 'react';
import {
  AnchoredToolbar,
  Button,
  DockedToolbar,
  IconButton,
  Stepper,
  ToolbarDivider,
  FloatingDock,
  FloatingPalette,
  ModeTabs,
  Toolbar,
  type ModeTabItem,
  type ToolGroup,
} from '@/shared/ui';
import {
  IconCheck,
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
  const [size, setSize] = useState(10.5);
  const [bar, setBar] = useState<'anchored' | 'docked' | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const contextControls = (
    <>
      <Stepper
        value={size}
        min={6}
        max={72}
        step={0.5}
        label="Text size in points"
        decrementLabel="Smaller text"
        incrementLabel="Larger text"
        onValueChange={setSize}
      />
      <ToolbarDivider />
      <IconButton
        label="Done"
        icon={IconCheck}
        variant="ghost"
        size="sm"
        onClick={() => setBar(null)}
      />
    </>
  );
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
      <Row label="Toolbar, labels responsive (text from md up), one scrolling row">
        <div className="w-full max-w-md rounded-lg border border-line p-1">
          <Toolbar
            label="Labelled organize tools"
            groups={groups}
            labelled
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
            labels="responsive"
          />
        </div>
      </Row>
      <Row label="Stepper, AnchoredToolbar (above its box), DockedToolbar (above the keyboard)">
        <Stepper
          value={size}
          min={6}
          max={72}
          step={0.5}
          label="Gallery size"
          onValueChange={setSize}
        />
        <div
          ref={box}
          className="flex h-8 w-40 items-center rounded-sm px-1 text-sm outline outline-1 outline-accent-indicator"
        >
          Text box
        </div>
        <Button size="sm" onClick={() => setBar('anchored')}>
          Anchored bar
        </Button>
        <Button size="sm" onClick={() => setBar('docked')}>
          Docked bar
        </Button>
        {bar === 'anchored' ? (
          <AnchoredToolbar
            anchor={box}
            label="Gallery text settings"
            onEscape={() => setBar(null)}
          >
            {contextControls}
          </AnchoredToolbar>
        ) : null}
        {bar === 'docked' ? (
          <DockedToolbar
            label="Gallery text settings"
            onEscape={() => setBar(null)}
          >
            {contextControls}
          </DockedToolbar>
        ) : null}
      </Row>
    </Section>
  );
}
