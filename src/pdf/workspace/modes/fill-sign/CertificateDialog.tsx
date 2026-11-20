import { useState } from 'react';
import { saveBlob } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import {
  certificate as certificateIcon,
  certificateNew,
  download as downloadIcon,
} from '@arshad-shah/cynosure/icons';
import {
  Button,
  Dialog,
  Grid,
  Inline,
  Notice,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { FilePicker } from '../../ui/FilePicker';
import { importPkcs12, type SigningIdentity } from '@/pdf/sign/pades/pkcs12';
import {
  createSelfSigned,
  exportPkcs12,
  type SelfSignedOptions,
} from '@/pdf/sign/pades/self-signed';
import { CertificateSummary } from './cert-meta';

type Source = 'file' | 'create';
type Created = SigningIdentity & { exportable: CryptoKeyPair };

export interface CertificateDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** The chosen identity; held in memory by the Export dialog only. */
  onIdentity(id: SigningIdentity): void;
}

/**
 * Choose the certificate to sign with (plan H-14): a .p12/.pfx and its
 * password, or a new self-signed certificate (downloadable as .p12).
 * Passwords and keys live only in this dialog's memory (G25); the file
 * bytes are zero-filled after reading.
 */
export function CertificateDialog(props: CertificateDialogProps) {
  if (!props.open) return null;
  return <CertificateDialogBody {...props} />;
}

function CertificateDialogBody({
  open,
  onOpenChange,
  onIdentity,
}: CertificateDialogProps) {
  const [source, setSource] = useState<Source>('file');
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(
    null,
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ToolError | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<SelfSignedOptions>({
    name: '',
    email: '',
    organisation: '',
    years: 1,
    keyType: 'ecdsa-p256',
  });
  const [created, setCreated] = useState<Created | null>(null);
  const [createdAt, setCreatedAt] = useState(() => new Date());
  const [exportPw, setExportPw] = useState('');

  const close = () => {
    file?.bytes.fill(0);
    onOpenChange(false);
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(toToolError(e));
    } finally {
      setBusy(false);
    }
  };

  const openFile = () =>
    run(async () => {
      if (!file) return;
      const identity = await importPkcs12(file.bytes, password);
      setPassword('');
      file.bytes.fill(0);
      onIdentity(identity);
      onOpenChange(false);
    });

  const create = () =>
    run(async () => {
      setCreated(await createSelfSigned(form));
      setCreatedAt(new Date());
    });

  const download = () =>
    run(async () => {
      if (!created) return;
      const p12 = await exportPkcs12(
        { certificate: created.certificate, keyPair: created.exportable },
        exportPw,
      );
      setExportPw('');
      const base =
        created.info.subjectCN.replace(/[^\w.-]+/g, '-') || 'certificate';
      saveBlob(p12, `${base}.p12`, 'application/x-pkcs12');
    });

  const field = (key: 'name' | 'email' | 'organisation', label: string) => (
    <TextField
      label={label}
      value={form[key] ?? ''}
      autoComplete={
        key === 'name' ? 'name' : key === 'email' ? 'email' : 'organization'
      }
      onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
    />
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(o) : close())}
      title="Signing certificate"
      actions={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          {source === 'file' ? (
            <Button
              variant="solid"
              tone="accent"
              loading={busy}
              disabled={!file}
              onClick={() => void openFile()}
            >
              Use this certificate
            </Button>
          ) : created ? (
            <Button
              variant="solid"
              tone="accent"
              onClick={() => {
                // The exportable key pair stays behind in this dialog.
                onIdentity({
                  privateKey: created.privateKey,
                  algorithm: created.algorithm,
                  certificate: created.certificate,
                  chain: created.chain,
                  info: created.info,
                });
                onOpenChange(false);
              }}
            >
              Use this certificate
            </Button>
          ) : (
            <Button
              variant="solid"
              tone="accent"
              loading={busy}
              disabled={!form.name.trim()}
              onClick={() => void create()}
            >
              Create certificate
            </Button>
          )}
        </>
      }
    >
      <Stack gap="5">
        <SegmentedControl
          label="Certificate source"
          value={source}
          onChange={(v) => {
            setSource(v as Source);
            setError(null);
          }}
          options={[
            { value: 'file', label: 'Certificate file', icon: certificateIcon },
            {
              value: 'create',
              label: 'Create self-signed',
              icon: certificateNew,
            },
          ]}
        />
        {source === 'file' ? (
          <Stack gap="4">
            <FilePicker
              accept=".p12,.pfx,application/x-pkcs12"
              onFiles={async ([f]) => {
                file?.bytes.fill(0);
                setFile({
                  name: f.name,
                  bytes: new Uint8Array(await f.arrayBuffer()),
                });
                setError(null);
              }}
            >
              {(openPicker) => (
                <Inline gap="3" align="center" wrap>
                  <Button variant="outline" size="sm" onClick={openPicker}>
                    Choose certificate file
                  </Button>
                  <Text size="sm" tone="muted">
                    {file ? file.name : '.p12 or .pfx'}
                  </Text>
                </Inline>
              )}
            </FilePicker>
            <TextField
              label="Certificate password"
              type="password"
              revealable
              autoComplete="off"
              value={password}
              onChange={setPassword}
            />
          </Stack>
        ) : created ? (
          <Stack gap="4">
            <CertificateSummary info={created.info} now={createdAt} />
            <Inline gap="2" align="end" wrap>
              <TextField
                label="New password for the certificate file (at least 8 characters)"
                type="password"
                revealable
                autoComplete="new-password"
                value={exportPw}
                onChange={setExportPw}
              />
              <Button
                variant="outline"
                size="md"
                icon={downloadIcon}
                disabled={busy || exportPw.length < 8}
                onClick={() => void download()}
              >
                Download certificate file (.p12)
              </Button>
            </Inline>
          </Stack>
        ) : (
          <Stack gap="4">
            {field('name', 'Name')}
            {field('email', 'Email (optional)')}
            {field('organisation', 'Organisation (optional)')}
            <Grid columns={2} minItemWidth="12rem" gap="4">
              <Select
                label="Valid for"
                value={String(form.years)}
                onChange={(v) =>
                  setForm((f) => ({ ...f, years: v === '3' ? 3 : 1 }))
                }
                options={[
                  { value: '1', label: '1 year' },
                  { value: '3', label: '3 years' },
                ]}
              />
              <Select
                label="Key type"
                value={form.keyType}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    keyType: v as SelfSignedOptions['keyType'],
                  }))
                }
                options={[
                  { value: 'ecdsa-p256', label: 'ECDSA P-256' },
                  { value: 'rsa-2048', label: 'RSA 2048' },
                ]}
              />
            </Grid>
          </Stack>
        )}
        {error ? <Notice tone="danger">{error.message}</Notice> : null}
        <Text as="p" size="sm" tone="muted">
          Your certificate and password stay in this browser tab and are
          forgotten after the export.{' '}
          {source === 'create'
            ? 'A self-signed certificate proves the file has not changed since signing, not who signed it: for contracts and regulated documents, use a certificate from a trusted provider.'
            : "For contracts and regulated documents, prefer your organisation's signing service or a hardware token, which keep the private key off any web page."}
        </Text>
      </Stack>
    </Dialog>
  );
}
