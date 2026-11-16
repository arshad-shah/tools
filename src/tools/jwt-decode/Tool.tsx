import {
  Button,
  Card,
  Disclosure,
  EmptyState,
  IconButton,
  Inline,
  Menu,
  SegmentedControl,
  SplitPane,
  Stack,
  TextArea,
  useToast,
} from '@arshad-shah/cynosure';
import {
  clipboardPaste,
  close,
  fileKey,
  send,
  sparkles,
} from '@arshad-shah/cynosure/icons';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toolsAccepting } from '@/app/registry';
import { readClipboardText } from '@/shared/lib/clipboard';
import { toToolError } from '@/shared/lib/errors';
import { sendTo, useHandoff } from '@/shared/lib/handoff';
import { useMediaQuery } from '@/shared/lib/media-query';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { ToolActionsSlot } from '@/shared/ui/tool-actions-slot';
import { BuilderView } from './components/BuilderView';
import { DecodedCard } from './components/DecodedCard';
import { useJwtDecoder } from './hooks/useJwtDecoder';
import { useSignatureVerification } from './hooks/useSignatureVerification';
import { categorizeClaims } from './lib/categorize';
import { SAMPLE_JWT } from './lib/constants';
import {
  claimToEpoch,
  comparePayloads,
  isTokenHandoff,
  payloadToJson,
} from './lib/handoffs';
import { isExpired, timeClaimsStatus, tryDecodeJwt } from './lib/jwt';
import { jwtSettings } from './settings';
import type { JwtTab } from './types';

type Mode = 'decode' | 'build';

/** "Send payload to": the tools that take JSON, in the page header. */
function SendPayloadMenu({ onSend }: { onSend(toolId: string): void }) {
  const slot = useContext(ToolActionsSlot);
  const targets = toolsAccepting('application/json').filter(
    (t) => t.id !== 'jwt-decode',
  );
  if (!targets.length) return null;
  const menu = (
    <Menu
      label="Send payload to"
      items={targets.map((t) => ({ value: t.id, label: t.name }))}
      onSelect={onSend}
      trigger={(props) => (
        <Button {...props} variant="soft" icon={send}>
          Send payload to
        </Button>
      )}
    />
  );
  return slot ? createPortal(menu, slot) : menu;
}

/**
 * JWT Decoder (redesign spec, transform tool pattern): decode or build, the
 * token beside what it says on wide screens, one above the other on narrow
 * ones. Keys and tokens are never stored or shared.
 */
