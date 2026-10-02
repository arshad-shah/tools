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
  useCommands(
    curlCommand(navigate, readClipboardText, (e) =>
      notify.error(toToolError(e, 'Could not read the clipboard')),
    ),
    [navigate],
  );
}
