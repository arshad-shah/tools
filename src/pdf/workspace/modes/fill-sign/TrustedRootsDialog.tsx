import { useEffect, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { IconTrash, IconUpload } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FilePicker,
  MetaList,
  Stack,
  Text,
} from '@/shared/ui';
import { describeCertificate, type CertInfo } from '@/pdf/sign/pades/cert-info';
import {
  addTrustedRoot,
  clearTrustedRoots,
  loadTrustedRoots,
  removeTrustedRoot,
} from '@/pdf/sign/pades/trust';
import type { IdbStore } from '@/shared/lib/storage';
import { trustedRootsChanged } from '../../signatures';
import { getWorkspaceDb } from '../../workspace-db';

export interface TrustedRootsDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Injected in tests; defaults to the workspace database. */
  db?: () => Promise<IdbStore | null>;
}

const day = (d: Date) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);

/**
 * Root certificates trusted on this device for verifying signatures
 * (decision G22): import (.cer, .crt, .pem, .der), remove, clear all.
 * Signatures re-verify after every change.
 */
export function TrustedRootsDialog({
  open,
  onOpenChange,
  db = getWorkspaceDb,
}: TrustedRootsDialogProps) {
  const [roots, setRoots] = useState<CertInfo[] | null>(null);
  const [error, setError] = useState<ToolError | null>(null);

  const reload = async () => {
    const store = await db();
    setRoots(
      store ? (await loadTrustedRoots(store)).map(describeCertificate) : [],
    );
  };
  useEffect(() => {
    if (!open) return;
    let live = true;
    void db()
      .then((store) => (store ? loadTrustedRoots(store) : []))
      .then((list) => live && setRoots(list.map(describeCertificate)));
    return () => {
      live = false;
    };
  }, [open, db]);

  const change = async (fn: (store: IdbStore) => Promise<unknown>) => {
    setError(null);
    try {
      const store = await db();
      if (!store)
        throw new Error('This browser has no local storage for trusted roots');
      await fn(store);
      trustedRootsChanged();
      await reload();
    } catch (e) {
      setError(toToolError(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Trusted roots</DialogTitle>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-3">
        <Text size="sm" tone="muted">
          A signature is shown as trusted only when its certificate chains to a
          root you imported here. Roots are stored on this device only.
        </Text>
        {roots && roots.length === 0 ? (
          <EmptyState
            title="No trusted roots"
            description="Import a root certificate you trust."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {(roots ?? []).map((r) => (
              <li
                key={r.sha256}
                className="flex items-start justify-between gap-3 rounded-md border border-line p-2"
              >
                <Stack gap="1" className="min-w-0">
                  <Text size="sm" className="truncate font-medium text-fg">
                    {r.subjectCN || r.subject}
                  </Text>
                  <MetaList
                    items={[`Valid until ${day(r.notAfter)}`, r.keyDescription]}
                  />
                </Stack>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<IconTrash size="sm" />}
                  onClick={() =>
                    void change((s) => removeTrustedRoot(s, r.sha256))
                  }
                >
                  Remove
                  <span className="sr-only"> {r.subjectCN}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {error ? (
          <Alert status="danger">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button
          variant="ghost"
          disabled={!roots?.length}
          onClick={() => void change((s) => clearTrustedRoots(s))}
        >
          Clear all
        </Button>
        <FilePicker
          accept=".cer,.crt,.pem,.der,application/pkix-cert,application/x-x509-ca-cert"
          onFiles={([f]) =>
            void change(async (s) =>
              addTrustedRoot(s, new Uint8Array(await f.arrayBuffer())),
            )
          }
        >
          {(pick) => (
            <Button
              variant="secondary"
              leftIcon={<IconUpload size="sm" />}
              onClick={pick}
            >
              Import root certificate
            </Button>
          )}
        </FilePicker>
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
