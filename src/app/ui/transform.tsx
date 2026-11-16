import {
  Button,
  Inline,
  Menu,
  SplitPane,
  Stack,
  Tooltip,
} from '@arshad-shah/cynosure';
import { send, share as shareIcon } from '@arshad-shah/cynosure/icons';
import React, { useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { routeDrop } from '@/app/drop-routing';
import { getEnabledTools, toolsAccepting } from '@/app/registry';
import type { ToolManifest } from '@/app/tool';
import { ToolError } from '@/shared/lib/errors';
import { sendTo, type HandoffPayload } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { SEND_GROUP } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import type { ShareableState } from '@/shared/lib/use-shareable-state';
import { ToolActionsSlot } from '@/shared/lib/tool-actions-slot';

export interface TransformLayoutProps {
  start: React.ReactNode;
  end: React.ReactNode;
  /** Input pane share, in percent (default 45). */
  defaultSize?: number;
}

/**
 * Below this width of its own (px) a two-pane SplitPane stacks its panes:
 * about a 1200px window beside the navigation.
 */
export const PANES_STACK_BELOW = 880;

/**
 * The transform pattern's two panes (redesign spec): input and output side
 * by side in a SplitPane, stacked when it is narrow (`stackBelow`).
 */
export function TransformLayout({
  start,
  end,
  defaultSize = 45,
}: TransformLayoutProps) {
  return (
    <SplitPane
      label="Resize the input and output"
      defaultSize={defaultSize}
      min={30}
      max={70}
      stackBelow={PANES_STACK_BELOW}
      start={<Stack paddingInline="3">{start}</Stack>}
      end={<Stack paddingInline="3">{end}</Stack>}
    />
  );
}

/**
 * Page-level actions (Share, Send to): portalled into the tool page header
 * beside the favourite star; in place where there is no header (tests).
 */
export function ToolActions({ children }: { children: React.ReactNode }) {
  const slot = useContext(ToolActionsSlot);
  if (slot) return createPortal(children, slot);
  return (
    <Inline gap="2" align="center" justify="end" wrap>
      {children}
    </Inline>
  );
}

/** What ShareButton needs from `useShareableState`. */
export type ShareControl = Pick<
  ShareableState<unknown>,
  'canShare' | 'reason'
> & { share(): Promise<string> | void };

/**
 * Copies a link to the tool's state. When sharing is off it stays focusable
 * (aria-disabled) so its tooltip can say why. `share()` reports its own
 * success and failure.
 */
export function ShareButton({
  share,
  label = 'Share',
}: {
  share: ShareControl;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const off = !share.canShare;
  const onClick = async () => {
    if (off || busy) return;
    setBusy(true);
    try {
      await share.share();
    } catch {
      // Reported by share() itself.
    } finally {
      setBusy(false);
    }
  };
  return (
    <Tooltip
      content={
        off
          ? (share.reason ?? 'Sharing is not available')
          : 'Copy a link to this state'
      }
    >
      <Button
        variant="soft"
        icon={shareIcon}
        aria-disabled={off || undefined}
        loading={busy}
        onClick={() => void onClick()}
      >
        {label}
      </Button>
    </Tooltip>
  );
}

type Targets =
  | { state: 'loading' }
  | { state: 'nothing' }
  | { state: 'ready'; tools: ToolManifest[] };

/** Tools a payload can go to: by mime for text, by sniffed kind for files. */
async function targetsFor(
  p: HandoffPayload,
  source: string,
): Promise<ToolManifest[]> {
  const others = (tools: ToolManifest[]) =>
    tools.filter((t) => t.id !== source);
  if (p.kind === 'text') return others(toolsAccepting(p.mime));
  const d = await routeDrop(p.files, getEnabledTools());
  if (d.type === 'navigate') return others([d.tool]);
  if (d.type === 'choose') return others(d.options.map((o) => o.tool));
  return [];
}

export interface SendToMenuProps {
  /** The payload, computed when the menu opens (null: nothing yet). */
  payload: () => HandoffPayload | null;
  /** The current tool, never offered. */
  sourceTool: string;
  label?: string;
}

/**
 * "Send to": the other tools that take this payload, as a Menu. The command
 * palette opens it too ("Send result to…").
 */
export function SendToMenu({
  payload,
  sourceTool,
  label = 'Send to',
}: SendToMenuProps) {
  const navigate = useNavigate();
  const trigger = useRef<HTMLButtonElement | null>(null);
  const current = useRef<HandoffPayload | null>(null);
  const seq = useRef(0);
  const [targets, setTargets] = useState<Targets>({ state: 'loading' });

  useToolCommands(sourceTool, [
    {
      id: `send-menu-${label}`,
      label: label === 'Send to' ? 'Send result to…' : `${label}…`,
      group: SEND_GROUP,
      run: () => requestAnimationFrame(() => trigger.current?.click()),
    },
  ]);

  const onOpen = () => {
    const run = ++seq.current;
    const p = payload();
    current.current = p;
    if (!p) return setTargets({ state: 'nothing' });
    setTargets({ state: 'loading' });
    void targetsFor(p, sourceTool).then(
      (tools) => {
        if (run === seq.current) setTargets({ state: 'ready', tools });
      },
      () => {
        if (run === seq.current) setTargets({ state: 'ready', tools: [] });
      },
    );
  };

  const select = (id: string) => {
    const p = current.current;
    const tool =
      targets.state === 'ready' && targets.tools.find((t) => t.id === id);
    if (!p || !tool) return;
    try {
      sendTo(navigate, tool.id, p);
    } catch (e) {
      notify.error(
        e instanceof ToolError ? e : `Could not send this to ${tool.name}`,
      );
    }
  };

  const items =
    targets.state === 'ready' && targets.tools.length
      ? targets.tools.map((t) => ({ value: t.id, label: t.name }))
      : [
          {
            value: '-',
            disabled: true,
            label:
              targets.state === 'loading'
                ? 'Finding tools'
                : targets.state === 'nothing'
                  ? 'Nothing to send yet'
                  : 'No other tool accepts this',
          },
        ];

  return (
    <Menu
      label={label}
      items={items}
      onSelect={select}
      onOpenChange={(open) => {
        if (open) onOpen();
      }}
      trigger={(props) => (
        <Button
          {...props}
          ref={(el) => {
            trigger.current = el;
            const r = props.ref;
            if (typeof r === 'function') r(el);
            else if (r)
              (r as React.RefObject<HTMLButtonElement | null>).current = el;
          }}
          variant="soft"
          icon={send}
        >
          {label}
        </Button>
      )}
    />
  );
}
