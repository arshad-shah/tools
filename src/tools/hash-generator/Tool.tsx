import React, { useMemo, useState } from 'react';
import { IconCheck, IconCopy, IconUpload, IconX } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  FilePicker,
  Heading,
  Inline,
  Input,
  Label,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
} from '@/shared/ui';
import { useClipboard } from '@/shared/lib/clipboard';
import { toToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';
import { useHandoffFiles } from '@/shared/lib/handoff';
import {
  ALGORITHMS,
  HMAC_ALGORITHMS,
  computeHash,
  computeHmac,
  isHmac,
  parseKey,
  type KeyFormat,
} from './lib/hash';

interface Result {
  id: string;
  name: string;
  value?: string;
  error?: string;
}

const KEY_FORMATS = [
  { value: 'text', label: 'Text (UTF-8)' },
  { value: 'hex', label: 'Hex' },
];

const HashGenerator: React.FC = () => {
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<string>('all');
  const [hmacKey, setHmacKey] = useState('');
  const [keyFormat, setKeyFormat] = useState<KeyFormat>('text');
  // An empty message is a valid input (SHA-256("") is well known), but
  // only hashed when asked, so the page does not open full of results.
  const [hashEmpty, setHashEmpty] = useState(false);
  // A file replaces the text as the message while it is set.
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(
    null,
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const hasInput = file !== null || input !== '' || hashEmpty;
  const message = file ? file.bytes : input;

  const openFile = async (picked: File) => {
    setFileError(null);
    try {
      setFile({ name: picked.name, bytes: await readBytes(picked) });
    } catch (e) {
      setFileError(toToolError(e).message);
    }
  };
  // A file dropped on a hub is hashed like a picked one (spec §5.3).
  useHandoffFiles((files) => void openFile(files[0]));
  const { copiedKey, copy } = useClipboard();

  const items = useMemo(
    () => [
      { value: 'all', label: 'All algorithms' },
      ...ALGORITHMS.map((a) => ({ value: a.id, label: a.name })),
      ...HMAC_ALGORITHMS.map((a) => ({ value: a.id, label: a.name })),
    ],
    [],
  );

  const wantsHmac = selected === 'all' || isHmac(selected);

  // The key is parsed once; a bad hex key is reported, never hashed.
  const key = useMemo((): { bytes?: Uint8Array; error?: string } => {
    if (!hmacKey) return {};
    try {
      return { bytes: parseKey(hmacKey, keyFormat) };
    } catch (e) {
      return { error: toToolError(e).message };
    }
  }, [hmacKey, keyFormat]);

  const results = useMemo((): Result[] => {
    if (!hasInput) return [];
    const out: Result[] = [];
    const run = (id: string, name: string, fn: () => string) => {
      try {
        out.push({ id, name, value: fn() });
      } catch (e) {
        out.push({ id, name, error: toToolError(e).message });
      }
    };
    for (const a of ALGORITHMS) {
      if (selected === 'all' || selected === a.id)
        run(a.id, a.name, () => computeHash(a.id, message));
    }
    if (key.bytes) {
      const bytes = key.bytes;
      for (const a of HMAC_ALGORITHMS) {
        if (selected === 'all' || selected === a.id)
          run(a.id, a.name, () => computeHmac(a.id, bytes, message));
      }
    }
    return out;
  }, [message, hasInput, selected, key.bytes]);

  return (
    <Stack gap="6">
      <Card>
        <CardBody>
          <Stack gap="5">
            <Stack gap="2">
              <Inline justify="between" align="center">
                <Label htmlFor="hash-input">Text to hash</Label>
                {input && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<IconX size="sm" />}
                    onClick={() => setInput('')}
                  >
                    Clear
                  </Button>
                )}
              </Inline>
              {file ? (
                <Inline justify="between" align="center" gap="3" wrap>
                  <Text size="sm">
                    Hashing file{' '}
                    <Text as="span" weight="semibold">
                      {file.name}
                    </Text>{' '}
                    ({formatBytes(file.bytes.byteLength)})
                  </Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<IconX size="sm" />}
                    onClick={() => setFile(null)}
                  >
                    Clear file
                  </Button>
                </Inline>
              ) : (
                <Textarea
                  id="hash-input"
                  value={input}
                  onChange={setInput}
                  placeholder="Enter text to generate hashes…"
                  rows={4}
                />
              )}
              <Inline gap="2" align="center">
                <FilePicker onFiles={(files) => void openFile(files[0])}>
                  {(open) => (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<IconUpload size="sm" />}
                      onClick={open}
                    >
                      Hash a file
                    </Button>
                  )}
                </FilePicker>
                <Text size="xs" tone="muted">
                  Files are hashed on this device.
                </Text>
              </Inline>
              {fileError && (
                <Alert status="danger">
                  <AlertDescription>{fileError}</AlertDescription>
                </Alert>
              )}
              {!input && !file && (
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
            </Stack>

            <Stack gap="2">
              <Label htmlFor="hash-algo">Hash algorithm</Label>
              <Select
                id="hash-algo"
                value={selected}
                onValueChange={setSelected}
                items={items}
                aria-label="Hash algorithm"
              />
            </Stack>

            {wantsHmac && (
              <Stack gap="2">
                <Label htmlFor="hmac-key">HMAC secret key</Label>
                <Inline gap="2" align="center" wrap={false}>
                  <Input
                    id="hmac-key"
                    value={hmacKey}
                    onChange={setHmacKey}
                    placeholder="Secret key used for HMAC only"
                    autoComplete="off"
                    spellCheck={false}
                    invalid={!!key.error}
                  />
                  <div className="w-40 shrink-0">
                    <Select
                      value={keyFormat}
                      onValueChange={(v) => setKeyFormat(v as KeyFormat)}
                      items={KEY_FORMATS}
                      aria-label="HMAC key format"
                    />
                  </div>
                </Inline>
                <Text size="sm" tone="subtle">
                  HMAC values are only computed when you enter a key. The key
                  never leaves your browser.
                </Text>
              </Stack>
            )}
          </Stack>
        </CardBody>
      </Card>

      {key.error && (
        <Alert status="danger">
          <AlertDescription>{key.error}</AlertDescription>
        </Alert>
      )}

      {!hasInput ? (
        <Alert status="info">
          <AlertDescription>
            Enter text above to generate hash values.
          </AlertDescription>
        </Alert>
      ) : (
        <Stack gap="3">
          <Heading level={2} size="lg">
            Hash results
          </Heading>
          {wantsHmac && !hmacKey && (
            <Alert status="info">
              <AlertDescription>
                Enter an HMAC secret key to compute HMAC values.
              </AlertDescription>
            </Alert>
          )}
          {results.map(({ id, name, value, error }) => {
            const isCopied = copiedKey === id;
            return (
              <Card key={id}>
                <CardHeader>
                  <Inline justify="between" align="center">
                    <CardTitle as="h3">{name}</CardTitle>
                    <Button
                      variant={isCopied ? 'primary' : 'secondary'}
                      size="sm"
                      disabled={value === undefined}
                      aria-label={`Copy ${name}`}
                      leftIcon={
                        isCopied ? (
                          <IconCheck size="sm" />
                        ) : (
                          <IconCopy size="sm" />
                        )
                      }
                      onClick={() => value && void copy(value, id)}
                    >
                      {isCopied ? 'Copied' : 'Copy'}
                    </Button>
                  </Inline>
                </CardHeader>
                <CardBody>
                  {error !== undefined ? (
                    <Alert status="danger">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : (
                    <Code block data-testid={`hash-${id}`}>
                      {value}
                    </Code>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};

export default HashGenerator;
