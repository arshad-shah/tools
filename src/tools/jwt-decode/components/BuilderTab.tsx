import React, { useEffect, useMemo, useState } from 'react';
import { IconClock, IconExternalLink, IconKeyRound } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  CodeSurface,
  Inline,
  Input,
  Label,
  Select,
  Stack,
  Text,
  TextInputPanel,
  type CodeMarker,
} from '@/shared/ui';
import { JsonLocateError } from '@/shared/lib/data-formats/json-locate';
import { toToolError } from '@/shared/lib/errors';
import { SECRET_ENCODINGS } from '../lib/constants';
import {
  EXP_PRESETS,
  generateJwtKeyPair,
  isHmacAlg,
  nowSeconds,
  parseClaims,
  signJwt,
  SIGN_ALGS,
  type JwtKeyPair,
  type SignAlg,
} from '../lib/sign';
import type { SecretEncoding } from '../types';

const pretty = (o: object) => JSON.stringify(o, null, 2);

function parse(text: string, name: string) {
  try {
    return { value: parseClaims(text, name) };
  } catch (e) {
    const err = toToolError(e);
    const loc = err.cause instanceof JsonLocateError ? err.cause : null;
    return {
      error: err.message,
      markers: loc
        ? [
            {
              line: loc.line,
              column: loc.column,
              message: err.message,
              severity: 'error' as const,
            },
          ]
        : [],
    };
  }
}

interface BuilderTabProps {
  /** "Open in decoder": switch tabs and fill the token. */
  onOpen(token: string): void;
}

/**
 * Builds and signs a token (spec §8.3): header and payload editors, claim
 * helpers, an HS secret or a generated key pair kept in memory only.
 */
