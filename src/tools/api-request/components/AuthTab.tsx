import { Grid, Input, Label, Select, Stack, Text } from '@/shared/ui';
import type { Auth } from '../lib/model';

const KINDS = [
  { value: 'none', label: 'None' },
  { value: 'bearer', label: 'Bearer token' },
  { value: 'basic', label: 'Basic (user and password)' },
  { value: 'apikey', label: 'API key' },
];

function blank(kind: string): Auth {
  switch (kind) {
    case 'bearer':
      return { kind: 'bearer', token: '' };
    case 'basic':
      return { kind: 'basic', user: '', pass: '' };
    case 'apikey':
      return { kind: 'apikey', name: 'X-API-Key', value: '', in: 'header' };
    default:
      return { kind: 'none' };
  }
}

function F({
  id,
  label,
  value,
  onChange,
  secret,
}: {
  id: string;
  label: string;
  value: string;
  onChange(v: string): void;
  secret?: boolean;
}) {
  return (
    <Stack gap="1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={onChange}
        type={secret ? 'password' : 'text'}
        spellCheck={false}
        autoComplete="off"
      />
    </Stack>
  );
}

/** Auth helpers; values may use {{variables}}. */
export function AuthTab({
  auth,
  onChange,
}: {
  auth: Auth;
  onChange(a: Auth): void;
}) {
  return (
    <Stack gap="3">
      <Stack gap="1">
        <Label htmlFor="auth-kind">Type</Label>
        <Select
          id="auth-kind"
          value={auth.kind}
          onValueChange={(k) => onChange(blank(k))}
          items={KINDS}
        />
      </Stack>
      {auth.kind === 'bearer' && (
        <F
          id="auth-token"
          label="Token"
          secret
          value={auth.token}
          onChange={(token) => onChange({ ...auth, token })}
        />
      )}
      {auth.kind === 'basic' && (
        <Grid max={2} gap="3">
          <F
            id="auth-user"
            label="User"
            value={auth.user}
            onChange={(user) => onChange({ ...auth, user })}
          />
          <F
            id="auth-pass"
            label="Password"
            secret
            value={auth.pass}
            onChange={(pass) => onChange({ ...auth, pass })}
          />
        </Grid>
      )}
      {auth.kind === 'apikey' && (
        <Grid max={2} gap="3">
          <F
            id="auth-key-name"
            label="Key name"
            value={auth.name}
            onChange={(name) => onChange({ ...auth, name })}
          />
          <F
            id="auth-key-value"
            label="Value"
            secret
            value={auth.value}
            onChange={(value) => onChange({ ...auth, value })}
          />
          <Stack gap="1">
            <Label htmlFor="auth-key-in">Send in</Label>
            <Select
              id="auth-key-in"
              value={auth.in}
              onValueChange={(v) =>
                onChange({ ...auth, in: v === 'query' ? 'query' : 'header' })
              }
              items={[
                { value: 'header', label: 'Header' },
                { value: 'query', label: 'Query string' },
              ]}
            />
          </Stack>
        </Grid>
      )}
      <Text size="xs" tone="muted">
        Use {'{{name}}'} to take a value from the active environment.
      </Text>
    </Stack>
  );
}
