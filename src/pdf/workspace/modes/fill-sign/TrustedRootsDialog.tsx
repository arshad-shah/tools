import { useEffect, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { trash, upload } from '@arshad-shah/cynosure/icons';
import {
  Button,
  Dialog,
  EmptyState,
  ListRow,
  ListRows,
  Notice,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { FilePicker } from '../../ui/FilePicker';
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
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Trusted roots"
      description="A signature is shown as trusted only when its certificate chains to a root you imported here. Roots are stored on this device only."
      actions={
        <>
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
              <Button variant="outline" icon={upload} onClick={pick}>
                Import root certificate
              </Button>
            )}
          </FilePicker>
          <Button
            variant="solid"
            tone="accent"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </>
      }
    >
      <Stack gap="4">
        {roots && roots.length === 0 ? (
          <EmptyState
            size="sm"
            title="No trusted roots"
            description="Import a root certificate you trust."
          />
        ) : (
          <ListRows label="Trusted roots" divided>
            {(roots ?? []).map((r) => (
              <ListRow
                key={r.sha256}
                label={r.subjectCN || r.subject}
                description={`Valid until ${day(r.notAfter)}, ${r.keyDescription}`}
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    tone="danger"
                    icon={trash}
                    aria-label={`Remove ${r.subjectCN || r.subject}`}
                    onClick={() =>
                      void change((s) => removeTrustedRoot(s, r.sha256))
                    }
                  >
                    Remove
                  </Button>
                }
              />
            ))}
          </ListRows>
        )}
        {error ? <Notice tone="danger">{error.message}</Notice> : null}
        <Text as="p" size="xs" tone="muted">
          Certificates: .cer, .crt, .pem or .der.
        </Text>
      </Stack>
    </Dialog>
  );
}
