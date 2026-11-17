import { requestProperties } from '../../properties-request';
import {
  fileClean,
  fileKey,
  tag,
  unlock as unlockIcon,
} from '@arshad-shah/cynosure/icons';
import { type ToolGroup } from '../../ui/tool-groups';
import { ModeToolbar } from '../../ModeToolbar';
import { useWorkspace } from '../../workspace-context';
import type { ModeProps } from '../types';
import { openSanitize, panelOf } from './protect-ui';
import { SanitizeDialog } from './SanitizeDialog';

/** Protect tools (plan E-10): protection, properties, sanitise, unlock. */
export function ProtectToolbar(ctx: ModeProps) {
  const ws = useWorkspace();
  const panel = panelOf(ctx.tool.id);
  const restricted = ctx.doc.state.restricted;
  const groups: ToolGroup[] = [
    {
      id: 'protect',
      label: 'Protect',
      items: [
        {
          id: 'password',
          label: 'Password protection',
          icon: fileKey,
          kind: 'toggle',
          pressed: panel === 'password',
          onSelect: () => {
            ctx.tool.set('password');
            requestProperties();
          },
        },
        {
          id: 'properties',
          label: 'Document properties',
          icon: tag,
          kind: 'toggle',
          pressed: panel === 'properties',
          onSelect: () => {
            ctx.tool.set('properties');
            requestProperties();
          },
        },
      ],
    },
    {
      id: 'clean',
      label: 'Clean',
      items: [
        {
          id: 'sanitize',
          label: 'Sanitise',
          icon: fileClean,
          kind: 'button',
          disabled: restricted ? 'Unlock editing first' : false,
          onSelect: () => openSanitize(),
        },
      ],
    },
  ];
  if (restricted && ws.unlock)
    groups.push({
      id: 'unlock',
      label: 'Restricted',
      items: [
        {
          id: 'unlock',
          label: 'Unlock for editing',
          icon: unlockIcon,
          kind: 'button',
          onSelect: () => ws.unlock?.(),
        },
      ],
    });
  return (
    <>
      <ModeToolbar groups={groups} />
      <SanitizeDialog {...ctx} />
    </>
  );
}