export default function JWTDecoder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const wide = useMediaQuery('(min-width: 1200px)');
  const { jwt, setJwt, decoded, error } = useJwtDecoder();
  // A token handed over (Send to) fills the input.
  const handedOff = useHandoff(isTokenHandoff);
  const [taken, setTaken] = useState<typeof handedOff>(null);
  if (handedOff !== taken) {
    setTaken(handedOff);
    if (handedOff?.kind === 'text') setJwt(handedOff.text);
  }
  const [settings, update] = jwtSettings.useSettings();
  const skewSec = settings.skew;
  const [mode, setMode] = useState<Mode>('decode');
  const [tab, setTab] = useState<JwtTab>('payload');
  const [other, setOther] = useState('');
  const otherDecoded = useMemo(() => tryDecodeJwt(other).decoded, [other]);

  // Ticks so the countdown and the time-claim status stay live.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const nowSec = Math.floor(now / 1000);
  const verify = useSignatureVerification(decoded);
  const claims = useMemo(() => categorizeClaims(decoded?.payload), [decoded]);

  const paste = () =>
    void readClipboardText().then(
      (t) => {
        setMode('decode');
        setJwt(t);
      },
      (e) => toast({ title: toToolError(e).message, tone: 'danger' }),
    );

  useToolCommands('jwt-decode', [
    { id: 'paste', label: 'Paste token', run: paste },
    {
      id: 'copy-payload',
      label: 'Copy payload',
      enabled: !!decoded,
      run: () =>
        decoded &&
        void navigator.clipboard
          ?.writeText(JSON.stringify(decoded.payload, null, 2))
          .then(
            () => toast({ title: 'Payload copied', tone: 'success' }),
            () =>
              toast({ title: 'Could not copy the payload', tone: 'danger' }),
          ),
    },
    {
      id: 'verify',
      label: 'Verify signature',
      shortcut: 'Mod+Shift+V',
      enabled: !!decoded && !verify.unsigned,
      run: () => {
        setMode('decode');
        setTab('signature');
        setTimeout(() => document.getElementById('jwt-verify-key')?.focus(), 0);
      },
    },
  ]);

  const decoding = mode === 'decode' && !!decoded;
  const epochPayload = decoded
    ? (claimToEpoch(decoded, 'exp') ?? claimToEpoch(decoded, 'iat'))
    : null;
  const compareInDiff = () =>
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
      run: compareInDiff,
      enabled: decoding && !!otherDecoded,
    },
  ]);

  const layout = (start: React.ReactNode, end: React.ReactNode) =>
    wide ? (
      <SplitPane
        label="Resize the input and output"
        defaultSize={42}
        min={30}
        max={70}
        start={<Stack paddingInline="3">{start}</Stack>}
        end={<Stack paddingInline="3">{end}</Stack>}
      />
    ) : (
      <Stack gap="6">
        {start}
        {end}
      </Stack>
    );

  const tryExample = () => {
    setMode('decode');
    setJwt(SAMPLE_JWT);
  };

  const input = (
    <Card as="section" title="Token">
      <Stack gap="5">
        <TextArea
          label="JWT token"
          labelHidden
          rows={6}
          maxRows={14}
          spellCheck={false}
          placeholder="Paste a JWT. A Bearer prefix, quotes and spaces are removed."
          value={jwt}
          onChange={setJwt}
          error={error ?? undefined}
        />
        <Inline gap="2" wrap>
          <Button
            size="sm"
            variant="soft"
            icon={clipboardPaste}
            onClick={paste}
          >
            Paste
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={sparkles}
            onClick={tryExample}
          >
            Try an example
          </Button>
          {jwt ? (
            <IconButton
              size="sm"
              variant="ghost"
              tone="neutral"
              icon={close}
              label="Clear the token"
              onClick={() => setJwt('')}
            />
          ) : null}
        </Inline>
        {decoded ? (
          <Disclosure summary="Compare with another token" variant="line">
            <Stack gap="4">
              <TextArea
                label="Token to compare"
                rows={4}
                spellCheck={false}
                value={other}
                onChange={setOther}
              />
              <Button
                variant="soft"
                disabled={!otherDecoded}
                onClick={compareInDiff}
              >
                Compare payloads in Text Diff
              </Button>
            </Stack>
          </Disclosure>
        ) : null}
      </Stack>
    </Card>
  );

  const output = decoded ? (
    <DecodedCard
      decoded={decoded}
      jwt={jwt}
      claims={claims}
      timeStatus={timeClaimsStatus(decoded.payload, nowSec, skewSec)}
      nowSec={nowSec}
      expired={
        typeof decoded.payload.exp === 'number' &&
        isExpired(decoded.payload.exp, nowSec, skewSec)
      }
      skewSec={skewSec}
      onSkew={(s) => update({ skew: s })}
      tab={tab}
      onTab={setTab}
      verify={verify}
      onEpoch={(p) => sendTo(navigate, 'epoch-converter', p)}
    />
  ) : (
    <Card as="section" title="Decoded token">
      <EmptyState
        icon={fileKey}
        title={error ? 'Nothing to decode' : 'No token yet'}
        description={
          error
            ? 'Fix the token on the left: what is wrong is shown under it.'
            : 'Paste a JWT to see its header, claims, expiry and signature.'
        }
        actions={
          <Button variant="soft" icon={sparkles} onClick={tryExample}>
            Try an example
          </Button>
        }
      />
    </Card>
  );

  return (
    <Stack gap="6">
      {decoded ? (
        <SendPayloadMenu
          onSend={(id) => sendTo(navigate, id, payloadToJson(decoded))}
        />
      ) : null}
      <Inline>
        <SegmentedControl
          label="Mode"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: 'decode', label: 'Decode and verify' },
            { value: 'build', label: 'Build and sign' },
          ]}
        />
      </Inline>
      {mode === 'decode' ? (
        layout(input, output)
      ) : (
        <BuilderView
          layout={layout}
          onOpen={(token) => {
            setJwt(token);
            setMode('decode');
          }}
        />
      )}
    </Stack>
  );
}
