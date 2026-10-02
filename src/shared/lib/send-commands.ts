import { getTool } from '@/app/registry';
import { useToolCommands } from './tool-commands';

export interface SendCommand {
  /** The receiving tool's id. */
  target: string;
  run(): void;
  /** false while there is nothing to send. */
  enabled?: boolean;
}

/** Palette group of every hand-off command (spec 10). */
export const SEND_GROUP = 'Send result to';

/**
 * Mirrors a tool's direct hand-off buttons in the Mod+K palette as
 * "Send result to <tool name>" commands (spec 10: every hand-off source).
 */
export function useSendCommands(toolId: string, sends: SendCommand[]): void {
  useToolCommands(
    toolId,
    sends.map((s) => ({
      id: `send-${s.target}`,
      label: `Send result to ${getTool(s.target)?.name ?? s.target}`,
      group: SEND_GROUP,
      run: s.run,
      enabled: s.enabled,
    })),
  );
}
