import React, { useEffect, useMemo, useState } from 'react';
import {
  IconAlertCircle,
  IconBraces,
  IconBrackets,
  IconCheckCircle,
  IconClock,
  IconCopy,
  IconFileJson,
  IconGlobe,
  IconInfo,
  IconKey,
  IconLock,
  IconRefreshCw,
  IconSettings,
  IconShield,
  IconShieldAlert,
  IconShieldCheck,
  IconShieldX,
  IconTrash2,
  IconUser,
} from '@/shared/ui/icons';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Code,
  Grid,
  Input,
  Inline,
  Label,
  Select,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from '@/shared/ui';
import { ExpiryInfo, JWTHeader, JWTPayload } from './types';
import {
  formatTime,
  getClaimIcon,
  getClaimLabel,
  getExpiryInfo,
} from './lib/claims';
import useJwtDecoder from './hooks/useJwtDecoder';
import { useClipboard } from '@/shared/lib/clipboard';
import { toToolError } from '@/shared/lib/errors';
import { timeClaimsStatus, type TimeStatus } from './lib/jwt';
import {
  verifyJwt,
  type KeyInput,
  type KeyKind,
  type SecretEncoding,
} from './lib/verify';

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InNhbXBsZS1rZXkifQ.eyJzdWIiOiJ1c2VyLTEyMzQ1IiwibmFtZSI6IkphbmUgRG9lIiwiZW1haWwiOiJqYW5lQGV4YW1wbGUuY29tIiwiaWF0IjoxNzI2MjM5MDIyLCJleHAiOjE3NTc3NzUwMjIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6WyJhcGkuZXhhbXBsZS5jb20iLCJ3ZWIuZXhhbXBsZS5jb20iXSwicm9sZXMiOlsidXNlciIsIm1vZGVyYXRvciJdLCJwZXJtaXNzaW9ucyI6WyJyZWFkOnBvc3RzIiwid3JpdGU6cG9zdHMiLCJtb2RlcmF0ZTpjb21tZW50cyJdLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwiZ3JvdXBzIjpbImRldmVsb3BlcnMiLCJiZXRhLXVzZXJzIl0sImN1c3RvbV9jbGFpbSI6eyJkZXBhcnRtZW50IjoiZW5naW5lZXJpbmciLCJ0ZWFtX2lkIjo0Mn19.Olk3AuFENIdCJiCYxGpglmauBWmLx42p7P3cjybazSI';

// The sample is really signed (HS256) so verification can be tried out.
const SAMPLE_SECRET = 'sample-secret';

const IDENTITY_KEYS = [
  'sub',
  'name',
  'email',
  'preferred_username',
  'given_name',
  'family_name',
];
const ACCESS_KEYS = [
  'role',
  'roles',
  'permissions',
  'scope',
  'groups',
  'authorities',
];
const TIMING_KEYS = ['exp', 'iat', 'nbf', 'auth_time'];
const ISSUER_KEYS = ['iss', 'aud', 'azp', 'client_id', 'jti'];

interface ValueRendererProps {
  data: unknown;
  depth?: number;
  maxDepth?: number;
}

const ValueRenderer: React.FC<ValueRendererProps> = ({
  data,
  depth = 0,
  maxDepth = 3,
}) => {
  if (data === null || data === undefined) {
    return (
      <Text size="sm" tone="subtle" className="italic">
        null
      </Text>
    );
  }
  if (typeof data === 'string') {
    return <Code className="text-success">&quot;{data}&quot;</Code>;
  }
  if (typeof data === 'number') {
    return <Code className="text-accent">{data}</Code>;
  }
  if (typeof data === 'boolean') {
    return <Code className="text-accent">{data ? 'true' : 'false'}</Code>;
  }
  if (Array.isArray(data)) {
    if (depth >= maxDepth) {
      return (
        <Inline gap="1" align="center">
          <IconBrackets size="xs" />
          <Text size="sm" tone="subtle">
            Array[{data.length}]
          </Text>
        </Inline>
      );
    }
    return (
      <Stack gap="1">
        <Inline gap="1" align="center">
          <IconBrackets size="sm" />
          <Text size="sm" weight="medium">
            Array ({data.length} items)
          </Text>
        </Inline>
        <Stack gap="1" className="pl-4">
          {data.map((item, i) => (
            <Inline key={i} align="start" gap="2">
              <Text size="sm" tone="subtle">
                {i}:
              </Text>
              <ValueRenderer
                data={item}
                depth={depth + 1}
                maxDepth={maxDepth}
              />
            </Inline>
          ))}
        </Stack>
      </Stack>
    );
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (depth >= maxDepth) {
      return (
        <Inline gap="1" align="center">
          <IconBraces size="xs" />
          <Text size="sm" tone="subtle">
            Object[{entries.length} keys]
          </Text>
        </Inline>
      );
    }
    return (
      <Stack gap="1">
        <Inline gap="1" align="center">
          <IconBraces size="sm" />
          <Text size="sm" weight="medium">
            Object ({entries.length} properties)
          </Text>
        </Inline>
        <Stack gap="1" className="pl-4">
          {entries.map(([key, value]) => (
            <Inline key={key} align="start" gap="2">
              <Code className="text-accent">&quot;{key}&quot;:</Code>
              <ValueRenderer
                data={value}
                depth={depth + 1}
                maxDepth={maxDepth}
              />
            </Inline>
          ))}
        </Stack>
      </Stack>
    );
  }
  return <Text size="sm">{String(data)}</Text>;
};

