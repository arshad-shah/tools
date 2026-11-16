import { IconButton, Menu } from '@arshad-shah/cynosure';
import { help as helpIcon } from '@arshad-shah/cynosure/icons';
import {
  external,
  info,
  keyboard,
  scale,
  shieldCheck,
} from '@arshad-shah/cynosure/icons';
import { hotkeyCaps } from '@/shared/lib/hotkeys';
import { issuesUrl, REPO_URL } from '../footerUtils';
import type { ToolDefinition } from '../tool';
import { useHelp } from './help-context';

const openExternal = (url: string) =>
  window.open(url, '_blank', 'noopener,noreferrer');

/**
 * The Help menu (navigation footer): keyboard shortcuts, privacy, the
 * source and issue tracker, licences and the about box. It holds what the
 * old page footer held.
 */
export function HelpMenu({
  tool,
  size = 'md',
}: {
  tool?: ToolDefinition | undefined;
  size?: 'md' | 'lg';
}) {
  const help = useHelp();
  return (
    <Menu
      label="Help"
      placement="top"
      items={[
        {
          items: [
            {
              value: 'shortcuts',
              label: 'Keyboard shortcuts',
              icon: keyboard,
              shortcut: hotkeyCaps('?'),
            },
            { value: 'privacy', label: 'Privacy', icon: shieldCheck },
          ],
        },
        {
          items: [
            { value: 'source', label: 'View source', icon: external },
            {
              value: 'issues',
              label: tool
                ? `Report a problem with ${tool.name}`
                : 'Report a problem',
              icon: external,
            },
          ],
        },
        {
          items: [
            { value: 'licences', label: 'Open-source licences', icon: scale },
            { value: 'about', label: 'About tools', icon: info },
          ],
        },
      ]}
      onSelect={(value) => {
        if (value === 'shortcuts') help.openShortcuts();
        else if (value === 'privacy') help.openPrivacy();
        else if (value === 'licences') help.openLicences();
        else if (value === 'about') help.openAbout();
        else if (value === 'source') openExternal(REPO_URL);
        else if (value === 'issues') openExternal(issuesUrl(tool));
      }}
      trigger={(props) => (
        <IconButton
          {...props}
          icon={helpIcon}
          label="Help"
          variant="ghost"
          tone="neutral"
          size={size}
        />
      )}
    />
  );
}
