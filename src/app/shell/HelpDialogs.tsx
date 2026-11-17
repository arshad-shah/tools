import { useCallback, useMemo, useState } from 'react';
import { useCommands } from '@/shared/lib/commands';
import { useShortcuts } from '@/shared/lib/hotkeys';
import { LicencesDialog } from '../LicencesDialog';
import { AboutDialog } from './AboutDialog';
import type { HelpApi } from './help-context';
import { PrivacyDialog } from './PrivacyDialog';
import { ShortcutSheet } from './ShortcutSheet';

type Open = 'shortcuts' | 'privacy' | 'licences' | 'about' | null;

/**
 * The shell's help dialogs. The keyboard shortcut sheet opens with `?`
 * (never while typing in a field), from Mod+K and from the Help menu; the
 * privacy note from the navigation footer, the Help menu and Mod+K; the
 * licences and the about box from the Help menu.
 */
export function useHelpDialogs(): HelpApi & { dialogs: React.ReactNode } {
  const [open, setOpen] = useState<Open>(null);
  const openShortcuts = useCallback(() => setOpen('shortcuts'), []);
  const openPrivacy = useCallback(() => setOpen('privacy'), []);
  const openLicences = useCallback(() => setOpen('licences'), []);
  const openAbout = useCallback(() => setOpen('about'), []);
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
          run: openShortcuts,
        },
        {
          id: 'help:privacy',
          label: 'Privacy',
          group: 'Help',
          keywords: ['privacy', 'data', 'network', 'storage'],
          run: openPrivacy,
        },
      ],
    },
    [openShortcuts, openPrivacy],
  );
  const dialogs = useMemo(() => {
    const set = (which: Exclude<Open, null>) => (o: boolean) =>
      setOpen(o ? which : null);
    return (
      <>
        <ShortcutSheet
          open={open === 'shortcuts'}
          onOpenChange={set('shortcuts')}
        />
        <PrivacyDialog
          open={open === 'privacy'}
          onOpenChange={set('privacy')}
        />
        <LicencesDialog
          open={open === 'licences'}
          onOpenChange={set('licences')}
        />
        <AboutDialog open={open === 'about'} onOpenChange={set('about')} />
      </>
    );
  }, [open]);
  return { openShortcuts, openPrivacy, openLicences, openAbout, dialogs };
}
