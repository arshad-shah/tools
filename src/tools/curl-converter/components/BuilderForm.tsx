import {
  Combobox,
  Disclosure,
  Grid,
  KeyValueEditor,
  SegmentedControl,
  Stack,
  Switch,
  TextArea,
  TextField,
} from '@arshad-shah/cynosure';
import type { BuilderBodyKind, BuilderState } from '../lib/builder';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

interface Props {
  value: BuilderState;
  onChange(next: BuilderState): void;
}

/** The request as a form: the other way, from fields to a curl command. */
export function BuilderForm({ value: s, onChange }: Props) {
  const set = (patch: Partial<BuilderState>) => onChange({ ...s, ...patch });
  return (
    <Stack gap="5">
      <Grid columns="7.5rem minmax(0, 1fr)" gap="3" align="end">
        <Combobox
          label="Method"
          value={s.method}
          onChange={(v) => set({ method: v.toUpperCase() })}
          options={METHODS.map((m) => ({ value: m, label: m }))}
          allowCustom
        />
        <TextField
          label="URL"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={s.url}
          onChange={(url) => set({ url })}
        />
      </Grid>
      <KeyValueEditor
        label="Headers"
        pairs={s.headers}
        onChange={(headers) => set({ headers })}
      />
      <Stack gap="3">
        <SegmentedControl
          label="Body"
          value={s.bodyKind}
          onChange={(v) => set({ bodyKind: v as BuilderBodyKind })}
          options={[
            { value: 'none', label: 'No body' },
            { value: 'text', label: 'Text' },
            { value: 'form', label: 'Multipart' },
            { value: 'file', label: 'File' },
          ]}
        />
        {s.bodyKind === 'text' ? (
          <TextArea
            label="Body text"
            description="Sent as is (--data-raw). Set a Content-Type header for JSON."
            rows={5}
            spellCheck={false}
            value={s.text}
            onChange={(text) => set({ text })}
          />
        ) : null}
        {s.bodyKind === 'form' ? (
          <KeyValueEditor
            label="Multipart fields"
            pairs={s.form}
            onChange={(form) => set({ form })}
            labels={{ value: 'Value, or @path for a file' }}
          />
        ) : null}
        {s.bodyKind === 'file' ? (
          <Grid columns={{ base: 1, sm: 2 }} gap="3" align="end">
            <TextField
              label="File path"
              spellCheck={false}
              value={s.filePath}
              onChange={(filePath) => set({ filePath })}
            />
            <Switch
              label="Upload as is (-T)"
              checked={s.upload}
              onChange={(upload) => set({ upload })}
            />
          </Grid>
        ) : null}
      </Stack>
      <Disclosure summary="Auth, cookies and options" variant="line">
        <Stack gap="4">
          <Grid columns={{ base: 1, sm: 2 }} gap="3">
            <TextField
              label="Basic auth user"
              autoComplete="off"
              spellCheck={false}
              value={s.user}
              onChange={(user) => set({ user })}
            />
            <TextField
              label="Basic auth password"
              type="password"
              revealable
              autoComplete="off"
              value={s.pass}
              onChange={(pass) => set({ pass })}
            />
          </Grid>
          <TextField
            label="Cookies"
            description="name=value pairs separated by semicolons (-b)."
            spellCheck={false}
            value={s.cookie}
            onChange={(cookie) => set({ cookie })}
          />
          <Grid columns={{ base: 1, sm: 3 }} gap="3">
            <Switch
              label="Compressed"
              checked={s.compressed}
              onChange={(compressed) => set({ compressed })}
            />
            <Switch
              label="Skip TLS checks (-k)"
              checked={s.insecure}
              onChange={(insecure) => set({ insecure })}
            />
            <Switch
              label="Follow redirects (-L)"
              checked={s.location}
              onChange={(location) => set({ location })}
            />
          </Grid>
        </Stack>
      </Disclosure>
    </Stack>
  );
}
