import { Badge, Grid, Input, Label, MetaList, Stack, Text } from '@/shared/ui';
import { DEFAULT_PORTS, type UrlModel } from '../lib/model';

interface Props {
  model: UrlModel;
  onChange(m: UrlModel): void;
}

function Field({
  id,
  label,
  value,
  onChange,
  type,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange(v: string): void;
  type?: string;
  hint?: React.ReactNode;
}) {
  return (
    <Stack gap="1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={onChange}
        type={type}
        spellCheck={false}
      />
      {hint}
    </Stack>
  );
}

/** Every part of the URL, decoded and editable. */
export function PartsEditor({ model: m, onChange }: Props) {
  const set = (patch: Partial<UrlModel>) => onChange({ ...m, ...patch });
  const unicodeDiffers = m.hostnameUnicode !== m.hostnamePunycode;
  return (
    <Stack gap="3">
      <Grid max={2} gap="3">
        <Field
          id="url-protocol"
          label="Protocol"
          value={m.protocol}
          onChange={(v) => set({ protocol: v.endsWith(':') ? v : `${v}:` })}
        />
        <Field
          id="url-host"
          label="Host"
          value={m.hostnameUnicode}
          onChange={(v) => set({ hostname: v, hostnameUnicode: v })}
          hint={
            unicodeDiffers ? (
              <Text size="xs" tone="muted">
                Sent as {m.hostnamePunycode}
              </Text>
            ) : undefined
          }
        />
        <Field
          id="url-port"
          label="Port"
          value={m.port}
          onChange={(v) => set({ port: v.replace(/\D/g, '') })}
          hint={
            m.defaultPort && DEFAULT_PORTS[m.protocol] ? (
              <Text size="xs" tone="muted">
                Default port {DEFAULT_PORTS[m.protocol]} for{' '}
                {m.protocol.slice(0, -1)}
              </Text>
            ) : undefined
          }
        />
        <Field
          id="url-path"
          label="Path (decoded)"
          value={m.pathname}
          onChange={(v) => set({ pathname: v })}
        />
        <Field
          id="url-user"
          label="Username"
          value={m.username}
          onChange={(v) => set({ username: v })}
        />
        <Field
          id="url-pass"
          label="Password"
          type="password"
          value={m.password}
          onChange={(v) => set({ password: v })}
        />
        <Field
          id="url-hash"
          label="Fragment (decoded)"
          value={m.hash}
          onChange={(v) => set({ hash: v })}
        />
      </Grid>
      <MetaList
        items={[
          <span key="o">Origin {m.origin}</span>,
          m.isRelative ? (
            <Badge key="r" variant="soft" tone="info" size="xs">
              Resolved against the base URL
            </Badge>
          ) : null,
        ].filter(Boolean)}
      />
    </Stack>
  );
}
