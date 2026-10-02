import React from 'react';
import {
  IconCheckCircle,
  IconCopy,
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
  Code,
  Inline,
  Label,
  Select,
  Stack,
  Text,
  Textarea,
} from '@/shared/ui';
import type { KeyKind, SecretEncoding, SignatureStatus } from '../types';
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
  copiedKey: string | null;
  copy: (text: string, key?: string) => Promise<boolean>;
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
  copiedKey,
  copy,
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
              <Stack gap="1">
                <Label htmlFor="jwt-key-type">Key type</Label>
                <div className="w-48">
                  <Select
                    id="jwt-key-type"
                    value={keyKind}
                    onValueChange={(v) => setKeyKind(v as KeyKind)}
                    items={KEY_TYPES}
                  />
                </div>
              </Stack>
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
            <Textarea
              id="jwt-verify-key"
              value={keyText}
              onChange={setKeyText}
              rows={4}
              spellCheck={false}
              autoComplete="off"
              placeholder={
                keyKind === 'secret'
                  ? 'The shared secret used for HS256, HS384 or HS512'
                  : keyKind === 'pem'
                    ? 'PEM public key (BEGIN PUBLIC KEY)'
                    : 'JWK or JWKS JSON'
              }
            />
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
              <Alert status="danger">
                <AlertDescription>{sigStatus.message}</AlertDescription>
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
          <Stack gap="2">
            <Inline justify="between" align="center">
              <Text size="sm" weight="medium">
                Base64-encoded signature
              </Text>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={
                  copiedKey === 'signature' ? (
                    <IconCheckCircle size="sm" />
                  ) : (
                    <IconCopy size="sm" />
                  )
                }
                onClick={() => void copy(signature, 'signature')}
              >
                {copiedKey === 'signature' ? 'Copied' : 'Copy'}
              </Button>
            </Inline>
            <Code block>{signature}</Code>
          </Stack>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </Stack>
);
