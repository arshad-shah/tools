import type { CommandSource } from '@/shared/lib/commands';
import { ToolError } from '@/shared/lib/errors';
import { sendTo } from '@/shared/lib/handoff';
import type { ThemePreference } from '@/shared/lib/theme';
import {
  IconClipboard,
  IconHome,
  IconMonitor,
  IconMoon,
  IconSun,
} from '@/shared/ui/icons';
import { CATEGORIES } from '../categories';
import { categoryPath, toolPath } from '../routes';
import type { ToolManifest } from '../tool';

type Navigate = (path: string) => void;

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

/** Home and every category hub ("Go to PDF"). */
export function routeCommands(navigate: Navigate): CommandSource {
  const commands = [
    {
      id: 'route:home',
      label: 'Go to Home',
      group: 'Pages',
      keywords: ['home', 'start', 'categories'],
      icon: IconHome,
      run: () => navigate('/'),
    },
    ...CATEGORIES.map((c) => ({
      id: `route:${c.id}`,
      label: `Go to ${c.label}`,
      group: 'Pages',
      keywords: [c.id, ...words(c.blurb)],
      icon: c.icon,
      run: () => navigate(categoryPath(c.id)),
    })),
  ];
  return { id: 'app-routes', commands: () => commands };
}

/** One command per enabled tool, searchable by name, keywords and description. */
export function toolCommands(
  navigate: Navigate,
  tools: readonly ToolManifest[],
): CommandSource {
  const commands = tools
    .filter((t) => t.enabled)
    .map((t) => ({
      id: `tool:${t.id}`,
      label: t.name,
      group: 'Tools',
      keywords: [...t.keywords, t.category, ...words(t.description)],
      icon: t.icon,
      run: () => navigate(toolPath(t)),
    }));
  return { id: 'app-tools', commands: () => commands };
}

/** Starred tools, listed first when the query is empty. */
export function favouriteCommands(
  navigate: Navigate,
  favs: () => string[],
  tools: readonly ToolManifest[],
): CommandSource {
  return {
    id: 'app-favourites',
    commands: () =>
      favs()
        .map((id) => tools.find((t) => t.id === id && t.enabled))
        .filter((t): t is ToolManifest => t !== undefined)
        .map((t) => ({
          id: `favourite:${t.id}`,
          label: t.name,
          group: 'Favourites',
          keywords: ['favourite', ...t.keywords],
          icon: t.icon,
          run: () => navigate(toolPath(t)),
        })),
  };
}

export function themeCommands(
  setPreference: (p: ThemePreference) => void,
): CommandSource {
  const commands = [
    {
      id: 'theme:light',
      label: 'Use light theme',
      icon: IconSun,
      run: () => setPreference('light'),
    },
    {
      id: 'theme:dark',
      label: 'Use dark theme',
      icon: IconMoon,
      run: () => setPreference('dark'),
    },
    {
      id: 'theme:system',
      label: 'Use system theme',
      icon: IconMonitor,
      run: () => setPreference('system'),
    },
  ].map((c) => ({
    ...c,
    group: 'Settings',
    keywords: ['theme', 'appearance', 'colour', 'mode'],
  }));
  return { id: 'app-theme', commands: () => commands };
}

/**
 * "Import cURL into HTTP Client" from anywhere (spec 10): the clipboard's
 * cURL command goes to the HTTP Client as an application/x-curl hand-off.
 */
export function curlCommand(
  navigate: Navigate,
  readClipboard: () => Promise<string>,
  onError: (e: unknown) => void,
): CommandSource {
  const commands = [
    {
      id: 'app:import-curl',
      label: 'Import cURL into HTTP Client',
      group: 'Actions',
      keywords: ['curl', 'http', 'request', 'clipboard', 'paste', 'import'],
      icon: IconClipboard,
      run: () =>
        readClipboard()
          .then((text) => {
            if (!/^\s*curl\s/i.test(text))
              throw new ToolError(
                'INVALID_INPUT',
                'The clipboard does not hold a cURL command',
              );
            sendTo(navigate, 'api-request', {
              kind: 'text',
              mime: 'application/x-curl',
              text: text.trim(),
              sourceTool: 'app',
            });
          })
          .catch(onError),
    },
  ];
  return { id: 'app-curl', commands: () => commands };
}
