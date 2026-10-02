import { useEffect, useRef, useState } from 'react';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import type { Autosave } from '@/pdf/doc/autosave';
import { createAutosave } from '@/pdf/doc/autosave';
import { enforceCheckpointBudget } from '@/pdf/doc/budget';
import type { LogRecord } from '@/pdf/doc/serialize';
import { estimateQuota } from '@/shared/lib/storage';
import { clearDocuments } from '@/pdf/doc/recent';
import type { ModeId } from '@/pdf/doc/types';
import type { WorkspaceSession } from './session';
import type { SaveStatus } from './TopBarControls';

const THUMB_DPI = 72;
/** The saved thumbnail never holds up the canvas. */
const BACKGROUND = 2;

/** Encrypted inputs save only once the user opted in (kept in the record). */
const savesByDefault = (session: WorkspaceSession) => {
  const st = session.model.getState();
  return !st.encryptedInput || !!st.saveOptIn;
};

/**
 * Autosave for the open document (spec §6.6): on unless the input was
 * encrypted (then opt-in, remembered across restores), quota errors toasted with "Clear old documents",
 * and the checkpoint disk budget enforced after each checkpoint.
 */
export function useAutosave(
  session: WorkspaceSession,
  ui: () => { mode: ModeId; viewport: LogRecord['viewport'] },
) {
  const { model, db } = session;
  const [status, setStatus] = useState<SaveStatus>(() =>
    !db ? 'unavailable' : savesByDefault(session) ? 'saving' : 'off',
  );
  const saver = useRef<Autosave | null>(null);
  const latestUi = useRef(ui);
  useEffect(() => {
    latestUi.current = ui;
  });

  useEffect(() => {
    if (!db) return;
    const s = createAutosave({
      db,
      model,
      blobs: session.blobs,
      ui: () => latestUi.current(),
      enabled: savesByDefault(session),
      async thumb() {
        const page = model.getView().pages[0];
        const docId = page && session.sourceDocs.get(page.source)?.docId;
        if (!page || page.blank || !docId) return null;
        const img = await session.services.render.renderPageImage(
          docId,
          page.index,
          { dpi: THUMB_DPI, format: 'jpeg', quality: 0.7 },
          undefined,
          BACKGROUND,
        );
        return new Blob([img.bytes as Uint8Array<ArrayBuffer>], {
          type: 'image/jpeg',
        });
      },
      onStatus: setStatus,
      onError(e) {
        notify.error(e, {
          action:
            e.code === 'STORAGE_FULL'
              ? {
                  label: 'Clear old documents',
                  // Keeps the open document, then saves it again at once.
                  onClick: () =>
                    void clearDocuments(db, model.getState().id)
                      .then(() => s.flush())
                      .catch((err: unknown) => notify.error(toToolError(err))),
                }
              : undefined,
        });
      },
    });
    saver.current = s;
    const off = model.subscribe((e) => {
      if (e.kind === 'busy') return;
      // Unsaved changes show as "Saving" until the debounced save lands.
      if (s.isEnabled()) setStatus('saving');
      if (e.kind !== 'checkpoint') return;
      void estimateQuota()
        .then((q) => enforceCheckpointBudget(model, session.blobs, q))
        .then((dropped) => {
          if (dropped.length)
            notify.info(
              'Older undo steps were removed to free space on this device',
            );
        })
        .catch(() => {});
    });
    return () => {
      off();
      void s.flush().finally(() => s.dispose());
      saver.current = null;
    };
  }, [db, model, session]);

  return {
    status,
    setEnabled(on: boolean) {
      // Saving turns on before the choice lands, and off after, so the
      // saved record always carries the latest choice.
      if (on) saver.current?.setEnabled(true);
      if (model.getState().encryptedInput) model.setSaveOptIn(on);
      if (!on) saver.current?.setEnabled(false);
      setStatus(on ? 'saving' : 'off');
    },
    flush: () => saver.current?.flush() ?? Promise.resolve(),
  };
}
