import {
  Button,
  Card,
  CodeBlock,
  EmptyState,
  Inline,
  Notice,
  Select,
  Stack,
  Text,
  TextArea,
  TextField,
} from '@arshad-shah/cynosure';
import { arrowRight, clock, key } from '@arshad-shah/cynosure/icons';
import { useEffect, useMemo, useState } from 'react';
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
    return { error: toToolError(e).message };
  }
}

/**
 * Build and sign a token (spec §8.3): the input card (algorithm, header,
 * payload, key) and the output card (the signed token), side by side on
 * wide screens. Keys stay in this tab's memory only.
 */
export function BuilderView({
  onOpen,
  layout,
}: {
  /** "Open in decoder": decode this token. */
  onOpen(token: string): void;
  /** Puts the two cards side by side or one above the other. */
  layout(input: React.ReactNode, output: React.ReactNode): React.ReactNode;
}) {
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
    const signingKey = hmac
      ? { kind: 'secret' as const, value: secret, encoding }
      : { kind: 'private' as const, key: usablePair!.privateKey };
    signJwt(h.value, p.value, signingKey, alg).then(
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

  const input = (
    <Card as="section" title="Claims and key">
      <Stack gap="5">
        <Select
          label="Algorithm"
          description="The header's alg is always set to this."
          value={alg}
          onChange={(v) => setAlg(v as SignAlg)}
          options={SIGN_ALGS.map((a) => ({ value: a, label: a }))}
        />
        <TextArea
          label="Header JSON"
          rows={3}
          spellCheck={false}
          value={header}
          onChange={setHeader}
          error={h.error}
        />
        <TextArea
          label="Payload JSON"
          rows={7}
          spellCheck={false}
          value={payload}
          onChange={setPayload}
          error={p.error}
        />
        <Inline gap="2" wrap>
          <Button
            size="sm"
            variant="soft"
            icon={clock}
            disabled={!p.value}
            onClick={() => setClaim('iat', nowSeconds())}
          >
            Set iat to now
          </Button>
          {EXP_PRESETS.map((e) => (
            <Button
              key={e.label}
              size="sm"
              variant="soft"
              disabled={!p.value}
              onClick={() => setClaim('exp', nowSeconds() + e.seconds)}
            >
              exp {e.label}
            </Button>
          ))}
        </Inline>
        {hmac ? (
          <Stack gap="4">
            <TextField
              label="Signing secret"
              description="Kept in this tab's memory only, never stored."
              type="password"
              revealable
              autoComplete="off"
              spellCheck={false}
              value={secret}
              onChange={setSecret}
            />
            <Select
              label="Secret encoding"
              size="sm"
              value={encoding}
              onChange={(v) => setEncoding(v as SecretEncoding)}
              options={SECRET_ENCODINGS}
            />
          </Stack>
        ) : (
          <Stack gap="4">
            <Inline gap="3" align="center" wrap>
              <Button variant="soft" icon={key} onClick={() => void generate()}>
                Generate key pair
              </Button>
              <Text size="sm" tone="muted">
                The private key stays in this tab and is never shown or stored.
              </Text>
            </Inline>
            {pairError ? <Notice tone="danger">{pairError}</Notice> : null}
            {usablePair ? (
              <>
                <CodeBlock
                  title="Public key (PEM)"
                  code={usablePair.publicPem}
                  copyable
                />
                <CodeBlock
                  title="Public key (JWK)"
                  code={pretty(usablePair.publicJwk)}
                  language="json"
                  copyable
                />
              </>
            ) : null}
          </Stack>
        )}
      </Stack>
    </Card>
  );

  const output = (
    <Card as="section" title="Signed token">
      {current?.error ? (
        <Notice tone="danger">{current.error}</Notice>
      ) : current?.token ? (
        <Stack gap="5">
          <CodeBlock title="Signed token" code={current.token} wrap copyable />
          <Button
            variant="solid"
            tone="accent"
            iconEnd={arrowRight}
            onClick={() => current.token && onOpen(current.token)}
          >
            Open in decoder
          </Button>
        </Stack>
      ) : (
        <EmptyState
          size="sm"
          icon={key}
          title="Nothing signed yet"
          description={
            hmac
              ? 'Enter a signing secret to sign the token.'
              : 'Generate a key pair to sign the token.'
          }
        />
      )}
    </Card>
  );

  return layout(input, output);
}
