import { useState } from 'react';
import { newId } from '@/shared/lib/id';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Inline,
  Input,
  KeyValueEditor,
  Label,
  Select,
  Stack,
  Text,
  type KeyValueRow,
  SwitchField,
} from '@/shared/ui';
import { IconPlus, IconSettings, IconTrash2 } from '@/shared/ui/icons';
import { clearSessionSecrets, type Environment } from '../lib/env';

interface Props {
  environments: Environment[];
  activeId: string;
  onActiveChange(id: string): void;
  onSave(envs: Environment[]): void;
}

const toRows = (env: Environment): KeyValueRow[] =>
  env.vars.map((v) => ({
    id: v.id,
    enabled: v.enabled !== false,
    key: v.key,
    value: v.value,
    type: v.secret ? 'secret' : 'text',
  }));

const fromRows = (rows: KeyValueRow[]): Environment['vars'] =>
  rows.map((r) => ({
    id: r.id,
    key: r.key,
    value: r.value,
    secret: r.type === 'secret',
    enabled: r.enabled,
  }));

/** Pick the active environment and manage variables and secrets. */
export function EnvironmentMenu({
  environments,
  activeId,
  onActiveChange,
  onSave,
}: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const current =
    environments.find((e) => e.id === (editing ?? activeId)) ?? environments[0];
  const patch = (p: Partial<Environment>) =>
    current &&
    onSave(environments.map((e) => (e.id === current.id ? { ...e, ...p } : e)));

  const create = () => {
    const env: Environment = {
      id: newId(),
      name: `Environment ${environments.length + 1}`,
      vars: [],
      rememberSecrets: false,
    };
    onSave([...environments, env]);
    setEditing(env.id);
    if (!activeId) onActiveChange(env.id);
  };

  return (
    <Inline gap="2" align="center">
      <Select
        aria-label="Environment"
        value={activeId}
        onValueChange={onActiveChange}
        items={[
          { value: '', label: 'No environment' },
          ...environments.map((e) => ({ value: e.id, label: e.name })),
        ]}
        className="min-w-40"
      />
      <Button
        size="sm"
        variant="ghost"
        leftIcon={<IconSettings size="sm" />}
        onClick={() => setOpen(true)}
      >
        Environments
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Environments</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Stack gap="3">
            <Inline gap="2" align="end" wrap>
              {environments.length > 0 && (
                <Stack gap="1">
                  <Label htmlFor="env-pick">Edit</Label>
                  <Select
                    id="env-pick"
                    value={current?.id ?? ''}
                    onValueChange={setEditing}
                    items={environments.map((e) => ({
                      value: e.id,
                      label: e.name,
                    }))}
                  />
                </Stack>
              )}
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconPlus size="sm" />}
                onClick={create}
              >
                New environment
              </Button>
            </Inline>
            {current ? (
              <Stack gap="3">
                <Stack gap="1">
                  <Label htmlFor="env-name">Name</Label>
                  <Input
                    id="env-name"
                    value={current.name}
                    onChange={(name) => patch({ name })}
                  />
                </Stack>
                <KeyValueEditor
                  rows={toRows(current)}
                  onChange={(rows) => patch({ vars: fromRows(rows) })}
                  allowSecret
                  ariaLabel={`Variables of ${current.name}`}
                  keyLabel="Variable"
                />
                <Text size="xs" tone="muted">
                  Use a variable as {'{{name}}'} in the URL, params, headers,
                  auth or body. Mark tokens and passwords as secret.
                </Text>
                <SwitchField
                  label="Remember secret values in this browser"
                  id="env-remember"
                  checked={current.rememberSecrets}
                  onCheckedChange={(rememberSecrets) =>
                    patch({ rememberSecrets })
                  }
                />
                {current.rememberSecrets ? (
                  <Alert status="warning">
                    <AlertDescription>
                      Secret values of this environment are saved in this
                      browser&apos;s storage, readable by anyone using this
                      profile. Turn this off to keep them for this session only.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Text size="xs" tone="muted">
                    Secret values stay in memory and are gone when you close or
                    reload the page.
                  </Text>
                )}
                <Inline gap="2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      clearSessionSecrets();
                      onSave(
                        environments.map((e) => ({
                          ...e,
                          vars: e.vars.map((v) =>
                            v.secret ? { ...v, value: '' } : v,
                          ),
                        })),
                      );
                    }}
                  >
                    Clear secret values
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<IconTrash2 size="sm" />}
                    onClick={() => {
                      onSave(environments.filter((e) => e.id !== current.id));
                      if (activeId === current.id) onActiveChange('');
                      setEditing(null);
                    }}
                  >
                    Delete environment
                  </Button>
                </Inline>
              </Stack>
            ) : (
              <EmptyState
                size="sm"
                title="No environments yet"
                description="Add one to keep variables such as {{baseUrl}}."
              />
            )}
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button variant="primary" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </Dialog>
    </Inline>
  );
}
