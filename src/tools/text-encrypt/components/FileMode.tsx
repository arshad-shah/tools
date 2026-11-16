import {
  Button,
  Card,
  Divider,
  EmptyState,
  FileDrop,
  Notice,
  Stack,
} from '@arshad-shah/cynosure';
import { download, fileLock, lock, unlock } from '@arshad-shah/cynosure/icons';
import React, { useEffect, useState } from 'react';
import { TransformLayout } from '@/app/ui/transform';
import { ENVELOPE_MAGIC } from '@/shared/lib/crypto/aead';
import { saveBlob } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';
import type { useCryptoJob } from '../hooks/useCryptoJob';
import {
  checkFileSize,
  encryptedName,
  packFile,
  unpackFile,
} from '../lib/file-envelope';
import { KDF_PARAMS, type KdfChoice } from '../settings';
import { JobButton } from './JobButton';
import { KdfOptions } from './KdfOptions';
import { PassphraseFields } from './PassphraseFields';

interface FileModeProps {
  jobs: ReturnType<typeof useCryptoJob>;
  kdf: KdfChoice;
  onKdf(kdf: KdfChoice): void;
  passphrase: string;
  onPassphrase(v: string): void;
  onGenerate(): void;
  /** A file handed over from a hub drop. */
  file: File | null;
  onFile(f: File | null): void;
}

const isEnvelope = async (f: File) =>
  new TextDecoder().decode(await f.slice(0, 4).arrayBuffer()) ===
  ENVELOPE_MAGIC;

interface Done {
  bytes: Uint8Array;
  name: string;
  mime: string;
}

/** Any file to `<name>.enc`, and `.enc` back to the original name and type. */
export const FileMode: React.FC<FileModeProps> = ({
  jobs,
  kdf,
  onKdf,
  passphrase,
  onPassphrase,
  onGenerate,
  file,
  onFile,
}) => {
  const [sealed, setSealed] = useState<{ file: File; yes: boolean } | null>(
    null,
  );
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const decrypting = sealed?.file === file && sealed.yes;
  useEffect(() => {
    if (!file) return;
    let live = true;
    void isEnvelope(file).then((yes) => live && setSealed({ file, yes }));
    return () => {
      live = false;
    };
  }, [file]);
  const job = decrypting ? jobs.openJob : jobs.sealJob;
  const mismatch = !decrypting && confirm !== passphrase;

  const run = async () => {
    if (!file) return;
    setDone(null);
    setError(null);
    try {
      checkFileSize(file.size);
      if (decrypting) {
        const out = await jobs.openJob.run(
          new Uint8Array(await file.arrayBuffer()),
          passphrase,
        );
        if (out) setDone(unpackFile(out));
      } else {
        const out = await jobs.sealJob.run(
          await packFile(file),
          passphrase,
          KDF_PARAMS[kdf],
        );
        if (out)
          setDone({
            bytes: out,
            name: encryptedName(file.name),
            mime: 'application/octet-stream',
          });
      }
    } catch (e) {
      setError(toToolError(e));
    }
  };

  const shownError =
    error ?? (job.status === 'error' ? (job.error ?? null) : null);

  const inputCard = (
    <Card as="section" title="File">
      <Stack gap="5">
        <FileDrop
          hint="Any file to encrypt, or a .enc file to decrypt. Up to 2 GB, held in memory on this device."
          labels={{ chooseOne: 'Choose a file', remove: () => 'Remove file' }}
          value={file ? [file] : undefined}
          onRemove={() => {
            onFile(null);
            setDone(null);
            setError(null);
            job.reset();
          }}
          onFiles={(fs) => {
            onFile(fs[0] ?? null);
            setDone(null);
            setError(null);
          }}
        />
        {file && sealed?.file === file ? (
          <>
            <Notice tone={decrypting ? 'info' : 'neutral'} size="sm">
              {decrypting
                ? `${file.name} (${formatBytes(file.size)}) is encrypted: enter its passphrase.`
                : `${file.name} (${formatBytes(file.size)}) will be encrypted to ${encryptedName(file.name)}.`}
            </Notice>
            <Divider />
            <PassphraseFields
              value={passphrase}
              onChange={onPassphrase}
              confirm={
                decrypting
                  ? undefined
                  : { value: confirm, onChange: setConfirm }
              }
              onGenerate={decrypting ? undefined : onGenerate}
            />
            {decrypting ? null : <KdfOptions value={kdf} onChange={onKdf} />}
            <JobButton
              label={decrypting ? 'Decrypt file' : 'Encrypt file'}
              icon={decrypting ? unlock : lock}
              disabled={!passphrase || mismatch}
              job={job}
              onRun={() => void run()}
            />
          </>
        ) : null}
      </Stack>
    </Card>
  );

  const outputCard = (
    <Card as="section" title="Result">
      <Stack gap="5">
        {shownError ? (
          <Notice
            tone="danger"
            title={
              decrypting
                ? 'Could not decrypt the file'
                : 'Could not encrypt the file'
            }
          >
            {shownError.message}
          </Notice>
        ) : null}
        {done ? (
          <Notice
            tone="success"
            title={`${done.name} is ready`}
            action={
              <Button
                variant="soft"
                tone="success"
                icon={download}
                onClick={() =>
                  saveBlob(
                    done.bytes,
                    done.name,
                    done.mime || 'application/octet-stream',
                  )
                }
              >
                {`Download ${done.name}`}
              </Button>
            }
          >
            {`${formatBytes(done.bytes.length)}. It stays on this device until you download it.`}
          </Notice>
        ) : !shownError ? (
          <EmptyState
            icon={fileLock}
            title="No file yet"
            description="Choose a file and a passphrase to encrypt it, or open a .enc file to get the original back."
          />
        ) : null}
      </Stack>
    </Card>
  );

  return <TransformLayout start={inputCard} end={outputCard} />;
};
