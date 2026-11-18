import {
  Card,
  CodeBlock,
  CopyButton,
  Divider,
  EmptyState,
  IconButton,
  Inline,
  Notice,
  Stack,
  TextArea,
} from '@arshad-shah/cynosure';
import { download, lock, unlock } from '@arshad-shah/cynosure/icons';
import React, { useState } from 'react';
import { TextSourceActions } from '@/app/ui/text-source';
import { useTextFile } from '@/app/ui/use-text-file';
import { TransformLayout } from '@/app/ui/transform';
import { armor, dearmor } from '@/shared/lib/crypto/aead';
import { saveBlob } from '@/shared/lib/download';
import { utf8Decode, utf8Encode } from '@/shared/lib/encoding';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import type { HandoffPayload } from '@/shared/lib/handoff';
import type { useCryptoJob } from '../hooks/useCryptoJob';
import { KDF_PARAMS, type KdfChoice } from '../settings';
import { JobButton } from './JobButton';
import { KdfOptions } from './KdfOptions';
import { PassphraseFields } from './PassphraseFields';

export type Direction = 'encrypt' | 'decrypt';

const acceptsText = (p: HandoffPayload) =>
  p.kind === 'text' && p.mime === 'text/plain';

interface TextModeProps {
  direction: Direction;
  jobs: ReturnType<typeof useCryptoJob>;
  kdf: KdfChoice;
  onKdf(kdf: KdfChoice): void;
  passphrase: string;
  onPassphrase(v: string): void;
  onGenerate(): void;
}

/** Text in, an armoured message out (and back). */
export const TextMode: React.FC<TextModeProps> = ({
  direction,
  jobs,
  kdf,
  onKdf,
  passphrase,
  onPassphrase,
  onGenerate,
}) => {
  const [input, setInput] = useState('');
  const [confirm, setConfirm] = useState('');
  const [result, setResult] = useState<{
    direction?: Direction;
    text?: string;
    error?: ToolError;
  }>({});
  const job = direction === 'encrypt' ? jobs.sealJob : jobs.openJob;
  const encrypting = direction === 'encrypt';
  const mismatch = encrypting && confirm !== passphrase;
  const canRun = input !== '' && passphrase !== '' && !mismatch;

  const run = async () => {
    setResult({});
    if (encrypting) {
      const out = await jobs.sealJob.run(
        utf8Encode(input),
        passphrase,
        KDF_PARAMS[kdf],
      );
      if (out) setResult({ direction, text: armor(out) });
      return;
    }
    let sealed: Uint8Array;
    try {
      sealed = dearmor(input);
    } catch (e) {
      setResult({ direction, error: toToolError(e) });
      return;
    }
    const out = await jobs.openJob.run(sealed, passphrase);
    if (out) {
      try {
        setResult({ direction, text: utf8Decode(out) });
      } catch (e) {
        setResult({
          direction,
          error: toToolError(e, 'The decrypted data is not text'),
        });
      }
    }
  };

  const shown = result.direction === direction ? result : {};
  const error = shown.error ?? (job.status === 'error' ? job.error : undefined);
  const label = encrypting ? 'Message' : 'Encrypted message';
  const outName = encrypting ? 'Encrypted message' : 'Decrypted message';
  const fileName = encrypting ? 'message.txt.asc' : 'message.txt';

  // A file dropped on the field opens like Open file (TextArea onFiles).
  const textFile = useTextFile({
    onChange: (v) => {
      setInput(v);
      setResult({});
    },
  });
  const inputCard = (
    <Card as="section" title={label}>
      <Stack gap="5">
        <TextArea
          onFiles={textFile.onFiles}
          label={label}
          labelHidden
          rows={6}
          maxRows={16}
          spellCheck={false}
          placeholder={
            encrypting
              ? 'The text to encrypt.'
              : '-----BEGIN TOOLS ENCRYPTED MESSAGE----- ...'
          }
          value={input}
          onChange={(v) => {
            setInput(v);
            setResult({});
          }}
        />
        <TextSourceActions
          value={input}
          onChange={(v) => {
            setInput(v);
            setResult({});
          }}
          label={label}
          handoff={acceptsText}
          // Only while there is nothing to replace: one fewer button once
          // the message is written.
          onExample={
            encrypting && input === ''
              ? () => setInput('Meet at the north gate at noon. Bring the map.')
              : undefined
          }
        />
        <Divider />
        <PassphraseFields
          value={passphrase}
          onChange={onPassphrase}
          confirm={
            encrypting ? { value: confirm, onChange: setConfirm } : undefined
          }
          onGenerate={encrypting ? onGenerate : undefined}
        />
        {encrypting ? <KdfOptions value={kdf} onChange={onKdf} /> : null}
        <JobButton
          label={encrypting ? 'Encrypt' : 'Decrypt'}
          icon={encrypting ? lock : unlock}
          disabled={!canRun}
          job={job}
          onRun={() => void run()}
        />
      </Stack>
    </Card>
  );

  const outputCard = (
    <Card as="section" title={encrypting ? 'Encrypted' : 'Decrypted'}>
      <Stack gap="5">
        {error ? (
          <Notice
            tone="danger"
            title={encrypting ? 'Could not encrypt' : 'Could not decrypt'}
          >
            {error.message}
          </Notice>
        ) : null}
        {shown.text !== undefined ? (
          <CodeBlock
            title={outName}
            code={shown.text}
            wrap
            copyable={false}
            actions={
              <Inline gap="1">
                <CopyButton
                  size="sm"
                  value={shown.text}
                  labels={{ copy: `Copy the ${outName.toLowerCase()}` }}
                />
                <IconButton
                  size="sm"
                  variant="ghost"
                  tone="neutral"
                  icon={download}
                  label={`Download ${fileName}`}
                  onClick={() =>
                    saveBlob(
                      new Blob([shown.text ?? ''], { type: 'text/plain' }),
                      fileName,
                    )
                  }
                />
              </Inline>
            }
          />
        ) : !error ? (
          <EmptyState
            icon={encrypting ? lock : unlock}
            title={
              encrypting ? 'Nothing encrypted yet' : 'Nothing decrypted yet'
            }
            description={
              encrypting
                ? 'Write a message, choose a passphrase and press Encrypt. Only that passphrase opens it.'
                : 'Paste an encrypted message, enter its passphrase and press Decrypt.'
            }
          />
        ) : null}
      </Stack>
    </Card>
  );

  return <TransformLayout start={inputCard} end={outputCard} />;
};
