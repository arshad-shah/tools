import { Grid, Select, Stack, Text, TextField } from '@arshad-shah/cynosure';
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
  label,
  value,
  onChange,
  secret,
}: {
  label: string;
  value: string;
  onChange(v: string): void;
  secret?: boolean;
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      type={secret ? 'password' : 'text'}
      revealable={secret}
      spellCheck={false}
      autoComplete="off"
    />
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
    <Stack gap="4">
      <Select
        label="Type"
        value={auth.kind}
        onChange={(k) => onChange(blank(k))}
        options={KINDS}
      />
      {auth.kind === 'bearer' && (
        <F
          label="Token"
          secret
          value={auth.token}
          onChange={(token) => onChange({ ...auth, token })}
        />
      )}
      {auth.kind === 'basic' && (
        <Grid columns={{ base: 1, sm: 2 }} gap="4">
          <F
            label="User"
            value={auth.user}
            onChange={(user) => onChange({ ...auth, user })}
          />
          <F
            label="Password"
            secret
            value={auth.pass}
            onChange={(pass) => onChange({ ...auth, pass })}
          />
        </Grid>
      )}
      {auth.kind === 'apikey' && (
        <Grid columns={{ base: 1, sm: 2 }} gap="4">
          <F
            label="Key name"
            value={auth.name}
            onChange={(name) => onChange({ ...auth, name })}
          />
          <F
            label="Value"
            secret
            value={auth.value}
            onChange={(value) => onChange({ ...auth, value })}
          />
          <Select
            label="Send in"
            value={auth.in}
            onChange={(v) =>
              onChange({ ...auth, in: v === 'query' ? 'query' : 'header' })
            }
            options={[
              { value: 'header', label: 'Header' },
              { value: 'query', label: 'Query string' },
            ]}
          />
        </Grid>
      )}
      <Text size="sm" tone="muted">
        {'Use {{name}} to take a value from the active environment.'}
      </Text>
    </Stack>
  );
}
