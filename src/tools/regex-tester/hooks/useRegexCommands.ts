import { useToolCommands, type ToolCommand } from '@/shared/lib/tool-commands';
import { FLAG_INFO } from '../lib/flags';
import { REGEX_MODES, type RegexMode } from '../settings';

export const MODE_LABEL: Record<RegexMode, string> = {
  match: 'Match',
  replace: 'Replace',
  split: 'Split',
  tests: 'Tests',
};

export interface RegexCommandActions {
  toggleFlag(letter: string): void;
  setMode(mode: RegexMode): void;
  copyCode(): void;
  canCopyCode: boolean;
  share(): void;
  canShare: boolean;
  clear(): void;
  loadSample(): void;
  focusExplain(): void;
}

/** The Regex Tester's palette commands and shortcuts (spec 8.1). */
export function useRegexCommands(a: RegexCommandActions): void {
  const commands: ToolCommand[] = [
    ...FLAG_INFO.map((f) => ({
      id: `flag-${f.flag}`,
      label: `Toggle ${f.label.toLowerCase()} flag (${f.flag})`,
      shortcut: `Alt+${f.flag.toUpperCase()}`,
      group: 'Flags',
      run: () => a.toggleFlag(f.flag),
    })),
    ...REGEX_MODES.map((m, i) => ({
      id: `mode-${m}`,
      label: `${MODE_LABEL[m]} mode`,
      shortcut: `Alt+${i + 1}`,
      group: 'Mode',
      run: () => a.setMode(m),
    })),
    {
      id: 'copy-code',
      label: 'Copy code',
      run: a.copyCode,
      enabled: a.canCopyCode,
    },
    {
      id: 'share',
      label: 'Share',
      shortcut: 'Mod+Shift+S',
      run: a.share,
      enabled: a.canShare,
    },
    { id: 'clear', label: 'Clear', run: a.clear },
    { id: 'sample', label: 'Load sample', run: a.loadSample },
    { id: 'explain', label: 'Focus explanation', run: a.focusExplain },
  ];
  useToolCommands('regex-tester', commands);
}
