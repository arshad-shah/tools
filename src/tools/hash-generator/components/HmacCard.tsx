import {
  Card,
  Grid,
  Select,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import React, { useEffect, useMemo, useState } from 'react';
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
import { ResultList } from './ResultRow';

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

/** HMAC, apart from plain hashes so the key is visible and required. */
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
    const inputs = [alg, parsed.bytes, message];
    void hmac(alg, parsed.bytes, message).then(
      (value) => live && setComputed({ key: inputs, value }),
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
    <Card as="section" title="HMAC">
      <Stack gap="5">
        <TextField
          label="HMAC secret key"
          placeholder="Used for HMAC only, never stored"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={setKey}
          error={parsed.error}
        />
        <Grid minItemWidth="12rem" gap="4">
          <Select
            label="HMAC key format"
            value={keyFormat}
            onChange={(v) => setKeyFormat(v as KeyFormat)}
            options={KEY_FORMATS}
          />
          <Select
            label="HMAC algorithm"
            value={alg}
            onChange={(v) => onAlg(v as DigestId)}
            options={HMAC_DIGEST_IDS.map((id) => ({
              value: id,
              label: `HMAC-${digestInfo(id).name}`,
            }))}
          />
        </Grid>
        {!key ? (
          <Text size="sm" tone="muted">
            Enter an HMAC secret key to compute HMAC values. The key is never
            stored.
          </Text>
        ) : !message ? (
          <Text size="sm" tone="muted">
            Type a message to sign it.
          </Text>
        ) : value !== null && !parsed.error ? (
          <ResultList
            results={[
              {
                id: `hmac-${alg}`,
                name,
                value: formatDigest(value, output),
              },
            ]}
          />
        ) : null}
      </Stack>
    </Card>
  );
};
