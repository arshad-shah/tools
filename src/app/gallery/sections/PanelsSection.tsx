import { useRef, useState } from 'react';
import {
  Button,
  Drawer,
  Inspector,
  InspectorSection,
  NumberInput,
  ProgressOverlay,
  SidePanel,
  Switch,
  Text,
} from '@/shared/ui';
import { Row, Section } from '../Section';

/** Docked panels, the inspector in its three surfaces, and progress. */
export function PanelsSection() {
  const [rail, setRail] = useState(160);
  const [x, setX] = useState(72);
  const [lock, setLock] = useState(true);
  const [progress, setProgress] = useState(false);
  const [popover, setPopover] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const sections = (
    <>
      <InspectorSection title="Position">
        <NumberInput aria-label="X" value={x} onValueChange={setX} />
      </InspectorSection>
      <InspectorSection title="Options">
        <Switch
          aria-label="Lock aspect"
          checked={lock}
          onCheckedChange={setLock}
        />
      </InspectorSection>
    </>
  );
  return (
    <Section name="panels" title="Panels and inspector">
      <Row label="SidePanel (resizable) and Inspector panel">
        <div className="flex h-64 w-full overflow-hidden rounded-lg border border-line bg-backdrop">
          <SidePanel
            side="left"
            label="Pages"
            width={rail}
            minWidth={120}
            maxWidth={260}
            onResize={setRail}
          >
            <Text size="sm" tone="muted" className="p-3">
              Page rail, {rail} px wide
            </Text>
          </SidePanel>
          <div className="flex-1" />
          <Inspector
            title="Properties"
            mode="panel"
            open
            onOpenChange={() => {}}
          >
            {sections}
          </Inspector>
        </div>
      </Row>
      <Row label="Inspector popover and sheet, drawer, progress">
        <Button ref={anchor} onClick={() => setPopover((o) => !o)}>
          Inspector popover
        </Button>
        <Inspector
          title="Properties"
          mode="popover"
          anchor={anchor}
          open={popover}
          onOpenChange={setPopover}
        >
          {sections}
        </Inspector>
        <Button onClick={() => setSheet(true)}>Inspector sheet</Button>
        <Inspector
          title="Properties"
          mode="sheet"
          open={sheet}
          onOpenChange={setSheet}
        >
          {sections}
        </Inspector>
        <Button onClick={() => setDrawer(true)}>Pages drawer</Button>
        <Drawer
          open={drawer}
          onOpenChange={setDrawer}
          side="left"
          title="Pages"
        >
          <Text size="sm" tone="muted">
            The page rail opens here in the Focus layout.
          </Text>
        </Drawer>
        <Button onClick={() => setProgress(true)}>Show progress</Button>
        <ProgressOverlay
          open={progress}
          title="Applying changes"
          progress={{ done: 3, total: 10, label: 'Page 3 of 10' }}
          onCancel={() => setProgress(false)}
        />
      </Row>
    </Section>
  );
}