interface ClaimCardProps {
  label: string;
  value: unknown;
  icon: React.ReactNode;
  colorScheme?: 'neutral' | 'accent' | 'warning' | 'success';
}

const ClaimCard: React.FC<ClaimCardProps> = ({
  label,
  value,
  icon,
  colorScheme = 'neutral',
}) => (
  <Card>
    <CardBody>
      <Inline align="start" gap="3">
        <Box>{icon}</Box>
        <Stack gap="1" className="flex-1 min-w-0">
          <Inline gap="2" align="center">
            <Badge variant="soft" tone={colorScheme} size="xs">
              {label}
            </Badge>
          </Inline>
          <ValueRenderer data={value} />
        </Stack>
      </Inline>
    </CardBody>
  </Card>
);

type SignatureStatus =
  | {
      state: 'unverified' | 'unsigned' | 'checking' | 'verified' | 'invalid';
    }
  | { state: 'error'; message: string };

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

interface Verification {
  token: string;
  key: KeyInput;
  status: SignatureStatus;
}

const sameKey = (a: KeyInput, b: KeyInput) =>
  a.kind === b.kind &&
  a.value === b.value &&
  (a.kind !== 'secret' || b.kind !== 'secret' || a.encoding === b.encoding);

const SIGNATURE_TEXT: Record<
  SignatureStatus['state'],
  { title: string; detail: string; tone: Tone }
> = {
  unsigned: {
    title: 'Unsigned token (alg: none)',
    detail:
      'This token has no signature, so nothing proves who issued it or that it was not changed. Treat its claims as untrusted.',
    tone: 'warning',
  },
  unverified: {
    title: 'Signature not verified',
    detail:
      'Decoding does not prove the token is genuine. Add the secret or public key in the Signature tab to verify it.',
    tone: 'neutral',
  },
  checking: {
    title: 'Checking signature',
    detail: 'Verifying with the key you entered.',
    tone: 'neutral',
  },
  verified: {
    title: 'Signature verified',
    detail: 'The signature matches the key you entered.',
    tone: 'success',
  },
  invalid: {
    title: 'Signature invalid',
    detail:
      'The signature does not match this key. The token was altered or signed with a different key.',
    tone: 'danger',
  },
  error: {
    title: 'Signature could not be checked',
    detail: '',
    tone: 'danger',
  },
};

const timeText = (
  status: TimeStatus,
): {
  title: string;
  detail: string;
  tone: Tone;
} => {
  const at = (s?: number) => (s === undefined ? '' : formatTime(s));
  switch (status.state) {
    case 'none':
      return {
        title: 'No time claims',
        detail: 'The token has no exp, nbf or iat claim.',
        tone: 'neutral',
      };
    case 'expired':
      return {
        title: 'Expired',
        detail: `Expired on ${at(status.exp)}.`,
        tone: 'danger',
      };
    case 'not-yet-valid':
      return {
        title: 'Not valid yet',
        detail: `Not before ${at(status.nbf)}.`,
        tone: 'danger',
      };
    case 'issued-in-future':
      return {
        title: 'Issued in the future',
        detail: `Issued at ${at(status.iat)}, which is ahead of this device's clock. Check the clock skew setting or the issuer's clock.`,
        tone: 'danger',
      };
    case 'current':
      return {
        title: 'Within validity window',
        detail:
          status.exp !== undefined
            ? `Expires ${at(status.exp)}.`
            : 'No expiry (exp) claim.',
        tone: 'success',
      };
  }
};

