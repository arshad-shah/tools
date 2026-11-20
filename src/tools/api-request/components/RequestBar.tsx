import {
  Button,
  Form,
  Grid,
  Select,
  Stack,
  TextField,
} from '@arshad-shah/cynosure';
import { close, send } from '@arshad-shah/cynosure/icons';
import { METHODS, type HttpRequest } from '../lib/model';

interface Props {
  request: HttpRequest;
  onChange(r: HttpRequest): void;
  /** Called with pasted text that starts with `curl `; true when imported. */
  onCurl(text: string): boolean;
  onSend(): void;
  onCancel(): void;
  running: boolean;
  unresolved: string[];
  /** Phones: the URL gets its own row above the method and Send. */
  stacked?: boolean;
}

/** Method, URL (a pasted cURL command imports the request) and Send. */
export function RequestBar({
  request,
  onChange,
  onCurl,
  onSend,
  onCancel,
  running,
  unresolved,
  stacked = false,
}: Props) {
  const method =
    request.mode === 'rest' ? (
      <Select
        label="Method"
        labelHidden
        value={request.method}
        onChange={(method) => onChange({ ...request, method })}
        options={METHODS.map((m) => ({ value: m, label: m }))}
      />
    ) : (
      <Button variant="soft" tone="neutral" disabled>
        POST
      </Button>
    );
  const url = (
    <TextField
      label="Request URL"
      labelHidden
      inputMode="url"
      autoCapitalize="none"
      autoCorrect="off"
      autoComplete="off"
      value={request.url}
      onChange={(url) => {
        if (/^\s*curl\s/i.test(url) && onCurl(url)) return;
        onChange({ ...request, url });
      }}
      aria-invalid={unresolved.length > 0 || undefined}
      placeholder="https://api.example.com/items or paste a cURL command"
      spellCheck={false}
    />
  );
  const action = running ? (
    <Button variant="soft" icon={close} onClick={onCancel}>
      Cancel
    </Button>
  ) : (
    <Button variant="solid" icon={send} type="submit">
      Send
    </Button>
  );
  return (
    <Form
      label="Request"
      onSubmit={() => {
        if (!running) onSend();
      }}
    >
      {stacked ? (
        <Stack gap="2">
          {url}
          <Grid columns="minmax(0, 1fr) auto" gap="2" align="end">
            {method}
            {action}
          </Grid>
        </Stack>
      ) : (
        <Grid columns="7rem minmax(0, 1fr) auto" gap="2" align="end">
          {method}
          {url}
          {action}
        </Grid>
      )}
    </Form>
  );
}
