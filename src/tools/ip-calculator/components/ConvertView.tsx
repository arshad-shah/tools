import { Badge, Card, Inline, Stack, TextField } from '@arshad-shah/cynosure';
import { useMemo } from 'react';
import { toToolError } from '@/shared/lib/errors';
import { classify } from '../lib/classify';
import { formsOf, parseAnyAddress } from '../lib/convert';
import { Facts } from './Facts';

/** One address in every notation: IPv4 bases, IPv6 forms, PTR name. */
export function ConvertView({
  text,
  onText,
}: {
  text: string;
  onText(text: string): void;
}) {
  const result = useMemo(() => {
    if (!text.trim()) return null;
    try {
      const a = parseAnyAddress(text);
      return { a, forms: formsOf(a), error: null };
    } catch (e) {
      return { a: null, forms: null, error: toToolError(e).message };
    }
  }, [text]);
  const type = result?.a ? classify(result.a.version, result.a.value) : null;

  return (
    <Card as="section" title="Convert an address">
      <Stack gap="5">
        <TextField
          label="Address"
          description="Dotted (192.168.1.1), integer (3232235777), 0x hex, 0b or 32-digit binary, 0o octal, or any IPv6 form."
          monospace
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="192.168.1.1 or 2001:db8::1"
          value={text}
          onChange={onText}
          error={result?.error ?? undefined}
        />
        {result?.a && result.forms && type ? (
          <Stack gap="4">
            <Inline gap="2" wrap>
              <Badge tone="accent">{`IPv${result.a.version}`}</Badge>
              <Badge tone={type.global ? 'success' : 'info'}>
                {type.label}
              </Badge>
            </Inline>
            <Facts
              label="Address forms"
              items={result.forms.map((f) => ({
                term: f.label,
                value: f.value,
              }))}
            />
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}
