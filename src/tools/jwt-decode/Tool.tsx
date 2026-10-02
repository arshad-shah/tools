import React, { useEffect, useMemo, useState } from 'react';
import { IconLock } from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Box,
  Card,
  CardBody,
  Inline,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import { ExpiryInfo, JwtTab } from './types';
import { getExpiryInfo } from './lib/claims';
import { categorizeClaims } from './lib/categorize';
import { SAMPLE_JWT } from './lib/constants';
import { useJwtDecoder } from './hooks/useJwtDecoder';
import { useSignatureVerification } from './hooks/useSignatureVerification';
import { useClipboard } from '@/shared/lib/clipboard';
import { timeClaimsStatus, type TimeStatus } from './lib/jwt';
import { TokenInput } from './components/TokenInput';
import { TokenStatus } from './components/TokenStatus';
import { HeaderSection } from './components/HeaderSection';
import { PayloadSection } from './components/PayloadSection';
import { SignatureSection } from './components/SignatureSection';

const JWTDecoder: React.FC = () => {
  const { jwt, setJwt, decoded, error, clear } = useJwtDecoder();
  // Keyed so only the button pressed shows "Copied" (B10).
  const { copiedKey, copy } = useClipboard();
  const [activeTab, setActiveTab] = useState<JwtTab>('payload');

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

  const {
    unsigned,
    hmacAlg,
    keyText,
    setKeyText,
    keyKind,
    setKeyKind,
    secretEncoding,
    setSecretEncoding,
    sigStatus,
    handleVerify,
  } = useSignatureVerification(decoded);

  useEffect(() => {
    const timer = setTimeout(() => setJwt(SAMPLE_JWT), 300);
    return () => clearTimeout(timer);
  }, [setJwt]);

  const handleSample = () => setJwt(SAMPLE_JWT);
  const handleCopyJwt = () => void copy(jwt, 'jwt');

  const categorizedClaims = useMemo(
    () => categorizeClaims(decoded?.payload),
    [decoded],
  );

  return (
    <Stack gap="6">
      <TokenInput
        jwt={jwt}
        setJwt={setJwt}
        clear={clear}
        handleSample={handleSample}
        handleCopyJwt={handleCopyJwt}
        copiedKey={copiedKey}
      />

      {error && (
        <Alert status="danger">
          <AlertTitle>Decoding error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {decoded && timeStatus && (
        <TokenStatus
          timeStatus={timeStatus}
          skewSec={skewSec}
          setSkewSec={setSkewSec}
          sigStatus={sigStatus}
        />
      )}

      {decoded && (
        <Card>
          <CardBody>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as JwtTab)}
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
                  <HeaderSection
                    header={decoded.header}
                    copiedKey={copiedKey}
                    copy={copy}
                  />
                </Box>
              </TabsContent>
              <TabsContent value="payload">
                <Box className="pt-4">
                  <PayloadSection
                    payload={decoded.payload}
                    categorizedClaims={categorizedClaims}
                    expiryInfo={expiryInfo}
                    copiedKey={copiedKey}
                    copy={copy}
                  />
                </Box>
              </TabsContent>
              <TabsContent value="signature">
                <Box className="pt-4">
                  <SignatureSection
                    signature={decoded.signature}
                    algorithm={decoded.header.alg}
                    jwt={jwt}
                    unsigned={unsigned}
                    hmacAlg={hmacAlg}
                    keyKind={keyKind}
                    setKeyKind={setKeyKind}
                    secretEncoding={secretEncoding}
                    setSecretEncoding={setSecretEncoding}
                    keyText={keyText}
                    setKeyText={setKeyText}
                    sigStatus={sigStatus}
                    handleVerify={handleVerify}
                    copiedKey={copiedKey}
                    copy={copy}
                  />
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
