import React, { useEffect, useRef, useState } from 'react';
import { useCommands } from '@/shared/lib/commands';
import { useShortcuts } from '@/shared/lib/hotkeys';
import { Button, Dialog } from '@arshad-shah/cynosure';
import { ErrorNotice, LoadingLine } from './ui/states';
import type { ModeId } from '@/pdf/doc/types';
import type { ModeContext, ModeManifest, ModeModule } from './modes/types';
import { useModeModule } from './use-mode-module';

export interface ModeHostApi {
  module: ModeModule | null;
  /** Switches mode after asking the current mode's canExit. */
  request(id: ModeId): void;
  /** The mode's toolbar (or its loading/error state) for the toolbar slot. */
  toolbar: React.ReactNode;
}

export interface ModeHostProps {
  manifest: ModeManifest;
  ctx: ModeContext;
  onModeChange(id: ModeId): void;
  children(api: ModeHostApi): React.ReactNode;
}

/** Commands, shortcuts and lifecycle of the loaded mode, while it is active. */
function ActiveMode({ module, ctx }: { module: ModeModule; ctx: ModeContext }) {
  const latest = useRef(ctx);
  useEffect(() => {
    latest.current = ctx;
  });
  useCommands(
    { id: 'workspace-mode', commands: () => module.commands(latest.current) },
    [module],
  );
  useShortcuts(module.shortcuts?.(ctx) ?? [], [module, ctx]);
  useEffect(() => {
    module.onEnter?.(latest.current);
    return () => module.onLeave?.(latest.current);
  }, [module]);
  return null;
}

/**
 * Hosts the active mode (spec §7.1): loads it lazily, renders its toolbar,
 * registers its commands and shortcuts while active, calls onEnter/onLeave
 * and asks canExit before switching away.
 */
export function ModeHost({
  manifest,
  ctx,
  onModeChange,
  children,
}: ModeHostProps) {
  const { module, error } = useModeModule(manifest);
  const [leaving, setLeaving] = useState<{
    to: ModeId;
    reason: string;
  } | null>(null);

  const request = (to: ModeId) => {
    if (to === manifest.id) return;
    const verdict = module?.canExit?.(ctx) ?? true;
    if (verdict === true) onModeChange(to);
    else setLeaving({ to, reason: verdict });
  };

  const Toolbar = module?.Toolbar;
  const toolbar = error ? (
    <ErrorNotice error={error} />
  ) : Toolbar ? (
    <Toolbar {...ctx} />
  ) : (
    <LoadingLine label={`Loading ${manifest.label}`} />
  );

  return (
    <>
      {module ? (
        <ActiveMode key={manifest.id} module={module} ctx={ctx} />
      ) : null}
      {children({ module, request, toolbar })}
      <Dialog
        open={leaving !== null}
        onOpenChange={(open) => !open && setLeaving(null)}
        title={`Leave ${manifest.label}?`}
        description={leaving?.reason}
        size="sm"
        actions={
          <>
            <Button variant="ghost" onClick={() => setLeaving(null)}>
              Stay
            </Button>
            <Button
              variant="solid"
              tone="accent"
              onClick={() => {
                const to = leaving?.to;
                setLeaving(null);
                if (to) onModeChange(to);
              }}
            >
              Leave
            </Button>
          </>
        }
      />
    </>
  );
}
