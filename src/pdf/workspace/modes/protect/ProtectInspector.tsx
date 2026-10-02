import { IconUnlock } from '@/shared/ui/icons';
import { Alert, AlertDescription, Button, Stack } from '@/shared/ui';
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
        <Alert status="warning">
          <AlertDescription>
            <Stack gap="2">
              {RESTRICTED_MESSAGE}
              {ws.unlock ? (
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<IconUnlock size="sm" />}
                    onClick={() => ws.unlock?.()}
                  >
                    Unlock for editing
                  </Button>
                </div>
              ) : null}
            </Stack>
          </AlertDescription>
        </Alert>
      ) : null}
      {panelOf(ctx.tool.id) === 'properties' ? (
        <MetadataForm {...ctx} />
      ) : (
        <PermissionsForm {...ctx} />
      )}
    </Stack>
  );
}
