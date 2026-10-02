import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routeDrop } from '@/app/drop-routing';
import { getEnabledTools, toolsAccepting } from '@/app/registry';
import type { ToolManifest } from '@/app/tool';
import { ToolError } from '@/shared/lib/errors';
import { sendTo, type HandoffPayload } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { Button } from './button';
import { IconChevronDown, IconSendTo } from './icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './menu';
import { Spinner } from './spinner';

export interface SendToMenuProps {
  /** The payload to hand over, computed when the menu opens (null: nothing yet). */
  payload: () => HandoffPayload | null;
  /** The current tool's id; it is never offered. */
  sourceTool: string;
  label?: string;
  size?: 'sm' | 'md';
  align?: 'start' | 'end';
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

/** The open menu's items (the menu is the trigger's sibling in DropdownMenu). */
const items = (trigger: HTMLElement | null) => [
  ...(trigger?.parentElement?.querySelectorAll<HTMLElement>(
    '[role="menu"] [role="menuitem"]',
  ) ?? []),
];

/**
 * "Send to" menu button (spec §4.3): lists the other enabled tools that take
 * this payload and hands it over with `sendTo`. Arrow keys, Home and End
 * move between items; Esc closes and returns focus to the button.
 */
export const SendToMenu: React.FC<SendToMenuProps> = ({
  payload,
  sourceTool,
  label = 'Send to',
  size = 'sm',
  align = 'end',
}) => {
  const navigate = useNavigate();
  const trigger = useRef<HTMLButtonElement>(null);
  const current = useRef<HandoffPayload | null>(null);
  const seq = useRef(0);
  const [targets, setTargets] = useState<Targets>({ state: 'loading' });

  useEffect(() => {
    if (targets.state === 'ready') items(trigger.current)[0]?.focus();
  }, [targets]);

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

  const select = (tool: ToolManifest) => {
    const p = current.current;
    if (!p) return;
    try {
      sendTo(navigate, tool.id, p);
    } catch (e) {
      notify.error(
        e instanceof ToolError ? e : `Could not send this to ${tool.name}`,
      );
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      trigger.current?.focus();
      return;
    }
    const list = items(trigger.current);
    if (list.length === 0) return;
    const at = list.indexOf(document.activeElement as HTMLElement);
    const next: Record<string, number> = {
      ArrowDown: (at + 1) % list.length,
      ArrowUp: (at - 1 + list.length) % list.length,
      Home: 0,
      End: list.length - 1,
    };
    if (!(e.key in next)) return;
    e.preventDefault();
    list[next[e.key]].focus();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          ref={trigger}
          type="button"
          size={size}
          variant="secondary"
          leftIcon={<IconSendTo size="sm" />}
          rightIcon={<IconChevronDown size="sm" />}
          onClick={(e) => {
            if (e.currentTarget.getAttribute('aria-expanded') !== 'true')
              onOpen();
          }}
        >
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        aria-label={label}
        onKeyDown={onKeyDown}
        className="max-h-80 min-w-56 overflow-y-auto"
      >
        {targets.state === 'loading' ? (
          <p className="flex items-center gap-2 px-3 py-2 text-sm text-fg-muted">
            <Spinner size="sm" decorative />
            Finding tools
          </p>
        ) : targets.state === 'nothing' ? (
          <p className="px-3 py-2 text-sm text-fg-muted">Nothing to send yet</p>
        ) : targets.tools.length === 0 ? (
          <p className="px-3 py-2 text-sm text-fg-muted">
            No other tool accepts this
          </p>
        ) : (
          targets.tools.map((t) => (
            <DropdownMenuItem key={t.id} onClick={() => select(t)}>
              <t.icon size="sm" className="text-fg-muted" />
              {t.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
SendToMenu.displayName = 'SendToMenu';
