import React from 'react';
import {
  IconInfo,
  IconKey,
  IconLock,
  IconShieldAlert,
  IconShieldCheck,
} from '@/shared/ui/icons';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardBody,
  Inline,
  Label,
  SegmentedControl,
  SecretInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInputPanel,
} from '@/shared/ui';
import type { KeyKind, SecretEncoding, SignatureStatus } from '../types';
import { listJwksKeys } from '../lib/jwks';
import {
  KEY_TYPES,
  SAMPLE_JWT,
  SAMPLE_SECRET,
  SECRET_ENCODINGS,
} from '../lib/constants';
import { ClaimCard } from './ClaimCard';

interface SignatureSectionProps {
  signature: string;
  algorithm?: string;
  jwt: string;
  unsigned: boolean;
  hmacAlg: boolean;
  keyKind: KeyKind;
  setKeyKind: (kind: KeyKind) => void;
  secretEncoding: SecretEncoding;
  setSecretEncoding: (encoding: SecretEncoding) => void;
  keyText: string;
  setKeyText: (text: string) => void;
  sigStatus: SignatureStatus;
  handleVerify: () => Promise<void>;
  /** A JWKS with several keys and a token without kid: pick one. */
  pickNeeded: boolean;
  jwksIndex: number | null;
  setJwksIndex: (i: number | null) => void;
}

export const SignatureSection: React.FC<SignatureSectionProps> = ({
  signature,
  algorithm,
  jwt,
  unsigned,
  hmacAlg,
  keyKind,
  setKeyKind,
  secretEncoding,
  setSecretEncoding,
  keyText,
  setKeyText,
  sigStatus,
  handleVerify,
  pickNeeded,
  jwksIndex,
  setJwksIndex,
}) => (
  <Stack gap="4">
    <Alert status="info" icon={<IconInfo />}>
      <AlertTitle>About signatures</AlertTitle>
      <AlertDescription>
        The signature proves the token was issued by the key holder and not
        altered. It is only checked when you enter the key below; the key never
        leaves your browser.
      </AlertDescription>
    </Alert>
    {algorithm && (
      <ClaimCard
        label="Signing algorithm"
        value={`${algorithm} - ${
          algorithm.startsWith('HS')
            ? 'HMAC (symmetric)'
            : algorithm.startsWith('RS')
              ? 'RSA (asymmetric)'
              : algorithm.startsWith('PS')
                ? 'RSA-PSS (asymmetric)'
                : algorithm.startsWith('ES')
                  ? 'ECDSA (elliptic curve)'
                  : 'Other algorithm'
        }`}
        icon={<IconLock size="sm" />}
        colorScheme="warning"
      />
    )}
    {unsigned ? (
      <Alert status="warning" icon={<IconShieldAlert />}>
        <AlertTitle>Unsigned token (alg: none)</AlertTitle>
        <AlertDescription>
          There is no signature to verify. Do not trust the claims of an
          unsigned token.
        </AlertDescription>
      </Alert>
    ) : (
      <Card>
        <CardBody>
          <Stack gap="3">
            <Inline gap="3" wrap align="end">
              <SegmentedControl<KeyKind>
                label="Key type"
                value={keyKind}
                onChange={setKeyKind}
                options={KEY_TYPES as { value: KeyKind; label: string }[]}
                size="sm"
              />
              {keyKind === 'secret' && (
                <Stack gap="1">
                  <Label htmlFor="jwt-secret-encoding">Secret encoding</Label>
                  <div className="w-48">
                    <Select
                      id="jwt-secret-encoding"
                      value={secretEncoding}
                      onValueChange={(v) =>
                        setSecretEncoding(v as SecretEncoding)
                      }
                      items={SECRET_ENCODINGS}
                    />
                  </div>
                </Stack>
              )}
            </Inline>
            <Label htmlFor="jwt-verify-key">Secret or public key</Label>
            {keyKind === 'secret' ? (
              <SecretInput
                id="jwt-verify-key"
                value={keyText}
                onChange={setKeyText}
                label="secret"
                placeholder="The shared secret used for HS256, HS384 or HS512"
              />
            ) : (
              <Textarea
                id="jwt-verify-key"
                value={keyText}
                onChange={setKeyText}
                rows={4}
                spellCheck={false}
                autoComplete="off"
                placeholder={
                  keyKind === 'pem'
                    ? 'PEM public key (BEGIN PUBLIC KEY)'
                    : 'JWK or JWKS JSON'
                }
              />
            )}
            {pickNeeded && (
              <Stack gap="1">
                <Label htmlFor="jwt-jwks-pick">Key from the set</Label>
                <Select
                  id="jwt-jwks-pick"
                  value={jwksIndex === null ? '' : String(jwksIndex)}
                  onValueChange={(v) =>
                    setJwksIndex(v === '' ? null : Number(v))
                  }
                  items={[
                    { value: '', label: 'Choose a key (the token has no kid)' },
                    ...listJwksKeys(keyText).map((k) => ({
                      value: String(k.index),
                      label: k.label,
                    })),
                  ]}
                />
              </Stack>
            )}
            <Inline justify="between" align="center" gap="2" wrap>
              <Text size="sm" tone="subtle">
                {hmacAlg
                  ? `${algorithm} is verified with a shared secret only. A public key is refused.`
                  : `${algorithm} is verified with a public key (PEM or JWK). A shared secret is refused.`}
              </Text>
              <Button
                variant="primary"
                leftIcon={<IconShieldCheck size="sm" />}
                onClick={() => void handleVerify()}
                disabled={!keyText.trim() || sigStatus.state === 'checking'}
              >
                Verify signature
              </Button>
            </Inline>
            {sigStatus.state === 'error' && (
              <Alert status="danger" size="sm">
                {sigStatus.message}
              </Alert>
            )}
            {jwt === SAMPLE_JWT && (
              <Text size="sm" tone="subtle">
                The sample token is signed with the secret {SAMPLE_SECRET}.
              </Text>
            )}
          </Stack>
        </CardBody>
      </Card>
    )}
    <Accordion type="single">
      <AccordionItem value="signature-value">
        <AccordionTrigger>
          <span className="inline-flex items-center gap-2">
            <IconKey size="sm" />
            <Text as="span" weight="medium">
              Signature value
            </Text>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <TextInputPanel
            label="Base64-encoded signature"
            value={signature}
            onChange={() => {}}
            language="plain"
            readOnly
            wrap
            minHeight={80}
            maxHeight={320}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </Stack>
);
