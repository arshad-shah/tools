import React, { useState } from 'react';
import { IconLock, IconUnlock } from '@/shared/ui/icons';
import {
  Button,
  CardBody,
  Card,
  ErrorState,
  Inline,
  LoadingState,
  PaneTabs,
  SegmentedControl,
  Stack,
  TextInputPanel,
  usePaneTab,
} from '@/shared/ui';
import { armor, dearmor } from '@/shared/lib/crypto/aead';
import { utf8Decode, utf8Encode } from '@/shared/lib/encoding';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import type { HandoffPayload } from '@/shared/lib/handoff';
import type { useCryptoJob } from '../hooks/useCryptoJob';
import { KDF_PARAMS, type KdfChoice } from '../settings';
import { PassphraseFields } from './PassphraseFields';

type Direction = 'encrypt' | 'decrypt';

const acceptsText = (p: HandoffPayload) =>
  p.kind === 'text' && p.mime === 'text/plain';

interface TextModeProps {
  jobs: ReturnType<typeof useCryptoJob>;
  kdf: KdfChoice;
  passphrase: string;
  onPassphrase(v: string): void;
  onGenerate(): void;
}

/** Text in, an armoured message out (and back). */
export const TextMode: React.FC<TextModeProps> = ({
  jobs,
  kdf,
  passphrase,
  onPassphrase,
  onGenerate,
}) => {
  const [direction, setDirection] = useState<Direction>('encrypt');
  const [input, setInput] = useState('');
  const [confirm, setConfirm] = useState('');
  const [result, setResult] = useState<{ text?: string; error?: ToolError }>(
    {},
  );
  const tab = usePaneTab('text-encrypt', 'input');
  const job = direction === 'encrypt' ? jobs.sealJob : jobs.openJob;
  const encrypting = direction === 'encrypt';
  const mismatch = encrypting && confirm !== passphrase;
  const canRun =
    input !== '' && passphrase !== '' && !mismatch && job.status !== 'running';

  // An explicit run shows the Output pane: the result or why it failed.
  const run = async () => {
    setResult({});
    tab.show('output');
    if (encrypting) {
      const out = await jobs.sealJob.run(
        utf8Encode(input),
        passphrase,
        KDF_PARAMS[kdf],
      );
      if (out) setResult({ text: armor(out) });
      return;
    }
    let sealed: Uint8Array;
    try {
      sealed = dearmor(input);
    } catch (e) {
      setResult({ error: toToolError(e) });
      return;
    }
    const out = await jobs.openJob.run(sealed, passphrase);
    if (out) {
      try {
        setResult({ text: utf8Decode(out) });
      } catch (e) {
        setResult({ error: toToolError(e, 'The decrypted data is not text') });
      }
    }
  };

  const error =
    result.error ?? (job.status === 'error' ? job.error : undefined);

  return (
    <Stack gap="4">
      <PaneTabs
        id="text-encrypt"
        label="Message panes"
        value={tab.value}
        onValueChange={tab.show}
        actions={
          <SegmentedControl<Direction>
            label="Direction"
            size="sm"
            value={direction}
            onChange={(d) => {
              setDirection(d);
              setResult({});
              job.reset();
            }}
            options={[
              { value: 'encrypt', label: 'Encrypt' },
              { value: 'decrypt', label: 'Decrypt' },
            ]}
          />
        }
        panes={[
          {
            id: 'input',
            label: 'Input',
            content: (
              <TextInputPanel
                label={encrypting ? 'Message' : 'Encrypted message'}
                value={input}
                onChange={(v) => {
                  setInput(v);
                  setResult({});
                }}
                language="plain"
                wrap
                handoff={acceptsText}
                placeholder={
                  encrypting
                    ? 'The text to encrypt'
                    : '-----BEGIN TOOLS ENCRYPTED MESSAGE----- ...'
                }
                minHeight={120}
              />
            ),
          },
          {
            id: 'output',
            label: 'Output',
            changeKey: result.text ?? error,
            content: (
              <Stack gap="3">
                {error && (
                  <ErrorState
                    title={
                      encrypting ? 'Could not encrypt' : 'Could not decrypt'
                    }
                    error={error}
                  />
                )}
                <TextInputPanel
                  label={encrypting ? 'Encrypted message' : 'Decrypted message'}
                  value={result.text ?? ''}
                  onChange={() => {}}
                  language="plain"
                  readOnly
                  wrap
                  downloadName={encrypting ? 'message.txt.asc' : 'message.txt'}
                  minHeight={120}
                />
              </Stack>
            ),
          },
        ]}
      />
      <Card>
        <CardBody>
          <Stack gap="3">
            <PassphraseFields
              value={passphrase}
              onChange={onPassphrase}
              confirm={
                encrypting
                  ? { value: confirm, onChange: setConfirm }
                  : undefined
              }
              onGenerate={encrypting ? onGenerate : undefined}
            />
            <Inline gap="2" align="center">
              <Button
                variant="primary"
                leftIcon={
                  encrypting ? <IconLock size="sm" /> : <IconUnlock size="sm" />
                }
                disabled={!canRun}
                onClick={() => void run()}
              >
                {encrypting ? 'Encrypt' : 'Decrypt'}
              </Button>
              {job.status === 'running' && (
                <>
                  <LoadingState label={job.progress?.label ?? 'Working'} />
                  <Button variant="ghost" size="sm" onClick={job.cancel}>
                    Cancel
                  </Button>
                </>
              )}
            </Inline>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
};
