import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  PaneTabs,
  PrivacyNote,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  usePaneTab,
} from '@/shared/ui';
import { readClipboardText, useClipboard } from '@/shared/lib/clipboard';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { sendTo, useHandoff } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { ExpiryInfo, JwtTab } from './types';
import { getExpiryInfo } from './lib/claims';
import { categorizeClaims } from './lib/categorize';
import { SAMPLE_JWT } from './lib/constants';
import { claimToEpoch, comparePayloads, isTokenHandoff } from './lib/handoffs';
import { useJwtDecoder } from './hooks/useJwtDecoder';
import { useSignatureVerification } from './hooks/useSignatureVerification';
import { timeClaimsStatus, tryDecodeJwt, type TimeStatus } from './lib/jwt';
import { DecodeActions } from './components/DecodeActions';
import { TokenInput } from './components/TokenInput';
import { TokenStatus } from './components/TokenStatus';
import { HeaderSection } from './components/HeaderSection';
import { PayloadSection } from './components/PayloadSection';
import { SignatureSection } from './components/SignatureSection';
import { BuilderTab } from './components/BuilderTab';
import { jwtSettings } from './settings';

const JWTDecoder: React.FC = () => {
  const navigate = useNavigate();
  const { jwt, setJwt, decoded, error } = useJwtDecoder();
  const { copy } = useClipboard();
  // R41: token and decoded view are tabs; the decoded sample is shown first.
  const pane = usePaneTab('jwt-decode', 'output');
  // A token handed over (Send to) fills the input and shows the result.
  const handedOff = useHandoff(isTokenHandoff);
  const { show } = pane;
  const [taken, setTaken] = useState<typeof handedOff>(null);
  if (handedOff !== taken) {
    setTaken(handedOff);
    if (handedOff?.kind === 'text') setJwt(handedOff.text);
  }
  useEffect(() => {
    if (handedOff) show('output');
  }, [handedOff, show]);
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
    show('output');
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
            show('output');
          },
          (e) => notify.error(toToolError(e).message),
        ),
    },
    {
      id: 'copy-payload',
      label: 'Copy payload',
      enabled: !!decoded,
      // useClipboard toasts a failure; success says so here.
      run: () =>
        decoded &&
        void copy(JSON.stringify(decoded.payload, null, 2)).then(
          (ok) => ok && notify.success('Payload copied'),
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

  const decoding = mode === 'decode' && !!decoded;
  // The palette mirrors the first epoch button shown (exp, else iat).
  const epochPayload = decoded
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
      enabled: decoding && compareOpen && !!otherDecoded,
    },
  ]);

  const output = error ? (
    <ErrorState
      error={new ToolError('INVALID_INPUT', error)}
      title="Decoding error"
    />
  ) : !decoded ? (
    <EmptyState
      size="sm"
      title="No token yet"
      description="Paste a JWT in the Input tab to decode it."
    />
  ) : (
    <Stack gap="4">
      <DecodeActions
        decoded={decoded}
        compareOpen={compareOpen}
        onCompareOpen={setCompareOpen}
        other={other}
        onOther={setOther}
        canCompare={!!otherDecoded}
        onCompare={comparePayloadsInDiff}
        onEpoch={(p) => sendTo(navigate, 'epoch-converter', p)}
      />
      {timeStatus && (
        <TokenStatus
          timeStatus={timeStatus}
          skewSec={skewSec}
          setSkewSec={(s) => update({ skew: s })}
          sigStatus={verify.sigStatus}
          nowSec={nowSec}
        />
      )}
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
                <HeaderSection header={decoded.header} />
              </Box>
            </TabsContent>
            <TabsContent value="payload">
              <Box className="pt-4">
                <PayloadSection
                  payload={decoded.payload}
                  categorizedClaims={categorizedClaims}
                  expiryInfo={expiryInfo}
                />
              </Box>
            </TabsContent>
            <TabsContent value="signature">
              <Box className="pt-4">
                <SignatureSection
                  signature={decoded.signature}
                  algorithm={decoded.header.alg}
                  jwt={jwt}
                  {...verify}
                />
              </Box>
            </TabsContent>
          </Tabs>
        </CardBody>
      </Card>
    </Stack>
  );

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
                show('output');
              }}
            />
          </Box>
        </TabsContent>
        <TabsContent value="decode">
          <Box className="pt-4">
            <PaneTabs
              id="jwt-decode"
              label="Token panes"
              value={pane.value}
              onValueChange={pane.show}
              panes={[
                {
                  id: 'input',
                  label: 'Input',
                  content: (
                    <TokenInput
                      jwt={jwt}
                      setJwt={setJwt}
                      acceptHandoff={false}
                    />
                  ),
                },
                {
                  id: 'output',
                  label: 'Output',
                  content: output,
                  changeKey: error ?? jwt,
                },
              ]}
            />
          </Box>
        </TabsContent>
      </Tabs>
      <PrivacyNote variant="local">
        Keys and tokens are never stored or shared.
      </PrivacyNote>
    </Stack>
  );
};

export default JWTDecoder;
