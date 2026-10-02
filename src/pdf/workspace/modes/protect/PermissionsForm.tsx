import { useId } from 'react';
import {
  Checkbox,
  Inline,
  Label,
  Select,
  Stack,
  Switch,
  Text,
  type SelectItem,
} from '@/shared/ui';
import { protectionOf, type ProtectParams } from '@/pdf/doc/ops/protect';
import {
  DEFAULT_PERMISSIONS,
  type PermissionChoices,
} from '@/pdf/edit/permissions';
import type { ModeProps } from '../types';

const PRINT_ITEMS: SelectItem[] = [
  { value: 'none', label: 'Not allowed' },
  { value: 'low', label: 'Low resolution' },
  { value: 'full', label: 'High resolution' },
];

type Flag = Exclude<keyof PermissionChoices, 'printing'>;

const FLAGS: { key: Flag; label: string }[] = [
  { key: 'modify', label: 'Allow editing' },
  { key: 'copy', label: 'Allow copying text and images' },
  { key: 'annotate', label: 'Allow comments' },
  { key: 'fillForms', label: 'Allow filling forms' },
  { key: 'assemble', label: 'Allow page assembly' },
];

/**
 * "Password protection" (Protect mode inspector): the on/off choice and the
 * permissions, stored in the log as `protect.set`. The password itself is
 * typed in the Export dialog and never stored (G25).
 */
export function PermissionsForm({ doc }: ModeProps) {
  const id = useId();
  const current: ProtectParams = protectionOf(doc.view) ?? {
    enabled: false,
    permissions: DEFAULT_PERMISSIONS,
  };
  const { enabled, permissions } = current;
  const set = (next: ProtectParams) =>
    doc.dispatch({ type: 'protect.set', params: next });
  const setPermission = (patch: Partial<PermissionChoices>) =>
    set({ enabled, permissions: { ...permissions, ...patch } });
  const locked = !enabled || doc.state.restricted;

  return (
    <Stack gap="4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor={`${id}-on`}>Password protection</Label>
          <Text size="sm" tone="muted">
            {enabled
              ? 'You choose the password when you export. It is never saved.'
              : 'The exported file opens without a password.'}
          </Text>
        </div>
        <Switch
          id={`${id}-on`}
          checked={enabled}
          disabled={doc.state.restricted}
          onCheckedChange={(on) => set({ enabled: on, permissions })}
        />
      </div>
      <Stack gap="3">
        <Stack gap="2">
          <Label htmlFor={`${id}-print`}>Printing</Label>
          <Select
            id={`${id}-print`}
            value={permissions.printing}
            items={PRINT_ITEMS}
            disabled={locked}
            onValueChange={(v) =>
              setPermission({ printing: v as PermissionChoices['printing'] })
            }
          />
        </Stack>
        {FLAGS.map(({ key, label }) => {
          // Readers treat comments as also allowing form filling.
          const implied = key === 'fillForms' && permissions.annotate;
          return (
            <Inline key={key} gap="2" align="center" wrap>
              <Checkbox
                id={`${id}-${key}`}
                checked={permissions[key] || implied}
                disabled={locked || implied}
                onCheckedChange={(v) => setPermission({ [key]: v })}
              />
              <Label htmlFor={`${id}-${key}`}>{label}</Label>
              {implied ? (
                <Text size="sm" tone="muted">
                  Included when comments are allowed.
                </Text>
              ) : null}
            </Inline>
          );
        })}
      </Stack>
      <Text size="sm" tone="muted">
        Uses AES-256. PDF readers enforce the permissions; the file itself
        cannot stop a determined user from ignoring them.
      </Text>
    </Stack>
  );
}
