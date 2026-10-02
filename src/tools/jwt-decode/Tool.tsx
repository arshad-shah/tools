import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconClock, IconColumns } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Inline,
  PrivacyNote,
  SendToMenu,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { toolsAccepting } from '@/app/registry';
import {
  copyText,
  readClipboardText,
  useClipboard,
} from '@/shared/lib/clipboard';
import { toToolError } from '@/shared/lib/errors';
import { sendTo } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { ExpiryInfo, JwtTab } from './types';
import { getExpiryInfo } from './lib/claims';
import { categorizeClaims } from './lib/categorize';
import { SAMPLE_JWT } from './lib/constants';
import { claimToEpoch, comparePayloads, payloadToJson } from './lib/handoffs';
import { useJwtDecoder } from './hooks/useJwtDecoder';
import { useSignatureVerification } from './hooks/useSignatureVerification';
import { timeClaimsStatus, tryDecodeJwt, type TimeStatus } from './lib/jwt';
import { TokenInput } from './components/TokenInput';
import { TokenStatus } from './components/TokenStatus';
import { HeaderSection } from './components/HeaderSection';
import { PayloadSection } from './components/PayloadSection';
import { SignatureSection } from './components/SignatureSection';
import { BuilderTab } from './components/BuilderTab';
import { jwtSettings } from './settings';

const DIFF_PAIR = 'application/vnd.tools.diff-pair+json';
const accepts = (toolId: string, mime: string) =>
  toolsAccepting(mime).some((t) => t.id === toolId);

