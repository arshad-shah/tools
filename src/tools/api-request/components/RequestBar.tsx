import { Button, Inline, Input, Select } from '@/shared/ui';
import { IconSend, IconX } from '@/shared/ui/icons';
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
    <Inline gap="2" align="start" wrap={false} className="max-sm:flex-wrap">
      {request.mode === 'rest' ? (
        <Select
          aria-label="Method"
          value={request.method}
          onValueChange={(method) => onChange({ ...request, method })}
          items={METHODS.map((m) => ({ value: m, label: m }))}
          className="w-28 shrink-0"
        />
      ) : (
        <Button variant="ghost" disabled className="w-28 shrink-0">
          POST
        </Button>
      )}
      <Input
        aria-label="Request URL"
        value={request.url}
        onChange={(url) => {
          if (/^\s*curl\s/i.test(url) && onCurl(url)) return;
          onChange({ ...request, url });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !running) onSend();
        }}
        invalid={unresolved.length > 0}
        placeholder="https://api.example.com/items or paste a cURL command"
        spellCheck={false}
        className="min-w-0 flex-1 font-mono"
      />
      {running ? (
        <Button
          variant="secondary"
          leftIcon={<IconX size="sm" />}
          onClick={onCancel}
        >
          Cancel
        </Button>
      ) : (
        <Button
          variant="primary"
          leftIcon={<IconSend size="sm" />}
          onClick={onSend}
        >
          Send
        </Button>
      )}
    </Inline>
  );
}
