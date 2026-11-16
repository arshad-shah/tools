import {
  Checkbox,
  Select,
  Stack,
  Switch,
  Text,
  type SelectOption,
} from '@arshad-shah/cynosure';
import { protectionOf, type ProtectParams } from '@/pdf/doc/ops/protect';
import {
  DEFAULT_PERMISSIONS,
  type PermissionChoices,
} from '@/pdf/edit/permissions';
import type { ModeProps } from '../types';

const PRINT_ITEMS: SelectOption[] = [
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
    <Stack gap="5">
      <Switch
        label="Password protection"
        description={
          enabled
            ? 'You choose the password when you export. It is never saved.'
            : 'The exported file opens without a password.'
        }
        checked={enabled}
        disabled={doc.state.restricted}
        onChange={(on) => set({ enabled: on, permissions })}
      />
      <Stack gap="3">
        <Select
          label="Printing"
          size="sm"
          value={permissions.printing}
          options={PRINT_ITEMS}
          disabled={locked}
          onChange={(v) =>
            setPermission({ printing: v as PermissionChoices['printing'] })
          }
        />
        {FLAGS.map(({ key, label }) => {
          // Readers treat comments as also allowing form filling.
          const implied = key === 'fillForms' && permissions.annotate;
          return (
            <Checkbox
              key={key}
              size="sm"
              label={label}
              description={
                implied ? 'Included when comments are allowed.' : undefined
              }
              checked={permissions[key] || implied}
              disabled={locked || implied}
              onChange={(v) => setPermission({ [key]: v })}
            />
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
