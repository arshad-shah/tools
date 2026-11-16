import { Button, Grid, Select, TextField } from '@arshad-shah/cynosure';
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
}: Props) {
  return (
    <Grid columns="7rem minmax(0, 1fr) auto" gap="2" align="end">
      {request.mode === 'rest' ? (
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
      )}
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
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !running) onSend();
        }}
        aria-invalid={unresolved.length > 0 || undefined}
        placeholder="https://api.example.com/items or paste a cURL command"
        spellCheck={false}
      />
      {running ? (
        <Button variant="soft" icon={close} onClick={onCancel}>
          Cancel
        </Button>
      ) : (
        <Button variant="solid" icon={send} onClick={onSend}>
          Send
        </Button>
      )}
    </Grid>
  );
}
