import { useNavigate } from 'react-router-dom';
import { useCommands } from '@/shared/lib/commands';
import { useTheme } from '@/shared/lib/theme';
import { readClipboardText } from '@/shared/lib/clipboard';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import {
  curlCommand,
  favouriteCommands,
  routeCommands,
  themeCommands,
  toolCommands,
} from '../commands/app-commands';
import { useFavoritesStore } from '../favorites';
import { TOOLS } from '../registry';

/**
 * Back to the previous page, with its scroll and inputs (6-H). Alt+Left is
 * the browser's own shortcut, shown here so people find it.
 */
const BACK_COMMANDS = {
  id: 'app-back',
  commands: () => [
    {
      id: 'app:back',
      label: 'Go back',
      group: 'Pages',
      keywords: ['back', 'previous', 'return'],
      shortcut: 'Alt+ArrowLeft',
      run: () => window.history.back(),
    },
  ],
};

/** The global Mod+K sources: favourites, routes, tools, theme and cURL import. */
export function useAppCommands(): void {
  const navigate = useNavigate();
  const { setPreference } = useTheme();
  // Registration order is the empty-query group order: favourites first.
  useCommands(
    favouriteCommands(navigate, () => useFavoritesStore.getState().ids, TOOLS),
    [navigate],
  );
  useCommands(routeCommands(navigate), [navigate]);
  useCommands(toolCommands(navigate, TOOLS), [navigate]);
  useCommands(themeCommands(setPreference), [setPreference]);
  useCommands(BACK_COMMANDS, []);
  useCommands(
    curlCommand(navigate, readClipboardText, (e) =>
      notify.error(toToolError(e, 'Could not read the clipboard')),
    ),
    [navigate],
  );
}
