import React, { useState } from 'react';
import { IconLock, IconUnlock } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Inline,
  LoadingState,
  SegmentedControl,
  Stack,
  TextInputPanel,
} from '@/shared/ui';
import { armor, dearmor } from '@/shared/lib/crypto/aead';
import { utf8Decode, utf8Encode } from '@/shared/lib/encoding';
import { toToolError } from '@/shared/lib/errors';
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
  const [result, setResult] = useState<{ text?: string; error?: string }>({});
  const job = direction === 'encrypt' ? jobs.sealJob : jobs.openJob;
  const encrypting = direction === 'encrypt';
  const mismatch = encrypting && confirm !== passphrase;
  const canRun =
    input !== '' && passphrase !== '' && !mismatch && job.status !== 'running';

  const run = async () => {
    setResult({});
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
      setResult({ error: toToolError(e).message });
      return;
    }
    const out = await jobs.openJob.run(sealed, passphrase);
    if (out) {
      try {
        setResult({ text: utf8Decode(out) });
      } catch (e) {
        setResult({
          error: toToolError(e, 'The decrypted data is not text').message,
        });
      }
    }
  };

  const error =
    result.error ?? (job.status === 'error' ? job.error?.message : undefined);

  return (
    <Stack gap="4">
      <SegmentedControl<Direction>
        label="Direction"
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
      <PassphraseFields
        value={passphrase}
        onChange={onPassphrase}
        confirm={
          encrypting ? { value: confirm, onChange: setConfirm } : undefined
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
      {error && (
        <Alert status="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
  );
};
