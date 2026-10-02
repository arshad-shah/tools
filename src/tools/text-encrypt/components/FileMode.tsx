import React, { useEffect, useState } from 'react';
import { IconDownload, IconLock, IconUnlock, IconX } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  DropZone,
  Inline,
  LoadingState,
  Stack,
  Text,
} from '@/shared/ui';
import { ENVELOPE_MAGIC } from '@/shared/lib/crypto/aead';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';
import type { useCryptoJob } from '../hooks/useCryptoJob';
import {
  checkFileSize,
  encryptedName,
  packFile,
  unpackFile,
} from '../lib/file-envelope';
import { KDF_PARAMS, type KdfChoice } from '../settings';
import { PassphraseFields } from './PassphraseFields';

interface FileModeProps {
  jobs: ReturnType<typeof useCryptoJob>;
  kdf: KdfChoice;
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
  const [error, setError] = useState('');
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
    setError('');
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
      setError(toToolError(e).message);
    }
  };

  const shownError =
    error || (job.status === 'error' ? (job.error?.message ?? '') : '');

  return (
    <Stack gap="4">
      {file ? (
        <Inline justify="between" align="center" wrap>
          <Text size="sm">
            {file.name} ({formatBytes(file.size)}){' '}
            {decrypting ? 'is encrypted: enter its passphrase.' : ''}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<IconX size="sm" />}
            onClick={() => {
              onFile(null);
              setDone(null);
              setError('');
              job.reset();
            }}
          >
            Remove file
          </Button>
        </Inline>
      ) : (
        <DropZone
          variant="inline"
          onFiles={(fs) => {
            onFile(fs[0]);
            setDone(null);
          }}
          title="Drop a file to encrypt, or a .enc file to decrypt"
          hint="Up to 2 GB, held in memory on this device."
          chooseLabel="Choose a file"
        />
      )}
      {file && sealed?.file === file && (
        <>
          <PassphraseFields
            value={passphrase}
            onChange={onPassphrase}
            confirm={
              decrypting ? undefined : { value: confirm, onChange: setConfirm }
            }
            onGenerate={decrypting ? undefined : onGenerate}
          />
          <Inline gap="2" align="center" wrap>
            <Button
              variant="primary"
              leftIcon={
                decrypting ? <IconUnlock size="sm" /> : <IconLock size="sm" />
              }
              disabled={!passphrase || mismatch || job.status === 'running'}
              onClick={() => void run()}
            >
              {decrypting ? 'Decrypt file' : 'Encrypt file'}
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
        </>
      )}
      {shownError && (
        <Alert status="danger">
          <AlertDescription>{shownError}</AlertDescription>
        </Alert>
      )}
      {done && (
        <Inline gap="2" align="center" wrap>
          <Text size="sm">
            {done.name} ({formatBytes(done.bytes.length)}) is ready.
          </Text>
          <Button
            variant="secondary"
            leftIcon={<IconDownload size="sm" />}
            onClick={() =>
              saveBlob(
                done.bytes,
                done.name,
                done.mime || 'application/octet-stream',
              )
            }
          >
            Download {done.name}
          </Button>
        </Inline>
      )}
    </Stack>
  );
};