const StatusRow: React.FC<{
  label: string;
  title: string;
  detail: string;
  tone: Tone;
  icon: React.ReactNode;
}> = ({ label, title, detail, tone, icon }) => (
  <Inline align="start" gap="3">
    <Box className="pt-0.5">{icon}</Box>
    <Stack gap="1" className="min-w-0 flex-1">
      <Inline gap="2" align="center" wrap>
        <Text size="sm" tone="subtle">
          {label}
        </Text>
        <Badge variant="soft" tone={tone} size="sm">
          {title}
        </Badge>
      </Inline>
      {detail && (
        <Text size="sm" tone="subtle">
          {detail}
        </Text>
      )}
    </Stack>
  </Inline>
);

const SECRET_ENCODINGS = [
  { value: 'text', label: 'Text (UTF-8)' },
  { value: 'base64', label: 'Base64' },
  { value: 'base64url', label: 'Base64url' },
];

const KEY_TYPES = [
  { value: 'secret', label: 'Shared secret' },
  { value: 'pem', label: 'PEM public key' },
  { value: 'jwk', label: 'JWK or JWKS' },
];

const MAX_SKEW_SEC = 3600;

const JWTDecoder: React.FC = () => {
  const { jwt, setJwt, decoded, error, decode, clear } = useJwtDecoder();
  // Keyed so only the button pressed shows "Copied" (B10).
  const { copiedKey, copy } = useClipboard();
  const [activeTab, setActiveTab] = useState<
    'header' | 'payload' | 'signature'
  >('payload');

  // Ticks so the countdown and the time-claim status stay live.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const [skewSec, setSkewSec] = useState(0);
  const expiryInfo: ExpiryInfo = useMemo(
    () => getExpiryInfo(decoded?.payload.exp, now, skewSec),
    [decoded?.payload.exp, now, skewSec],
  );
  const timeStatus: TimeStatus | null = decoded
    ? timeClaimsStatus(decoded.payload, Math.floor(now / 1000), skewSec)
    : null;

  const unsigned = decoded?.header.alg === 'none';
  const hmacAlg =
    typeof decoded?.header.alg === 'string' &&
    decoded.header.alg.startsWith('HS');
  const [keyText, setKeyText] = useState('');
  const [keyKind, setKeyKind] = useState<KeyKind>('secret');
  const [secretEncoding, setSecretEncoding] = useState<SecretEncoding>('text');
  // The default key type follows the algorithm; the user can still change it
  // (and a mismatch is refused by verifyJwt, never guessed around).
  const [kindFor, setKindFor] = useState<boolean | null>(null);
  if (decoded && !unsigned && kindFor !== hmacAlg) {
    setKindFor(hmacAlg);
    setKeyKind(hmacAlg ? 'secret' : 'pem');
  }
  const keyInput: KeyInput =
    keyKind === 'secret'
      ? { kind: 'secret', value: keyText, encoding: secretEncoding }
      : { kind: keyKind, value: keyText };
  const [verification, setVerification] = useState<Verification | null>(null);
  // A result only counts for the exact token and key it checked.
  const sigStatus: SignatureStatus = unsigned
    ? { state: 'unsigned' }
    : decoded &&
        verification &&
        verification.token === decoded.raw &&
        sameKey(verification.key, keyInput)
      ? verification.status
      : { state: 'unverified' };

  const handleVerify = async () => {
    if (!decoded) return;
    const attempt = { token: decoded.raw, key: keyInput };
    setVerification({ ...attempt, status: { state: 'checking' } });
    let status: SignatureStatus;
    try {
      status = { state: await verifyJwt(decoded, keyInput) };
    } catch (e) {
      status = { state: 'error', message: toToolError(e).message };
    }
    setVerification({ ...attempt, status });
  };

  useEffect(() => {
    const timer = setTimeout(() => setJwt(SAMPLE_JWT), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSample = () => setJwt(SAMPLE_JWT);
  const handleCopyJwt = () => void copy(jwt, 'jwt');

  const categorizedClaims = useMemo(() => {
    if (!decoded) {
      return {
        identity: [] as Array<[string, unknown]>,
        access: [] as Array<[string, unknown]>,
        timing: [] as Array<[string, unknown]>,
        issuer: [] as Array<[string, unknown]>,
        custom: [] as Array<[string, unknown]>,
      };
    }
    const entries = Object.entries(decoded.payload);
    return {
      identity: entries.filter(([k]) => IDENTITY_KEYS.includes(k)),
      access: entries.filter(([k]) => ACCESS_KEYS.includes(k)),
      timing: entries.filter(([k]) => TIMING_KEYS.includes(k)),
      issuer: entries.filter(([k]) => ISSUER_KEYS.includes(k)),
      custom: entries.filter(
        ([k]) =>
          ![
            ...IDENTITY_KEYS,
            ...ACCESS_KEYS,
            ...TIMING_KEYS,
            ...ISSUER_KEYS,
          ].includes(k),
      ),
    };
  }, [decoded]);

  const renderHeaderSection = (header: JWTHeader) => (
    <Stack gap="4">
      <Grid max={2} gap="3">
        {header.alg && (
          <ClaimCard
            label="Algorithm"
            value={header.alg}
            icon={<IconShield size="sm" />}
            colorScheme="warning"
          />
        )}
        {header.typ && (
          <ClaimCard
            label="Type"
            value={header.typ}
            icon={<IconFileJson size="sm" />}
          />
        )}
        {header.kid && (
          <ClaimCard
            label="Key ID"
            value={header.kid}
            icon={<IconKey size="sm" />}
          />
        )}
      </Grid>
      {Object.keys(header).filter((k) => !['alg', 'typ', 'kid'].includes(k))
        .length > 0 && (
        <Accordion type="single">
          <AccordionItem value="extra">
            <AccordionTrigger>
              <span className="inline-flex items-center gap-2">
                <IconSettings size="sm" />
                <Text as="span" weight="medium">
                  Additional header claims
                </Text>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Grid max={2} gap="3">
                {Object.entries(header)
                  .filter(([k]) => !['alg', 'typ', 'kid'].includes(k))
                  .map(([k, v]) => (
                    <ClaimCard
                      key={k}
                      label={getClaimLabel(k)}
                      value={v}
                      icon={getClaimIcon(k)}
                    />
                  ))}
              </Grid>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      <Accordion type="single">
        <AccordionItem value="raw">
          <AccordionTrigger>
            <span className="inline-flex items-center gap-2">
              <IconBraces size="sm" />
              <Text as="span" weight="medium">
                Raw JSON
              </Text>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <Stack gap="2">
              <Inline justify="between" align="center">
                <Text size="sm" weight="medium">
                  Complete header
                </Text>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={
                    copiedKey === 'header' ? (
                      <IconCheckCircle size="sm" />
                    ) : (
                      <IconCopy size="sm" />
                    )
                  }
                  onClick={() =>
                    void copy(JSON.stringify(header, null, 2), 'header')
                  }
                >
                  {copiedKey === 'header' ? 'Copied' : 'Copy'}
                </Button>
              </Inline>
              <Code block>{JSON.stringify(header, null, 2)}</Code>
            </Stack>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Stack>
  );

  const renderPayloadSection = (payload: JWTPayload) => (
    <Stack gap="4">
      {categorizedClaims.identity.length > 0 && (
        <Accordion type="single" defaultValue="identity">
          <AccordionItem value="identity">
            <AccordionTrigger>
              <span className="inline-flex items-center gap-2">
                <IconUser size="sm" />
                <Text as="span" weight="medium">
                  Identity claims
                </Text>
                <Badge variant="soft" tone="accent" size="xs">
                  {categorizedClaims.identity.length}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Grid max={2} gap="3">
                {categorizedClaims.identity.map(([k, v]) => (
                  <ClaimCard
                    key={k}
                    label={getClaimLabel(k)}
                    value={v}
                    icon={getClaimIcon(k)}
                  />
                ))}
              </Grid>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      {categorizedClaims.access.length > 0 && (
        <Accordion type="single" defaultValue="access">
          <AccordionItem value="access">
            <AccordionTrigger>
              <span className="inline-flex items-center gap-2">
                <IconShield size="sm" />
                <Text as="span" weight="medium">
                  Access &amp; permissions
                </Text>
                <Badge variant="soft" tone="warning" size="xs">
                  {categorizedClaims.access.length}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Grid max={2} gap="3">
                {categorizedClaims.access.map(([k, v]) => (
                  <ClaimCard
                    key={k}
                    label={getClaimLabel(k)}
                    value={v}
                    icon={getClaimIcon(k)}
                    colorScheme="warning"
                  />
                ))}
              </Grid>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      {categorizedClaims.timing.length > 0 && (
        <Accordion type="single" defaultValue="timing">
          <AccordionItem value="timing">
            <AccordionTrigger>
              <span className="inline-flex items-center gap-2">
                <IconClock size="sm" />
                <Text as="span" weight="medium">
                  Timestamps
                </Text>
                <Badge variant="soft" tone="accent" size="xs">
                  {categorizedClaims.timing.length}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Stack gap="3">
                {categorizedClaims.timing.map(([k, v]) => {
                  const isExpired = k === 'exp' && expiryInfo.isExpired;
                  const isExp = k === 'exp';
                  return (
                    <Card key={k}>
                      <CardBody>
                        <Inline justify="between" align="center" gap="3" wrap>
                          <Inline align="center" gap="3">
                            {isExpired ? (
                              <IconAlertCircle size="lg" />
                            ) : isExp ? (
                              <IconCheckCircle size="lg" />
                            ) : (
                              getClaimIcon(k)
                            )}
                            <Stack gap="1">
                              <Text size="sm" weight="medium">
                                {getClaimLabel(k)}
                              </Text>
                              <Text size="xs" tone="subtle">
                                {formatTime(v as number)}
                              </Text>
                            </Stack>
                          </Inline>
                          {isExp && !isExpired && (
                            <Badge variant="soft" tone="success" size="sm">
                              {expiryInfo.timeLeft} left
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge variant="soft" tone="danger" size="sm">
                              Expired
                            </Badge>
                          )}
                        </Inline>
                      </CardBody>
                    </Card>
                  );
                })}
              </Stack>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      {categorizedClaims.issuer.length > 0 && (
        <Accordion type="single" defaultValue="issuer">
          <AccordionItem value="issuer">
            <AccordionTrigger>
              <span className="inline-flex items-center gap-2">
                <IconGlobe size="sm" />
                <Text as="span" weight="medium">
                  Issuer information
                </Text>
                <Badge variant="soft" tone="accent" size="xs">
                  {categorizedClaims.issuer.length}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Stack gap="3">
                {categorizedClaims.issuer.map(([k, v]) => (
                  <ClaimCard
                    key={k}
                    label={getClaimLabel(k)}
                    value={v}
                    icon={getClaimIcon(k)}
                  />
                ))}
              </Stack>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      {categorizedClaims.custom.length > 0 && (
        <Accordion type="single">
          <AccordionItem value="custom">
            <AccordionTrigger>
              <span className="inline-flex items-center gap-2">
                <IconSettings size="sm" />
                <Text as="span" weight="medium">
                  Custom claims
                </Text>
                <Badge variant="soft" tone="accent" size="xs">
                  {categorizedClaims.custom.length}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Grid max={2} gap="3">
                {categorizedClaims.custom.map(([k, v]) => (
                  <ClaimCard
                    key={k}
                    label={getClaimLabel(k)}
                    value={v}
                    icon={getClaimIcon(k)}
                  />
                ))}
              </Grid>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      <Accordion type="single">
        <AccordionItem value="raw">
          <AccordionTrigger>
            <span className="inline-flex items-center gap-2">
              <IconBraces size="sm" />
              <Text as="span" weight="medium">
                Raw JSON
              </Text>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <Stack gap="2">
              <Inline justify="between" align="center">
                <Text size="sm" weight="medium">
                  Complete payload
                </Text>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={
                    copiedKey === 'payload' ? (
                      <IconCheckCircle size="sm" />
                    ) : (
                      <IconCopy size="sm" />
                    )
                  }
                  onClick={() =>
                    void copy(JSON.stringify(payload, null, 2), 'payload')
                  }
                >
                  {copiedKey === 'payload' ? 'Copied' : 'Copy'}
                </Button>
              </Inline>
              <Code block>{JSON.stringify(payload, null, 2)}</Code>
            </Stack>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Stack>
  );

  const renderSignatureSection = (signature: string, algorithm?: string) => (
    <Stack gap="4">
      <Alert status="info" icon={<IconInfo />}>
        <AlertTitle>About signatures</AlertTitle>
        <AlertDescription>
          The signature proves the token was issued by the key holder and not
          altered. It is only checked when you enter the key below; the key
          never leaves your browser.
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
                  variant="solid"
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

  return (
    <Stack gap="6">
      <Card>
        <CardHeader>
          <Inline justify="between" align="center" gap="2" wrap>
            <Inline gap="2" align="center">
              <IconLock size="lg" />
              <Label>JWT token</Label>
            </Inline>
            <Inline gap="2" wrap>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<IconFileJson size="sm" />}
                onClick={handleSample}
              >
                Sample
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={
                  copiedKey === 'jwt' ? (
                    <IconCheckCircle size="sm" />
                  ) : (
                    <IconCopy size="sm" />
                  )
                }
                onClick={handleCopyJwt}
              >
                {copiedKey === 'jwt' ? 'Copied' : 'Copy'}
              </Button>
            </Inline>
          </Inline>
        </CardHeader>
        <CardBody>
          <Stack gap="3">
            <Textarea
              value={jwt}
              onChange={setJwt}
              placeholder="Paste your JWT token here…"
              rows={4}
              aria-label="JWT token"
            />
            <Inline gap="2" wrap>
              <Box className="flex-1">
                <Button
                  variant="solid"
                  leftIcon={<IconRefreshCw size="sm" />}
                  onClick={() => decode(jwt)}
                  className="w-full"
                >
                  Decode token
                </Button>
              </Box>
              <Button
                variant="soft"
                leftIcon={<IconTrash2 size="sm" />}
                onClick={clear}
              >
                Clear
              </Button>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      {error && (
        <Alert status="danger">
          <AlertTitle>Decoding error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {decoded && timeStatus && (
        <Card>
          <CardBody>
            <Stack gap="4" role="group" aria-label="Token status">
              <StatusRow
                label="Decoded"
                title="Header and payload decoded"
                detail=""
                tone="neutral"
                icon={<IconFileJson size="md" />}
              />
              <StatusRow
                label="Time claims"
                {...timeText(timeStatus)}
                icon={<IconClock size="md" />}
              />
              <Inline gap="2" align="center" wrap className="pl-8">
                <Label htmlFor="jwt-clock-skew">Clock skew (seconds)</Label>
                <div className="w-24">
                  <Input
                    id="jwt-clock-skew"
                    type="number"
                    min={0}
                    max={MAX_SKEW_SEC}
                    value={String(skewSec)}
                    onChange={(v) => {
                      const n = Math.floor(Number(v));
                      setSkewSec(
                        Number.isFinite(n)
                          ? Math.min(MAX_SKEW_SEC, Math.max(0, n))
                          : 0,
                      );
                    }}
                  />
                </div>
                <Text size="xs" tone="subtle">
                  Leeway for exp, nbf and iat when clocks differ.
                </Text>
              </Inline>
              <StatusRow
                label="Signature"
                title={SIGNATURE_TEXT[sigStatus.state].title}
                detail={
                  sigStatus.state === 'error'
                    ? sigStatus.message
                    : SIGNATURE_TEXT[sigStatus.state].detail
                }
                tone={SIGNATURE_TEXT[sigStatus.state].tone}
                icon={
                  sigStatus.state === 'verified' ? (
                    <IconShieldCheck size="md" />
                  ) : sigStatus.state === 'invalid' ||
                    sigStatus.state === 'error' ? (
                    <IconShieldX size="md" />
                  ) : (
                    <IconShieldAlert size="md" />
                  )
                }
              />
            </Stack>
          </CardBody>
        </Card>
      )}

      {decoded && (
        <Card>
          <CardBody>
            <Tabs
              value={activeTab}
              onValueChange={(v) =>
                setActiveTab(v as 'header' | 'payload' | 'signature')
              }
              variant="soft"
              fullWidth
            >
              <TabsList aria-label="JWT sections">
                <TabsTrigger value="header">
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <span>Header</span>
                    <Badge variant="soft" tone="accent" size="xs">
                      {decoded.header.alg}
                    </Badge>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="payload">
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <span>Payload</span>
                    <Badge variant="soft" tone="accent" size="xs">
                      {Object.keys(decoded.payload).length}
                    </Badge>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="signature">Signature</TabsTrigger>
              </TabsList>

              <TabsContent value="header">
                <Box className="pt-4">
                  {renderHeaderSection(decoded.header)}
                </Box>
              </TabsContent>
              <TabsContent value="payload">
                <Box className="pt-4">
                  {renderPayloadSection(decoded.payload)}
                </Box>
              </TabsContent>
              <TabsContent value="signature">
                <Box className="pt-4">
                  {renderSignatureSection(
                    decoded.signature,
                    decoded.header.alg,
                  )}
                </Box>
              </TabsContent>
            </Tabs>
          </CardBody>
        </Card>
      )}

      <Inline justify="center" align="center" gap="2" wrap>
        <IconLock size="sm" />
        <Text size="sm" tone="subtle">
          All processing happens in your browser — no data is sent to any server
        </Text>
      </Inline>
    </Stack>
  );
};

export default JWTDecoder;
