import {
  Badge,
  Grid,
  Inline,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { DEFAULT_PORTS, type UrlModel } from '../lib/model';

interface Props {
  model: UrlModel;
  onChange(m: UrlModel): void;
}

/** Every part of the URL, decoded and editable. */
export function PartsEditor({ model: m, onChange }: Props) {
  const set = (patch: Partial<UrlModel>) => onChange({ ...m, ...patch });
  const unicodeDiffers = m.hostnameUnicode !== m.hostnamePunycode;
  return (
    <Stack gap="5">
      <Grid minItemWidth="14rem" gap="4">
        <TextField
          label="Protocol"
          spellCheck={false}
          value={m.protocol}
          onChange={(v) => set({ protocol: v.endsWith(':') ? v : `${v}:` })}
        />
        <TextField
          label="Host"
          spellCheck={false}
          value={m.hostnameUnicode}
          onChange={(v) => set({ hostname: v, hostnameUnicode: v })}
          description={
            unicodeDiffers ? `Sent as ${m.hostnamePunycode}` : undefined
          }
        />
        <TextField
          label="Port"
          inputMode="numeric"
          value={m.port}
          onChange={(v) => set({ port: v.replace(/\D/g, '') })}
          description={
            m.defaultPort && DEFAULT_PORTS[m.protocol]
              ? `Default port ${DEFAULT_PORTS[m.protocol]} for ${m.protocol.slice(0, -1)}`
              : undefined
          }
        />
        <TextField
          label="Path (decoded)"
          spellCheck={false}
          value={m.pathname}
          onChange={(v) => set({ pathname: v })}
        />
        <TextField
          label="Username"
          spellCheck={false}
          autoComplete="off"
          value={m.username}
          onChange={(v) => set({ username: v })}
        />
        <TextField
          label="Password"
          type="password"
          revealable
          autoComplete="off"
          value={m.password}
          onChange={(v) => set({ password: v })}
        />
        <TextField
          label="Fragment (decoded)"
          spellCheck={false}
          value={m.hash}
          onChange={(v) => set({ hash: v })}
        />
      </Grid>
      <Inline gap="3" align="center" wrap>
        <Text size="sm" tone="muted">
          {`Origin ${m.origin}`}
        </Text>
        {m.isRelative ? (
          <Badge size="sm" tone="info">
            Resolved against the base URL
          </Badge>
        ) : null}
      </Inline>
    </Stack>
  );
}
