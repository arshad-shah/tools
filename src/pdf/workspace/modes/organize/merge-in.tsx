import { useState } from 'react';
import { loadFile, type LoadedFile } from '@/shared/lib/files';
import { newId } from '@/shared/lib/id';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import { Dialog, DialogBody, DialogHeader, DialogTitle } from '@/shared/ui';
import type { DocumentModel } from '@/pdf/doc/model';
import { PasswordPrompt } from '@/pdf/components/PasswordPrompt';
import { preparePdf, unlockWithPassword } from '@/pdf/qpdf/unlock';
import type { ModeProps } from '../types';
import { useWorkspace } from '../../workspace-context';

/** Adds the file as a source and inserts its pages after the current page. */
async function mergeBytes(
  ctx: ModeProps,
  model: DocumentModel,
  name: string,
  bytes: Uint8Array,
) {
  const { doc } = ctx;
  const sourceId = await doc.addSource(bytes, name);
  const count = model.getState().sources[sourceId]?.pageCount ?? 0;
  const pages = model.getView().pages;
  const at =
    pages.findIndex((p) => p.id === doc.currentPage) + 1 || pages.length;
  const ops = doc.dispatch({
    type: 'page.mergeIn',
    params: {
      sourceId,
      at,
      newIds: Array.from({ length: count }, () => newId()),
    },
  });
  if (ops.length)
    doc.announce(
      `Inserted ${count} ${count === 1 ? 'page' : 'pages'} from ${name}`,
    );
}

/**
 * "Merge in": another PDF's pages after the current page, one undo step.
 * Encrypted files ask for their password first (spec §13.3 Organize row).
 */
export function useMergeIn(ctx: ModeProps) {
  const { session } = useWorkspace();
  const [locked, setLocked] = useState<{
    file: LoadedFile;
    error: string | null;
    busy: boolean;
  } | null>(null);
  const { qpdf } = ctx.doc.services;

  const onFiles = async (files: File[]) => {
    const [first] = files;
    if (!first) return;
    try {
      const file = await loadFile(first, ['pdf']);
      const prepared = await preparePdf(file.bytes, qpdf);
      if (prepared.status === 'locked')
        return setLocked({ file, error: null, busy: false });
      await mergeBytes(ctx, session.model, file.name, prepared.bytes);
    } catch (e) {
      notify.error(toToolError(e));
    }
  };

  const unlock = async (password: string) => {
    if (!locked) return;
    setLocked({ ...locked, busy: true, error: null });
    try {
      const bytes = await unlockWithPassword(locked.file.bytes, password, qpdf);
      setLocked(null);
      await mergeBytes(ctx, session.model, locked.file.name, bytes);
    } catch (e) {
      const error = toToolError(e);
      if (error.code === 'WRONG_PASSWORD')
        setLocked({ ...locked, busy: false, error: error.message });
      else {
        setLocked(null);
        notify.error(error);
      }
    }
  };

  const dialog = (
    <Dialog open={locked !== null} onOpenChange={(o) => !o && setLocked(null)}>
      <DialogHeader>
        <DialogTitle>Merge in a protected PDF</DialogTitle>
      </DialogHeader>
      <DialogBody>
        {locked ? (
          <PasswordPrompt
            fileName={locked.file.name}
            error={locked.error}
            busy={locked.busy}
            onSubmit={(pw) => void unlock(pw)}
            onCancel={() => setLocked(null)}
            submitLabel="Merge in"
          />
        ) : null}
      </DialogBody>
    </Dialog>
  );
  return { onFiles, dialog };
}