const JWTDecoder: React.FC = () => {
  const navigate = useNavigate();
  const { jwt, setJwt, decoded, error } = useJwtDecoder();
  const { copiedKey, copy } = useClipboard();
  const [settings, update] = jwtSettings.useSettings();
  const skewSec = settings.skew;
  const [mode, setMode] = useState<'decode' | 'build'>('decode');
  const [activeTab, setActiveTab] = useState<JwtTab>('payload');
  const [compareOpen, setCompareOpen] = useState(false);
  const [other, setOther] = useState('');
  const otherDecoded = useMemo(() => tryDecodeJwt(other).decoded, [other]);

  // Ticks so the countdown and the time-claim status stay live.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const nowSec = Math.floor(now / 1000);

  const expiryInfo: ExpiryInfo = useMemo(
    () => getExpiryInfo(decoded?.payload.exp, now, skewSec),
    [decoded?.payload.exp, now, skewSec],
  );
  const timeStatus: TimeStatus | null = decoded
    ? timeClaimsStatus(decoded.payload, nowSec, skewSec)
    : null;

  const verify = useSignatureVerification(decoded);

  // A sample to start with, unless a hand-off or the user filled it first.
  useEffect(() => {
    const timer = setTimeout(
      () => setJwt((current) => current || SAMPLE_JWT),
      300,
    );
    return () => clearTimeout(timer);
  }, [setJwt]);

  const categorizedClaims = useMemo(
    () => categorizeClaims(decoded?.payload),
    [decoded],
  );

  const focusVerify = () => {
    setMode('decode');
    setActiveTab('signature');
    setTimeout(() => document.getElementById('jwt-verify-key')?.focus(), 0);
  };

  useToolCommands('jwt-decode', [
    {
      id: 'paste',
      label: 'Paste token',
      run: () =>
        void readClipboardText().then(
          (t) => {
            setMode('decode');
            setJwt(t);
          },
          (e) => notify.error(toToolError(e).message),
        ),
    },
    {
      id: 'copy-payload',
      label: 'Copy payload',
      enabled: !!decoded,
      run: () =>
        decoded &&
        void copyText(JSON.stringify(decoded.payload, null, 2)).then(() =>
          notify.success('Payload copied'),
        ),
    },
    {
      id: 'verify',
      label: 'Verify signature',
      shortcut: 'Mod+Shift+V',
      enabled: !!decoded && !verify.unsigned,
      run: focusVerify,
    },
  ]);

  const canCompare = accepts('text-diff-checker', DIFF_PAIR);
  const epochTarget = accepts('epoch-converter', 'text/plain');
  const decoding = mode === 'decode' && !!decoded;
  // The palette mirrors the first epoch button shown (exp, else iat).
  const epochPayload =
    decoded && epochTarget
      ? (claimToEpoch(decoded, 'exp') ?? claimToEpoch(decoded, 'iat'))
      : null;
  const comparePayloadsInDiff = () =>
    decoded &&
    otherDecoded &&
    sendTo(
      navigate,
      'text-diff-checker',
      comparePayloads(decoded, otherDecoded),
    );

  useSendCommands('jwt-decode', [
    {
      target: 'epoch-converter',
      run: () =>
        epochPayload && sendTo(navigate, 'epoch-converter', epochPayload),
      enabled: decoding && !!epochPayload,
    },
    {
      target: 'text-diff-checker',
      run: comparePayloadsInDiff,
      enabled: decoding && compareOpen && !!otherDecoded && canCompare,
    },
  ]);

  return (
    <Stack gap="4">
      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as 'decode' | 'build')}
        variant="soft"
      >
        <TabsList aria-label="Mode">
          <TabsTrigger value="decode">Decode and verify</TabsTrigger>
          <TabsTrigger value="build">Build and sign</TabsTrigger>
        </TabsList>
        <TabsContent value="build">
          <Box className="pt-4">
            <BuilderTab
              onOpen={(token) => {
                setJwt(token);
                setMode('decode');
              }}
            />
          </Box>
        </TabsContent>
        <TabsContent value="decode">
          <Stack gap="4" className="pt-4">
            <TokenInput jwt={jwt} setJwt={setJwt} />

            {error && (
              <Alert status="danger">
                <AlertTitle>Decoding error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {decoded && (
              <Inline gap="2" wrap>
                <SendToMenu
                  payload={() => payloadToJson(decoded)}
                  sourceTool="jwt-decode"
                  label="Send payload to"
                  size="sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<IconColumns size="sm" />}
                  onClick={() => setCompareOpen((o) => !o)}
                  aria-expanded={compareOpen}
                >
                  Compare with another token
                </Button>
                {epochTarget &&
                  (['exp', 'iat'] as const).map((c) => {
                    const p = claimToEpoch(decoded, c);
                    return p ? (
                      <Button
                        key={c}
                        variant="ghost"
                        size="sm"
                        leftIcon={<IconClock size="sm" />}
                        onClick={() => sendTo(navigate, 'epoch-converter', p)}
                      >
                        Open {c} in Epoch Converter
                      </Button>
                    ) : null;
                  })}
              </Inline>
            )}

            {decoded && compareOpen && (
              <Stack gap="2">
                <TokenInput
                  jwt={other}
                  setJwt={setOther}
                  label="Token to compare"
                  acceptHandoff={false}
                />
                <Inline gap="2" align="center" wrap>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!otherDecoded || !canCompare}
                    onClick={comparePayloadsInDiff}
                  >
                    Compare payloads in Text Diff
                  </Button>
                  {!canCompare && (
                    <Badge variant="soft" tone="neutral" size="sm">
                      Text Diff cannot take a pair yet
                    </Badge>
                  )}
                </Inline>
              </Stack>
            )}

            {decoded && timeStatus && (
              <TokenStatus
                timeStatus={timeStatus}
                skewSec={skewSec}
                setSkewSec={(s) => update({ skew: s })}
                sigStatus={verify.sigStatus}
                nowSec={nowSec}
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
                          copiedKey={copiedKey}
                          copy={copy}
                          {...verify}
                        />
                      </Box>
                    </TabsContent>
                  </Tabs>
                </CardBody>
              </Card>
            )}
          </Stack>
        </TabsContent>
      </Tabs>
      <PrivacyNote variant="local">
        Keys and tokens are never stored or shared.
      </PrivacyNote>
    </Stack>
  );
};

export default JWTDecoder;
