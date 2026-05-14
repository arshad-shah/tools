import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Braces,
  Brackets,
  CheckCircle,
  Clock,
  Copy,
  FileJson,
  Globe,
  Info,
  Key,
  Lock,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Code,
  Grid,
  Inline,
  Label,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from '@arshad-shah/cynosure-react';
import { ExpiryInfo, JWTHeader, JWTPayload } from '../../types/JwtTypes';
import { formatTime, getClaimIcon, getClaimLabel, getExpiryInfo } from './utils/utils';
import useJWTDecoder from './hooks/useJWTDecoder';
import useClipboard from '../../hooks/useClipboard';

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InNhbXBsZS1rZXkifQ.eyJzdWIiOiJ1c2VyLTEyMzQ1IiwibmFtZSI6IkphbmUgRG9lIiwiZW1haWwiOiJqYW5lQGV4YW1wbGUuY29tIiwiaWF0IjoxNzI2MjM5MDIyLCJleHAiOjE3NTc3NzUwMjIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6WyJhcGkuZXhhbXBsZS5jb20iLCJ3ZWIuZXhhbXBsZS5jb20iXSwicm9sZXMiOlsidXNlciIsIm1vZGVyYXRvciJdLCJwZXJtaXNzaW9ucyI6WyJyZWFkOnBvc3RzIiwid3JpdGU6cG9zdHMiLCJtb2RlcmF0ZTpjb21tZW50cyJdLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwiZ3JvdXBzIjpbImRldmVsb3BlcnMiLCJiZXRhLXVzZXJzIl0sImN1c3RvbV9jbGFpbSI6eyJkZXBhcnRtZW50IjoiZW5naW5lZXJpbmciLCJ0ZWFtX2lkIjo0Mn19.K8Xz9n4rQ6vKm3LpBtY8jE2dR7fN9sA1qW5cT3uI0Mn';

