import {
  Button,
  CodeBlock,
  DescriptionList,
  Form,
  Disclosure,
  Notice,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextArea,
  TextField,
} from '@arshad-shah/cynosure';
import { shieldCheck } from '@arshad-shah/cynosure/icons';
import { listJwksKeys } from '../lib/jwks';
import {
  KEY_TYPES,
  SAMPLE_JWT,
  SAMPLE_SECRET,
  SECRET_ENCODINGS,
} from '../lib/constants';
import { SIGNATURE_TEXT } from '../lib/status';
import type { useSignatureVerification } from '../hooks/useSignatureVerification';
import type { KeyKind, SecretEncoding } from '../types';

type Verify = ReturnType<typeof useSignatureVerification>;

const family = (alg: string) =>
  alg.startsWith('HS')
    ? 'HMAC with a shared secret'
    : alg.startsWith('RS')
      ? 'RSA (public key)'
      : alg.startsWith('PS')
        ? 'RSA-PSS (public key)'
        : alg.startsWith('ES')
          ? 'ECDSA (elliptic curve public key)'
          : 'Another algorithm';

/**
 * The signature: what signed it, the key to check it with (its kind chosen
 * explicitly, never guessed), the result next to the Verify button.
 */
export function SignaturePanel({
  signature,
  algorithm,
  jwt,
  verify,
}: {
  signature: string;
  algorithm: string;
  jwt: string;
  verify: Verify;
}) {
  const status = verify.sigStatus;
  return (
    <Stack gap="6">
      <DescriptionList
        size="sm"
        layout="inline"
        items={[
          { term: 'Algorithm', detail: algorithm },
          { term: 'Kind', detail: family(algorithm) },
        ]}
      />
      {verify.unsigned ? (
        <Notice tone="warning" title={SIGNATURE_TEXT.unsigned.title}>
          There is no signature to verify. Do not trust the claims of an
          unsigned token.
        </Notice>
      ) : (
        <Form
          label="Verify the signature"
          gap="5"
          onSubmit={() => {
            if (verify.keyText.trim()) void verify.handleVerify();
          }}
        >
          <SegmentedControl
            label="Key type"
            size="sm"
            value={verify.keyKind}
            onChange={(v) => verify.setKeyKind(v as KeyKind)}
            options={KEY_TYPES}
          />
          {verify.keyKind === 'secret' ? (
            <Stack gap="4">
              <TextField
                id="jwt-verify-key"
                label="Secret or public key"
                type="password"
                revealable
                autoComplete="off"
                spellCheck={false}
                placeholder="The shared secret used for HS256, HS384 or HS512"
                value={verify.keyText}
                onChange={verify.setKeyText}
              />
              <Select
                label="Secret encoding"
                size="sm"
                value={verify.secretEncoding}
                onChange={(v) => verify.setSecretEncoding(v as SecretEncoding)}
                options={SECRET_ENCODINGS}
              />
            </Stack>
          ) : (
            <TextArea
              id="jwt-verify-key"
              label="Secret or public key"
              monospace
              rows={5}
              spellCheck={false}
              autoComplete="off"
              placeholder={
                verify.keyKind === 'pem'
                  ? 'PEM public key (BEGIN PUBLIC KEY)'
                  : 'JWK or JWKS JSON'
              }
              value={verify.keyText}
              onChange={verify.setKeyText}
            />
          )}
          {verify.pickNeeded ? (
            <Select
              label="Key from the set"
              placeholder="Choose a key (the token has no kid)"
              value={
                verify.jwksIndex === null ? undefined : String(verify.jwksIndex)
              }
              onChange={(v) => verify.setJwksIndex(v === '' ? null : Number(v))}
              options={listJwksKeys(verify.keyText).map((k) => ({
                value: String(k.index),
                label: k.label,
              }))}
            />
          ) : null}
          <Text size="sm" tone="muted">
            {verify.hmacAlg
              ? `${algorithm} is verified with a shared secret only. A public key is refused.`
              : `${algorithm} is verified with a public key (PEM or JWK). A shared secret is refused.`}
            {jwt === SAMPLE_JWT
              ? ` The example token is signed with the secret ${SAMPLE_SECRET}.`
              : ''}
          </Text>
          <Button
            variant="solid"
            tone="accent"
            icon={shieldCheck}
            loading={status.state === 'checking'}
            disabled={!verify.keyText.trim()}
            type="submit"
          >
            Verify signature
          </Button>
          {/* The result in words next to the button; the status above
              says it with its tone. */}
          <Text
            size="sm"
            tone={
              status.state === 'verified'
                ? 'success'
                : status.state === 'invalid' || status.state === 'error'
                  ? 'danger'
                  : 'muted'
            }
          >
            {status.state === 'verified' ||
            status.state === 'invalid' ||
            status.state === 'error'
              ? `Checked: ${status.state === 'error' ? 'the key could not be used' : status.state === 'verified' ? 'the signature matches this key' : 'the signature does not match this key'}.`
              : ''}
          </Text>
        </Form>
      )}
      <Disclosure summary="Signature value" variant="line">
        <CodeBlock code={signature} title="Base64url signature" wrap copyable />
      </Disclosure>
    </Stack>
  );
}
