import { useCallback, useMemo, useState } from 'react';
import { useCommands } from '@/shared/lib/commands';
import { useShortcuts } from '@/shared/lib/hotkeys';
import { IconKeyboard, IconShieldCheck } from '@/shared/ui/icons';
import type { HelpApi } from './help-context';
import { PrivacyDialog } from './PrivacyDialog';
import { ShortcutSheet } from './ShortcutSheet';

/**
 * The shell's help dialogs. The keyboard shortcut sheet opens with `?`
 * (never while typing in a field), from the Mod+K palette and from the
 * top-bar help menu; the privacy note from the footer, the help menu and
 * Mod+K.
 */
export function useHelpDialogs(): HelpApi & { dialogs: React.ReactNode } {
  const [sheet, setSheet] = useState(false);
  const openShortcuts = useCallback(() => setSheet(true), []);
  const [privacy, setPrivacy] = useState(false);
  const openPrivacy = useCallback(() => setPrivacy(true), []);
  useShortcuts(
    [
      {
        id: 'shortcut-sheet',
        combo: '?',
        description: 'Show keyboard shortcuts',
        group: 'General',
        run: openShortcuts,
      },
    ],
    [openShortcuts],
  );
  useCommands(
    {
      id: 'app-help',
      commands: () => [
        {
          id: 'help:shortcuts',
          label: 'Keyboard shortcuts',
          group: 'Help',
          keywords: ['keys', 'hotkeys', 'help'],
          shortcut: '?',
          icon: IconKeyboard,
          run: openShortcuts,
        },
        {
          id: 'help:privacy',
          label: 'Privacy',
          group: 'Help',
          keywords: ['privacy', 'data', 'network', 'storage'],
          icon: IconShieldCheck,
          run: openPrivacy,
        },
      ],
    },
    [openShortcuts, openPrivacy],
  );
  const dialogs = useMemo(
    () => (
      <>
        <ShortcutSheet open={sheet} onOpenChange={setSheet} />
        <PrivacyDialog open={privacy} onOpenChange={setPrivacy} />
      </>
    ),
    [sheet, privacy],
  );
  return { openShortcuts, openPrivacy, dialogs };
}
