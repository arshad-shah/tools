import { useState } from 'react';
import {
  Button,
  DeviceFrame,
  FocusOverlay,
  Heading,
  PrivacyNote,
  SplitPane,
  Text,
} from '@/shared/ui';
import { Row, Section } from '../Section';

function Pane({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col gap-1 overflow-auto bg-surface p-3">
      <Text size="sm" weight="medium">
        {title}
      </Text>
      <Text size="xs" tone="muted">
        {body}
      </Text>
    </div>
  );
}

/** A tiny page shown inside the device frames. */
function MiniPage() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <Heading level={3} size="md">
        Order summary
      </Heading>
      <Text size="sm" tone="muted">
        Three items, shipping to London.
      </Text>
      <div className="h-16 rounded-md bg-surface-2" />
      <Button size="sm">Pay 129.95</Button>
      <PrivacyNote variant="local" />
    </div>
  );
}

export function PanesSection() {
  const [focus, setFocus] = useState(false);
  return (
    <Section name="panes" title="Panes and frames">
      <Row label="SplitPane: horizontal, collapsible both, 40 percent">
        <SplitPane
          direction="horizontal"
          defaultRatio={0.4}
          collapsible="both"
          stackBelow="sm"
          separatorLabel="Resize input and output"
          className="h-48 w-full rounded-md border border-line"
        >
          <Pane title="Input" body="Paste JSON, CSV or YAML here." />
          <Pane title="Output" body="The converted document appears here." />
        </SplitPane>
      </Row>
      <Row label="SplitPane: vertical, collapsible end">
        <SplitPane
          direction="vertical"
          defaultRatio={0.6}
          collapsible="end"
          stackBelow={false}
          separatorLabel="Resize editor and console"
          className="h-64 w-full max-w-xl rounded-md border border-line"
        >
          <Pane title="Editor" body="SELECT id, total FROM orders LIMIT 10" />
          <Pane title="Console" body="10 rows in 4 ms." />
        </SplitPane>
      </Row>
      <Row label="DeviceFrame: two custom sizes">
        <div className="flex w-full min-w-0 flex-wrap items-start gap-4">
          <DeviceFrame preset={{ width: 320, height: 300 }}>
            <MiniPage />
          </DeviceFrame>
          <DeviceFrame preset={{ width: 480, height: 300 }}>
            <MiniPage />
          </DeviceFrame>
        </div>
      </Row>
      <Row label="FocusOverlay">
        <Button variant="secondary" onClick={() => setFocus(true)}>
          Open focus view
        </Button>
        <FocusOverlay
          open={focus}
          onClose={() => setFocus(false)}
          label="Output, focus view"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            <Heading level={2} size="lg">
              Output
            </Heading>
            <Text tone="muted">
              The pane fills the window. Press Escape or Close to go back.
            </Text>
            <pre className="rounded-md border border-line bg-surface p-4 font-mono text-sm text-fg">
              {JSON.stringify(
                { id: 'ord_20260914_0042', status: 'shipped', total: 129.95 },
                null,
                2,
              )}
            </pre>
          </div>
        </FocusOverlay>
      </Row>
    </Section>
  );
}
