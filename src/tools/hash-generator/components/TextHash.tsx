import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Inline,
  Label,
  Select,
  Stack,
  Switch,
  TextInputPanel,
} from '@/shared/ui';
import {
  bytesFrom,
  digest,
  digestInfo,
  type DigestId,
  type KeyFormat,
} from '@/shared/lib/crypto/digest';
import { toToolError } from '@/shared/lib/errors';
import type { HandoffPayload } from '@/shared/lib/handoff';
import { formatDigest, type DigestFormat } from '../lib/format';
import { normalizeExpected } from '../lib/verify';
import { ResultRow } from './ResultRow';
import { VerifyField } from './VerifyField';

const ENCODINGS = [
  { value: 'text', label: 'Text (UTF-8)' },
  { value: 'hex', label: 'Hex' },
  { value: 'base64', label: 'Base64' },
];

const acceptsText = (p: HandoffPayload) =>
  p.kind === 'text' && p.mime === 'text/plain';

interface TextHashProps {
  selected: DigestId[];
  output: DigestFormat;
  inputEncoding: KeyFormat;
  onInputEncoding(e: KeyFormat): void;
  /** The message bytes, for the HMAC card (null: nothing to hash). */
  onMessage(bytes: Uint8Array | null): void;
}

/** Text in, every selected digest out, with the expected-hash check. */
export const TextHash: React.FC<TextHashProps> = ({
  selected,
  output,
  inputEncoding,
  onInputEncoding,
  onMessage,
}) => {
  const [input, setInput] = useState('');
  // An empty message is valid (SHA-256("") is well known) but only hashed
  // when asked, so the page does not open full of results.
  const [hashEmpty, setHashEmpty] = useState(false);
  const [expected, setExpected] = useState('');
  const [computed, setComputed] = useState<{
    bytes: Uint8Array;
    selected: DigestId[];
    results: Partial<Record<DigestId, string>>;
  }>();

  const message = useMemo((): { bytes: Uint8Array | null; error?: string } => {
    if (input === '' && !hashEmpty) return { bytes: null };
    try {
      return { bytes: bytesFrom(input, inputEncoding, 'The message') };
    } catch (e) {
      return { bytes: null, error: toToolError(e).message };
    }
  }, [input, hashEmpty, inputEncoding]);

  useEffect(() => onMessage(message.bytes), [message.bytes, onMessage]);

  useEffect(() => {
    let live = true;
    const bytes = message.bytes;
    if (!bytes) return;
    void Promise.all(
      selected.map(async (id) => [id, await digest(id, bytes)] as const),
    ).then(
      (pairs) =>
        live &&
        setComputed({ bytes, selected, results: Object.fromEntries(pairs) }),
    );
    return () => {
      live = false;
    };
  }, [message.bytes, selected]);

  const results =
    computed &&
    computed.bytes === message.bytes &&
    computed.selected === selected
      ? computed.results
      : {};
  const expectedHex = expected.trim() ? normalizeExpected(expected) : null;
  const shown = selected.filter((id) => results[id] !== undefined);

  return (
    <Stack gap="4">
      <TextInputPanel
        label="Text to hash"
        value={input}
        onChange={setInput}
        language="plain"
        wrap
        handoff={acceptsText}
        placeholder="Type or paste the message"
        minHeight={120}
      />
      <Inline gap="4" align="center" wrap>
        <div className="w-44">
          <Select
            value={inputEncoding}
            onValueChange={(v) => onInputEncoding(v as KeyFormat)}
            items={ENCODINGS}
            aria-label="Input encoding"
          />
        </div>
        {input === '' && (
          <Inline gap="2" align="center">
            <Switch
              id="hash-empty"
              checked={hashEmpty}
              onCheckedChange={setHashEmpty}
              aria-label="Hash an empty message"
            />
            <Label htmlFor="hash-empty">Hash an empty message</Label>
          </Inline>
        )}
      </Inline>
      {message.error && (
        <Alert status="danger">
          <AlertDescription>{message.error}</AlertDescription>
        </Alert>
      )}
      <VerifyField value={expected} onChange={setExpected} results={results} />
      {shown.length > 0 && (
        <Stack gap="0" role="list" aria-label="Hash results">
          {shown.map((id) => {
            const hex = results[id]!;
            return (
              <div role="listitem" key={id}>
                <ResultRow
                  id={id}
                  name={digestInfo(id).name}
                  info={digestInfo(id)}
                  value={formatDigest(hex, output)}
                  match={expected.trim() ? expectedHex === hex : undefined}
                />
              </div>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};
