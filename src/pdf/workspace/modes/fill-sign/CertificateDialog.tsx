import { useId, useState } from 'react';
import { saveBlob } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import {
  IconCertificate,
  IconCertificateNew,
  IconDownload,
} from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FilePicker,
  Input,
  Label,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
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
  const id = useId();
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
    <Stack gap="1">
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        value={form[key] ?? ''}
        autoComplete={
          key === 'name' ? 'name' : key === 'email' ? 'email' : 'organization'
        }
        onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
      />
    </Stack>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogHeader>
        <DialogTitle>Signing certificate</DialogTitle>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-4">
        <SegmentedControl
          label="Certificate source"
          value={source}
          onChange={(v) => {
            setSource(v);
            setError(null);
          }}
          options={[
            { value: 'file', label: 'Certificate file', icon: IconCertificate },
            {
              value: 'create',
              label: 'Create self-signed',
              icon: IconCertificateNew,
            },
          ]}
        />
        {source === 'file' ? (
          <Stack gap="3">
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
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={openPicker}>
                    Choose certificate file
                  </Button>
                  <Text size="sm" tone="muted">
                    {file ? file.name : '.p12 or .pfx'}
                  </Text>
                </div>
              )}
            </FilePicker>
            <Stack gap="1">
              <Label htmlFor={`${id}-pw`}>Certificate password</Label>
              <Input
                id={`${id}-pw`}
                type="password"
                autoComplete="off"
                value={password}
                onChange={setPassword}
              />
            </Stack>
          </Stack>
        ) : created ? (
          <Stack gap="3">
            <CertificateSummary info={created.info} now={createdAt} />
            <Stack gap="1">
              <Label htmlFor={`${id}-export`}>
                New password for the certificate file (at least 8 characters)
              </Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id={`${id}-export`}
                  type="password"
                  autoComplete="new-password"
                  value={exportPw}
                  onChange={setExportPw}
                  className="min-w-0 flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<IconDownload size="sm" />}
                  disabled={busy || exportPw.length < 8}
                  onClick={() => void download()}
                >
                  Download certificate file (.p12)
                </Button>
              </div>
            </Stack>
          </Stack>
        ) : (
          <Stack gap="3">
            {field('name', 'Name')}
            {field('email', 'Email (optional)')}
            {field('organisation', 'Organisation (optional)')}
            <div className="grid gap-3 sm:grid-cols-2">
              <Stack gap="1">
                <Label htmlFor={`${id}-years`}>Valid for</Label>
                <Select
                  id={`${id}-years`}
                  value={String(form.years)}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, years: v === '3' ? 3 : 1 }))
                  }
                  items={[
                    { value: '1', label: '1 year' },
                    { value: '3', label: '3 years' },
                  ]}
                />
              </Stack>
              <Stack gap="1">
                <Label htmlFor={`${id}-key`}>Key type</Label>
                <Select
                  id={`${id}-key`}
                  value={form.keyType}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      keyType: v as SelfSignedOptions['keyType'],
                    }))
                  }
                  items={[
                    { value: 'ecdsa-p256', label: 'ECDSA P-256' },
                    { value: 'rsa-2048', label: 'RSA 2048' },
                  ]}
                />
              </Stack>
            </div>
          </Stack>
        )}
        {error ? (
          <Alert status="danger">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        <Text size="sm" tone="muted">
          Your certificate and password stay in this browser tab and are
          forgotten after the export.
        </Text>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={close}>
          Cancel
        </Button>
        {source === 'file' ? (
          <Button
            variant="primary"
            loading={busy}
            disabled={!file}
            onClick={() => void openFile()}
          >
            Use this certificate
          </Button>
        ) : created ? (
          <Button
            variant="primary"
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
            variant="primary"
            loading={busy}
            disabled={!form.name.trim()}
            onClick={() => void create()}
          >
            Create certificate
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
