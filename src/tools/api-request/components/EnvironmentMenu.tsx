import {
  Button,
  Checkbox,
  Dialog,
  EmptyState,
  Grid,
  IconButton,
  Inline,
  KeyValueEditor,
  Notice,
  Select,
  Stack,
  Switch,
  Text,
  TextField,
  type KeyValuePair,
} from '@arshad-shah/cynosure';
import { plus, settings, trash, variable } from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import { newId } from '@/shared/lib/id';
import { clearSessionSecrets, type Environment } from '../lib/env';

interface Props {
  environments: Environment[];
  activeId: string;
  onActiveChange(id: string): void;
  onSave(envs: Environment[]): void;
}

const toPairs = (env: Environment): KeyValuePair[] =>
  env.vars.map((v) => ({
    id: v.id,
    enabled: v.enabled !== false,
    key: v.key,
    value: v.value,
    secret: v.secret || undefined,
  }));

/** Edited pairs back as variables; secrecy is set beside the editor. */
const fromPairs = (
  pairs: KeyValuePair[],
  previous: Environment['vars'],
): Environment['vars'] =>
  pairs.map((p) => ({
    id: p.id,
    key: p.key,
    value: p.value,
    secret: previous.find((v) => v.id === p.id)?.secret ?? !!p.secret,
    enabled: p.enabled !== false,
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

  const named = current?.vars.filter((v) => v.key.trim()) ?? [];
  return (
    <Inline gap="1" align="center">
      <Select
        label="Environment"
        labelHidden
        size="sm"
        value={activeId}
        onChange={onActiveChange}
        options={[
          { value: '', label: 'No environment' },
          ...environments.map((e) => ({ value: e.id, label: e.name })),
        ]}
      />
      <IconButton
        size="sm"
        variant="ghost"
        tone="neutral"
        label="Environments"
        icon={settings}
        onClick={() => setOpen(true)}
      />
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Environments"
        description="Use a variable as {{name}} in the URL, params, headers, auth or body."
        size="lg"
        actions={
          <Button variant="solid" onClick={() => setOpen(false)}>
            Done
          </Button>
        }
      >
        <Stack gap="5">
          <Grid columns="minmax(0, 1fr) auto" gap="2" align="end">
            {environments.length > 0 ? (
              <Select
                label="Edit"
                value={current?.id ?? ''}
                onChange={setEditing}
                options={environments.map((e) => ({
                  value: e.id,
                  label: e.name,
                }))}
              />
            ) : (
              <Text size="sm" tone="muted">
                No environments yet.
              </Text>
            )}
            <Button variant="soft" icon={plus} onClick={create}>
              New environment
            </Button>
          </Grid>
          {current ? (
            <Stack gap="5">
              <TextField
                label="Name"
                value={current.name}
                onChange={(name) => patch({ name })}
              />
              <KeyValueEditor
                label={`Variables of ${current.name}`}
                pairs={toPairs(current)}
                onChange={(pairs) =>
                  patch({ vars: fromPairs(pairs, current.vars) })
                }
                labels={{ key: 'Variable' }}
              />
              {named.length > 0 ? (
                <Stack gap="2" role="group" aria-label="Secret variables">
                  <Text size="sm" weight="medium">
                    Secret variables
                  </Text>
                  <Text size="sm" tone="muted">
                    Tick tokens and passwords: their values are masked and kept
                    for this session only.
                  </Text>
                  <Inline gap="4" wrap>
                    {named.map((v) => (
                      <Checkbox
                        key={v.id}
                        label={v.key}
                        checked={!!v.secret}
                        onChange={(secret) =>
                          patch({
                            vars: current.vars.map((x) =>
                              x.id === v.id ? { ...x, secret } : x,
                            ),
                          })
                        }
                      />
                    ))}
                  </Inline>
                </Stack>
              ) : null}
              <Switch
                label="Remember secret values in this browser"
                checked={current.rememberSecrets}
                onChange={(rememberSecrets) => patch({ rememberSecrets })}
              />
              {current.rememberSecrets ? (
                <Notice tone="warning">
                  Secret values of this environment are saved in this
                  browser&apos;s storage, readable by anyone using this profile.
                  Turn this off to keep them for this session only.
                </Notice>
              ) : (
                <Text size="sm" tone="muted">
                  Secret values stay in memory and are gone when you close or
                  reload the page.
                </Text>
              )}
              <Inline gap="2" wrap>
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
                  tone="danger"
                  icon={trash}
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
              icon={variable}
              title="No environments yet"
              description="Add one to keep variables such as {{baseUrl}}."
            />
          )}
        </Stack>
      </Dialog>
    </Inline>
  );
}
