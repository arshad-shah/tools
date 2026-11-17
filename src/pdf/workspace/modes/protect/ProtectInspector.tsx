import { Button, Notice, Stack } from '@arshad-shah/cynosure';
import { unlock } from '@arshad-shah/cynosure/icons';
import { RESTRICTED_MESSAGE } from '../../document-api';
import { useWorkspace } from '../../workspace-context';
import type { ModeProps } from '../types';
import { MetadataForm } from './MetadataForm';
import { PermissionsForm } from './PermissionsForm';
import { panelOf } from './protect-ui';

/** The panel the toolbar chose, below the restricted notice when there is one. */
export function ProtectInspector(ctx: ModeProps) {
  const ws = useWorkspace();
  return (
    <Stack gap="4">
      {ctx.doc.state.restricted ? (
        <Notice
          tone="warning"
          size="sm"
          action={
            ws.unlock ? (
              <Button
                variant="outline"
                size="sm"
                icon={unlock}
                onClick={() => ws.unlock?.()}
              >
                Unlock for editing
              </Button>
            ) : undefined
          }
        >
          {RESTRICTED_MESSAGE}
        </Notice>
      ) : null}
      {panelOf(ctx.tool.id) === 'properties' ? (
        <MetadataForm {...ctx} />
      ) : (
        <PermissionsForm {...ctx} />
      )}
    </Stack>
  );
}