export const BuilderTab: React.FC<BuilderTabProps> = ({ onOpen }) => {
  const [alg, setAlg] = useState<SignAlg>('HS256');
  const [header, setHeader] = useState(() => pretty({ typ: 'JWT' }));
  const [payload, setPayload] = useState(() =>
    pretty({ sub: '1234567890', name: 'Jane Doe', iat: nowSeconds() }),
  );
  const [secret, setSecret] = useState('');
  const [encoding, setEncoding] = useState<SecretEncoding>('text');
  const [pair, setPair] = useState<JwtKeyPair | null>(null);
  const [pairError, setPairError] = useState('');
  const [signed, setSigned] = useState<{
    input: unknown[];
    token?: string;
    error?: string;
  }>();

  const h = useMemo(() => parse(header, 'header'), [header]);
  const p = useMemo(() => parse(payload, 'payload'), [payload]);
  const hmac = isHmacAlg(alg);
  const usablePair = pair && pair.alg === alg ? pair : null;
  const ready = h.value && p.value && (hmac ? secret !== '' : usablePair);
  const inputs = [h.value, p.value, alg, secret, encoding, usablePair];

  useEffect(() => {
    let live = true;
    if (!h.value || !p.value || (hmac ? secret === '' : !usablePair)) return;
    const key = hmac
      ? { kind: 'secret' as const, value: secret, encoding }
      : { kind: 'private' as const, key: usablePair!.privateKey };
    signJwt(h.value, p.value, key, alg).then(
      (token) => live && setSigned({ input: inputs, token }),
      (e) =>
        live && setSigned({ input: inputs, error: toToolError(e).message }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h.value, p.value, alg, secret, encoding, usablePair, hmac]);

  const current =
    ready && signed && signed.input.every((v, i) => v === inputs[i])
      ? signed
      : undefined;

  const setClaim = (name: string, value: number) => {
    if (!p.value) return;
    setPayload(pretty({ ...p.value, [name]: value }));
  };

  const generate = async () => {
    setPairError('');
    try {
      setPair(await generateJwtKeyPair(alg));
    } catch (e) {
      setPairError(toToolError(e).message);
    }
  };

  return (
    <Stack gap="4">
      <Inline gap="3" align="end" wrap>
        <Stack gap="1">
          <Label htmlFor="jwt-build-alg">Algorithm</Label>
          <div className="w-40">
            <Select
              id="jwt-build-alg"
              value={alg}
              onValueChange={(v) => setAlg(v as SignAlg)}
              items={SIGN_ALGS.map((a) => ({ value: a, label: a }))}
            />
          </div>
        </Stack>
        <Text size="sm" tone="subtle">
          The header alg is always set to the algorithm chosen here.
        </Text>
      </Inline>

      <Stack gap="1">
        <Text size="sm" weight="semibold">
          Header
        </Text>
        <CodeSurface
          label="Header JSON"
          value={header}
          onChange={setHeader}
          language="json"
          markers={h.markers}
          minHeight={80}
        />
      </Stack>
      <Stack gap="1">
        <Inline justify="between" align="center" wrap gap="2">
          <Text size="sm" weight="semibold">
            Payload
          </Text>
          <Inline gap="1" wrap>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<IconClock size="sm" />}
              onClick={() => setClaim('iat', nowSeconds())}
              disabled={!p.value}
            >
              Set iat to now
            </Button>
            {EXP_PRESETS.map((e) => (
              <Button
                key={e.label}
                variant="ghost"
                size="sm"
                onClick={() => setClaim('exp', nowSeconds() + e.seconds)}
                disabled={!p.value}
              >
                exp {e.label}
              </Button>
            ))}
          </Inline>
        </Inline>
        <CodeSurface
          label="Payload JSON"
          value={payload}
          onChange={setPayload}
          language="json"
          markers={p.markers as CodeMarker[] | undefined}
          minHeight={140}
        />
      </Stack>
      {(h.error || p.error) && (
        <Alert status="danger">
          <AlertDescription>{h.error ?? p.error}</AlertDescription>
        </Alert>
      )}

      {hmac ? (
        <Inline gap="3" align="end" wrap>
          <Stack gap="1" className="min-w-60 flex-1">
            <Label htmlFor="jwt-build-secret">Signing secret</Label>
            <Input
              id="jwt-build-secret"
              type="password"
              value={secret}
              onChange={setSecret}
              autoComplete="off"
              spellCheck={false}
              placeholder="Kept in memory only, never stored"
            />
          </Stack>
          <Stack gap="1">
            <Label htmlFor="jwt-build-encoding">Secret encoding</Label>
            <div className="w-44">
              <Select
                id="jwt-build-encoding"
                value={encoding}
                onValueChange={(v) => setEncoding(v as SecretEncoding)}
                items={SECRET_ENCODINGS}
              />
            </div>
          </Stack>
        </Inline>
      ) : (
        <Stack gap="3">
          <Inline gap="2" align="center" wrap>
            <Button
              variant="secondary"
              leftIcon={<IconKeyRound size="sm" />}
              onClick={() => void generate()}
            >
              Generate key pair
            </Button>
            <Text size="sm" tone="subtle">
              The private key stays in this tab's memory and is never shown or
              stored.
            </Text>
          </Inline>
          {pairError && (
            <Alert status="danger">
              <AlertDescription>{pairError}</AlertDescription>
            </Alert>
          )}
          {usablePair && (
            <>
              <TextInputPanel
                label="Public key (PEM)"
                value={usablePair.publicPem}
                onChange={() => {}}
                language="plain"
                readOnly
                minHeight={80}
              />
              <TextInputPanel
                label="Public key (JWK)"
                value={pretty(usablePair.publicJwk)}
                onChange={() => {}}
                language="json"
                readOnly
                minHeight={80}
              />
            </>
          )}
        </Stack>
      )}

      {current?.error && (
        <Alert status="danger">
          <AlertDescription>{current.error}</AlertDescription>
        </Alert>
      )}
      <TextInputPanel
        label="Signed token"
        value={current?.token ?? ''}
        onChange={() => {}}
        language="plain"
        readOnly
        wrap
        minHeight={80}
        placeholder={
          hmac ? 'Enter a secret to sign' : 'Generate a key pair to sign'
        }
      />
      <Inline justify="end">
        <Button
          variant="primary"
          leftIcon={<IconExternalLink size="sm" />}
          disabled={!current?.token}
          onClick={() => current?.token && onOpen(current.token)}
        >
          Open in decoder
        </Button>
      </Inline>
    </Stack>
  );
};