const IDENTITY_KEYS = ['sub', 'name', 'email', 'preferred_username', 'given_name', 'family_name'];
const ACCESS_KEYS = ['role', 'roles', 'permissions', 'scope', 'groups', 'authorities'];
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
    return <Text size="sm" variant="caption" italic>null</Text>;
  }
  if (typeof data === 'string') {
    return <Code size="sm" colorScheme="success">&quot;{data}&quot;</Code>;
  }
  if (typeof data === 'number') {
    return <Code size="sm" colorScheme="accent">{data}</Code>;
  }
  if (typeof data === 'boolean') {
    return <Code size="sm" colorScheme="accent">{data ? 'true' : 'false'}</Code>;
  }
  if (Array.isArray(data)) {
    if (depth >= maxDepth) {
      return (
        <Inline gap="1" align="center">
          <Brackets size={12} aria-hidden />
          <Text size="sm" variant="caption">Array[{data.length}]</Text>
        </Inline>
      );
    }
    return (
      <Stack gap="1">
        <Inline gap="1" align="center">
          <Brackets size={14} aria-hidden />
          <Text size="sm" weight="medium">Array ({data.length} items)</Text>
        </Inline>
        <Stack gap="1" paddingLeft="4">
          {data.map((item, i) => (
            <Inline key={i} align="start" gap="2">
              <Text size="sm" variant="caption">{i}:</Text>
              <ValueRenderer data={item} depth={depth + 1} maxDepth={maxDepth} />
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
          <Braces size={12} aria-hidden />
          <Text size="sm" variant="caption">Object[{entries.length} keys]</Text>
        </Inline>
      );
    }
    return (
      <Stack gap="1">
        <Inline gap="1" align="center">
          <Braces size={14} aria-hidden />
          <Text size="sm" weight="medium">Object ({entries.length} properties)</Text>
        </Inline>
        <Stack gap="1" paddingLeft="4">
          {entries.map(([key, value]) => (
            <Inline key={key} align="start" gap="2">
              <Code size="sm" colorScheme="accent">&quot;{key}&quot;:</Code>
              <ValueRenderer data={value} depth={depth + 1} maxDepth={maxDepth} />
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
  <Card variant={colorScheme === 'neutral' ? 'outlined' : 'filled'} size="sm">
    <CardBody>
      <Inline align="start" gap="3">
        <Box>{icon}</Box>
        <Stack gap="1" flex="1" minWidth="0">
          <Inline gap="2" align="center">
            <Badge variant="soft" colorScheme={colorScheme} size="xs">
              {label}
            </Badge>
          </Inline>
          <ValueRenderer data={value} />
        </Stack>
      </Inline>
    </CardBody>
  </Card>
);

import { Box } from '@arshad-shah/cynosure-react';

const JWTDecoder: React.FC = () => {
  const { jwt, setJwt, decoded, error, decode, clear } = useJWTDecoder();
  const { copied, copy } = useClipboard();
  const [activeTab, setActiveTab] = useState<'header' | 'payload' | 'signature'>(
    'payload',
  );

  const expiryInfo: ExpiryInfo = useMemo(
    () => getExpiryInfo(decoded?.payload.exp),
    [decoded?.payload.exp],
  );

  useEffect(() => {
    const timer = setTimeout(() => setJwt(SAMPLE_JWT), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSample = () => setJwt(SAMPLE_JWT);
  const handleCopyJwt = () => copy(jwt);

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
          ![...IDENTITY_KEYS, ...ACCESS_KEYS, ...TIMING_KEYS, ...ISSUER_KEYS].includes(k),
      ),
    };
  }, [decoded]);

  const renderHeaderSection = (header: JWTHeader) => (
    <Stack gap="4">
      <Grid columns={{ base: 1, md: 2 }} gap="3">
        {header.alg && (
          <ClaimCard
            label="Algorithm"
            value={header.alg}
            icon={<Shield size={16} aria-hidden />}
            colorScheme="warning"
          />
        )}
        {header.typ && (
          <ClaimCard
            label="Type"
            value={header.typ}
            icon={<FileJson size={16} aria-hidden />}
          />
        )}
        {header.kid && (
          <ClaimCard
            label="Key ID"
            value={header.kid}
            icon={<Key size={16} aria-hidden />}
          />
        )}
      </Grid>
      {Object.keys(header).filter((k) => !['alg', 'typ', 'kid'].includes(k)).length > 0 && (
        <Accordion type="single" collapsible variant="contained" size="md">
          <AccordionItem value="extra">
            <AccordionTrigger>
              <Inline gap="2" align="center">
                <Settings size={16} aria-hidden />
                <Text weight="medium">Additional header claims</Text>
              </Inline>
            </AccordionTrigger>
            <AccordionContent>
              <Grid columns={{ base: 1, md: 2 }} gap="3">
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
      <Accordion type="single" collapsible variant="contained" size="md">
        <AccordionItem value="raw">
          <AccordionTrigger>
            <Inline gap="2" align="center">
              <Braces size={16} aria-hidden />
              <Text weight="medium">Raw JSON</Text>
            </Inline>
          </AccordionTrigger>
          <AccordionContent>
            <Stack gap="2">
              <Inline justify="between" align="center">
                <Text size="sm" weight="medium">Complete header</Text>
                <Button
                  variant="ghost"
                  colorScheme="neutral"
                  size="sm"
                  leftIcon={copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  onClick={() => copy(JSON.stringify(header, null, 2))}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </Inline>
              <Code variant="block" size="sm">
                {JSON.stringify(header, null, 2)}
              </Code>
            </Stack>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Stack>
  );

  const renderPayloadSection = (payload: JWTPayload) => (
    <Stack gap="4">
      {categorizedClaims.identity.length > 0 && (
        <Accordion type="single" collapsible defaultValue="identity" variant="contained" size="md">
          <AccordionItem value="identity">
            <AccordionTrigger>
              <Inline gap="2" align="center">
                <User size={16} aria-hidden />
                <Text weight="medium">Identity claims</Text>
                <Badge variant="soft" colorScheme="accent" size="xs">
                  {categorizedClaims.identity.length}
                </Badge>
              </Inline>
            </AccordionTrigger>
            <AccordionContent>
              <Grid columns={{ base: 1, md: 2 }} gap="3">
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
        <Accordion type="single" collapsible defaultValue="access" variant="contained" size="md">
          <AccordionItem value="access">
            <AccordionTrigger>
              <Inline gap="2" align="center">
                <Shield size={16} aria-hidden />
                <Text weight="medium">Access &amp; permissions</Text>
                <Badge variant="soft" colorScheme="warning" size="xs">
                  {categorizedClaims.access.length}
                </Badge>
              </Inline>
            </AccordionTrigger>
            <AccordionContent>
              <Grid columns={{ base: 1, md: 2 }} gap="3">
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
        <Accordion type="single" collapsible defaultValue="timing" variant="contained" size="md">
          <AccordionItem value="timing">
            <AccordionTrigger>
              <Inline gap="2" align="center">
                <Clock size={16} aria-hidden />
                <Text weight="medium">Timestamps</Text>
                <Badge variant="soft" colorScheme="accent" size="xs">
                  {categorizedClaims.timing.length}
                </Badge>
              </Inline>
            </AccordionTrigger>
            <AccordionContent>
              <Stack gap="3">
                {categorizedClaims.timing.map(([k, v]) => {
                  const isExpired = k === 'exp' && expiryInfo.isExpired;
                  const isExp = k === 'exp';
                  return (
                    <Card
                      key={k}
                      variant="filled"
                      size="sm"
                    >
                      <CardBody>
                        <Inline justify="between" align="center" gap="3" wrap>
                          <Inline align="center" gap="3">
                            {isExpired ? (
                              <AlertCircle size={20} aria-hidden />
                            ) : isExp ? (
                              <CheckCircle size={20} aria-hidden />
                            ) : (
                              getClaimIcon(k)
                            )}
                            <Stack gap="1">
                              <Text size="sm" weight="medium">
                                {getClaimLabel(k)}
                              </Text>
                              <Text size="xs" variant="caption">
                                {formatTime(v as number)}
                              </Text>
                            </Stack>
                          </Inline>
                          {isExp && !isExpired && (
                            <Badge variant="soft" colorScheme="success" size="sm">
                              {expiryInfo.timeLeft} left
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge variant="soft" colorScheme="danger" size="sm">
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
        <Accordion type="single" collapsible defaultValue="issuer" variant="contained" size="md">
          <AccordionItem value="issuer">
            <AccordionTrigger>
              <Inline gap="2" align="center">
                <Globe size={16} aria-hidden />
                <Text weight="medium">Issuer information</Text>
                <Badge variant="soft" colorScheme="accent" size="xs">
                  {categorizedClaims.issuer.length}
                </Badge>
              </Inline>
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
        <Accordion type="single" collapsible variant="contained" size="md">
          <AccordionItem value="custom">
            <AccordionTrigger>
              <Inline gap="2" align="center">
                <Settings size={16} aria-hidden />
                <Text weight="medium">Custom claims</Text>
                <Badge variant="soft" colorScheme="accent" size="xs">
                  {categorizedClaims.custom.length}
                </Badge>
              </Inline>
            </AccordionTrigger>
            <AccordionContent>
              <Grid columns={{ base: 1, md: 2 }} gap="3">
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
      <Accordion type="single" collapsible variant="contained" size="md">
        <AccordionItem value="raw">
          <AccordionTrigger>
            <Inline gap="2" align="center">
              <Braces size={16} aria-hidden />
              <Text weight="medium">Raw JSON</Text>
            </Inline>
          </AccordionTrigger>
          <AccordionContent>
            <Stack gap="2">
              <Inline justify="between" align="center">
                <Text size="sm" weight="medium">Complete payload</Text>
                <Button
                  variant="ghost"
                  colorScheme="neutral"
                  size="sm"
                  leftIcon={copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  onClick={() => copy(JSON.stringify(payload, null, 2))}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </Inline>
              <Code variant="block" size="sm">
                {JSON.stringify(payload, null, 2)}
              </Code>
            </Stack>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Stack>
  );

  const renderSignatureSection = (signature: string, algorithm?: string) => (
    <Stack gap="4">
      <Alert status="info" variant="soft" icon={<Info aria-hidden />}>
        <AlertTitle>About signatures</AlertTitle>
        <AlertDescription>
          The signature verifies that the token hasn&apos;t been tampered with
          and confirms the sender&apos;s identity using cryptographic
          algorithms.
        </AlertDescription>
      </Alert>
      {algorithm && (
        <ClaimCard
          label="Signing algorithm"
          value={`${algorithm} - ${
            algorithm.includes('HS')
              ? 'HMAC (symmetric)'
              : algorithm.includes('RS')
                ? 'RSA (asymmetric)'
                : algorithm.includes('ES')
                  ? 'ECDSA (elliptic curve)'
                  : 'Other algorithm'
          }`}
          icon={<Lock size={16} aria-hidden />}
          colorScheme="warning"
        />
      )}
      <Accordion type="single" collapsible variant="contained" size="md">
        <AccordionItem value="signature-value">
          <AccordionTrigger>
            <Inline gap="2" align="center">
              <Key size={16} aria-hidden />
              <Text weight="medium">Signature value</Text>
            </Inline>
          </AccordionTrigger>
          <AccordionContent>
            <Stack gap="2">
              <Inline justify="between" align="center">
                <Text size="sm" weight="medium">Base64-encoded signature</Text>
                <Button
                  variant="ghost"
                  colorScheme="neutral"
                  size="sm"
                  leftIcon={copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  onClick={() => copy(signature)}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </Inline>
              <Code variant="block" size="sm">{signature}</Code>
            </Stack>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Stack>
  );

  return (
    <Stack gap="6">
      <Card variant="elevated" size="md">
        <CardHeader>
          <Inline justify="between" align="center" gap="2" wrap>
            <Inline gap="2" align="center">
              <Lock size={20} aria-hidden />
              <Label>JWT token</Label>
            </Inline>
            <Inline gap="2" wrap>
              <Button
                variant="ghost"
                colorScheme="neutral"
                size="sm"
                leftIcon={<FileJson size={14} />}
                onClick={handleSample}
              >
                Sample
              </Button>
              <Button
                variant="ghost"
                colorScheme="neutral"
                size="sm"
                leftIcon={copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                onClick={handleCopyJwt}
              >
                {copied ? 'Copied' : 'Copy'}
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
              <Box flex="1">
                <Button
                  variant="solid"
                  colorScheme="accent"
                  leftIcon={<RefreshCw size={16} />}
                  onClick={() => decode(jwt)}
                  fullWidth
                >
                  Decode token
                </Button>
              </Box>
              <Button
                variant="soft"
                colorScheme="neutral"
                leftIcon={<Trash2 size={16} />}
                onClick={clear}
              >
                Clear
              </Button>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      {error && (
        <Alert status="danger" variant="soft">
          <AlertTitle>Decoding error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {decoded && decoded.payload.exp && (
        <Alert
          status={expiryInfo.isExpired ? 'danger' : 'success'}
          variant="soft"
          icon={
            expiryInfo.isExpired ? (
              <AlertCircle aria-hidden />
            ) : (
              <CheckCircle aria-hidden />
            )
          }
        >
          <AlertTitle>
            {expiryInfo.isExpired ? 'Token expired' : 'Token valid'}
          </AlertTitle>
          <AlertDescription>
            <Inline justify="between" align="center" wrap gap="2">
              <Text size="sm">
                {expiryInfo.isExpired
                  ? `Expired on ${expiryInfo.expiryDate?.toLocaleString()}`
                  : formatTime(decoded.payload.exp)}
              </Text>
              {!expiryInfo.isExpired && (
                <Badge variant="soft" colorScheme="success" size="sm">
                  Expires in {expiryInfo.timeLeft}
                </Badge>
              )}
            </Inline>
          </AlertDescription>
        </Alert>
      )}

      {decoded && (
        <Card variant="elevated" size="md">
          <CardBody>
            <Tabs
              value={activeTab}
              onValueChange={(v) =>
                setActiveTab(v as 'header' | 'payload' | 'signature')
              }
              variant="soft"
              colorScheme="accent"
              fullWidth
            >
              <TabsList aria-label="JWT sections">
                <TabsTrigger value="header">
                  <Inline gap="2" align="center" wrap={false}>
                    <span>Header</span>
                    <Badge variant="soft" colorScheme="accent" size="xs">
                      {decoded.header.alg}
                    </Badge>
                  </Inline>
                </TabsTrigger>
                <TabsTrigger value="payload">
                  <Inline gap="2" align="center" wrap={false}>
                    <span>Payload</span>
                    <Badge variant="soft" colorScheme="accent" size="xs">
                      {Object.keys(decoded.payload).length}
                    </Badge>
                  </Inline>
                </TabsTrigger>
                <TabsTrigger value="signature">Signature</TabsTrigger>
              </TabsList>

              <TabsContent value="header">
                <Box paddingTop="4">{renderHeaderSection(decoded.header)}</Box>
              </TabsContent>
              <TabsContent value="payload">
                <Box paddingTop="4">{renderPayloadSection(decoded.payload)}</Box>
              </TabsContent>
              <TabsContent value="signature">
                <Box paddingTop="4">
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
        <Lock size={14} aria-hidden />
        <Text size="sm" variant="caption">
          All processing happens in your browser — no data is sent to any server
        </Text>
        <ArrowRight size={14} aria-hidden style={{ display: 'none' }} />
      </Inline>
    </Stack>
  );
};

export default JWTDecoder;
