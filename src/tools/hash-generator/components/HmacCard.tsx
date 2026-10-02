import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Inline,
  Input,
  Label,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
import {
  bytesFrom,
  digestInfo,
  hmac,
  HMAC_DIGEST_IDS,
  type DigestId,
  type KeyFormat,
} from '@/shared/lib/crypto/digest';
import { toToolError } from '@/shared/lib/errors';
import { formatDigest, type DigestFormat } from '../lib/format';
import { ResultRow } from './ResultRow';

const KEY_FORMATS = [
  { value: 'text', label: 'Text (UTF-8)' },
  { value: 'hex', label: 'Hex' },
  { value: 'base64', label: 'Base64' },
];

interface HmacCardProps {
  message: Uint8Array | null;
  alg: DigestId;
  onAlg(alg: DigestId): void;
  output: DigestFormat;
}

/** HMAC, separate from plain hashes so the key is visible and required. */
export const HmacCard: React.FC<HmacCardProps> = ({
  message,
  alg,
  onAlg,
  output,
}) => {
  const [key, setKey] = useState('');
  const [keyFormat, setKeyFormat] = useState<KeyFormat>('text');
  // Keyed by its inputs, so a stale result is never shown.
  const [computed, setComputed] = useState<{ key: unknown[]; value: string }>();

  const parsed = useMemo((): { bytes?: Uint8Array; error?: string } => {
    if (!key) return {};
    try {
      return { bytes: bytesFrom(key, keyFormat, 'The HMAC key') };
    } catch (e) {
      return { error: toToolError(e).message };
    }
  }, [key, keyFormat]);

  useEffect(() => {
    let live = true;
    if (!parsed.bytes || !message) return;
    const key = [alg, parsed.bytes, message];
    void hmac(alg, parsed.bytes, message).then(
      (value) => live && setComputed({ key, value }),
    );
    return () => {
      live = false;
    };
  }, [alg, parsed.bytes, message]);

  const name = `HMAC-${digestInfo(alg).name}`;
  const k = computed?.key;
  const value =
    k && k[0] === alg && k[1] === parsed.bytes && k[2] === message
      ? computed!.value
      : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">HMAC</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack gap="3">
          <Label htmlFor="hmac-key">HMAC secret key</Label>
          <Inline gap="2" align="center" wrap>
            <div className="min-w-48 flex-1">
              <Input
                id="hmac-key"
                value={key}
                onChange={setKey}
                placeholder="Secret key used for HMAC only"
                autoComplete="off"
                spellCheck={false}
                invalid={!!parsed.error}
              />
            </div>
            <div className="w-40">
              <Select
                value={keyFormat}
                onValueChange={(v) => setKeyFormat(v as KeyFormat)}
                items={KEY_FORMATS}
                aria-label="HMAC key format"
              />
            </div>
            <div className="w-48">
              <Select
                value={alg}
                onValueChange={(v) => onAlg(v as DigestId)}
                items={HMAC_DIGEST_IDS.map((id) => ({
                  value: id,
                  label: `HMAC-${digestInfo(id).name}`,
                }))}
                aria-label="HMAC algorithm"
              />
            </div>
          </Inline>
          {parsed.error && (
            <Alert status="danger">
              <AlertDescription>{parsed.error}</AlertDescription>
            </Alert>
          )}
          {!key ? (
            <Text size="sm" tone="subtle">
              Enter an HMAC secret key to compute HMAC values. The key is never
              stored.
            </Text>
          ) : (
            value !== null && (
              <ResultRow
                id={`hmac-${alg}`}
                name={name}
                value={formatDigest(value, output)}
              />
            )
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};
