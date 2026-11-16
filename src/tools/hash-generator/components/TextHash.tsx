import {
  Button,
  Card,
  EmptyState,
  Inline,
  Select,
  Stack,
  Switch,
  TextArea,
} from '@arshad-shah/cynosure';
import { hash, sparkles } from '@arshad-shah/cynosure/icons';
import React, { useEffect, useMemo, useState } from 'react';
import { TextSourceActions } from '@/app/ui/text-source';
import { useTextFile } from '@/app/ui/use-text-file';
import { TransformLayout } from '@/app/ui/transform';
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
import { HmacCard } from './HmacCard';
import { ResultList } from './ResultRow';
import { VerifyField } from './VerifyField';

const ENCODINGS = [
  { value: 'text', label: 'Text (UTF-8)' },
  { value: 'hex', label: 'Hex' },
  { value: 'base64', label: 'Base64' },
];

const EXAMPLE = 'The quick brown fox jumps over the lazy dog';

const acceptsText = (p: HandoffPayload) =>
  p.kind === 'text' && p.mime === 'text/plain';

interface TextHashProps {
  selected: DigestId[];
  output: DigestFormat;
  inputEncoding: KeyFormat;
  onInputEncoding(e: KeyFormat): void;
  hmacAlg: DigestId;
  onHmacAlg(alg: DigestId): void;
}

/** Text in; every selected digest, the expected-hash check and HMAC out. */
export const TextHash: React.FC<TextHashProps> = ({
  selected,
  output,
  inputEncoding,
  onInputEncoding,
  hmacAlg,
  onHmacAlg,
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

  // A file dropped on the field opens like Open file (TextArea onFiles).
  const textFile = useTextFile({ onChange: setInput });
  const inputCard = (
    <Card as="section" title="Message">
      <Stack gap="5">
        <TextArea
          onFiles={textFile.onFiles}
          label="Text to hash"
          labelHidden
          rows={5}
          maxRows={16}
          spellCheck={false}
          placeholder="Type or paste the message."
          value={input}
          onChange={setInput}
          error={message.error}
        />
        <TextSourceActions
          value={input}
          onChange={setInput}
          label="Text to hash"
          handoff={acceptsText}
          onExample={() => setInput(EXAMPLE)}
        />
        <Inline gap="5" align="end" wrap>
          <Select
            label="Input encoding"
            width="sm"
            value={inputEncoding}
            onChange={(v) => onInputEncoding(v as KeyFormat)}
            options={ENCODINGS}
          />
          {input === '' ? (
            <Switch
              label="Hash an empty message"
              checked={hashEmpty}
              onChange={setHashEmpty}
            />
          ) : null}
        </Inline>
      </Stack>
    </Card>
  );

  const outputCard = (
    <Stack gap="6">
      <Card as="section" title="Hashes">
        <Stack gap="5">
          {shown.length > 0 ? (
            <>
              <VerifyField
                value={expected}
                onChange={setExpected}
                results={results}
              />
              <ResultList
                results={shown.map((id) => ({
                  id,
                  name: digestInfo(id).name,
                  info: digestInfo(id),
                  value: formatDigest(results[id]!, output),
                  // Only the matching row is marked; the verdict says the rest.
                  match:
                    expected.trim() && expectedHex === results[id]
                      ? true
                      : undefined,
                }))}
              />
            </>
          ) : (
            <EmptyState
              icon={hash}
              title="No hashes yet"
              description="Type a message to see its hashes, and check one against a hash you were given."
              actions={
                <Button
                  variant="soft"
                  icon={sparkles}
                  onClick={() => setInput(EXAMPLE)}
                >
                  Try an example
                </Button>
              }
            />
          )}
        </Stack>
      </Card>
      <HmacCard
        message={message.bytes}
        alg={hmacAlg}
        onAlg={onHmacAlg}
        output={output}
      />
    </Stack>
  );

  return <TransformLayout start={inputCard} end={outputCard} />;
};
