import { useId, useRef, useState } from 'react';
import { saveBlob, deriveFilename } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import type { JobProgress } from '@/shared/state/useJob';
import { IconEye } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ErrorState,
  Input,
  Label,
  ProgressOverlay,
} from '@/shared/ui';
import { exportDocument } from '@/pdf/doc/export';
import type { ExportOptions } from '@/pdf/doc/export-stages';
import { MODE_LABELS } from '@/pdf/doc/modes';
import { RESTRICTED_MESSAGE } from '@/pdf/doc/restricted';
import { summarizeChanges } from '@/pdf/doc/summary';
import type { DocView, PageId } from '@/pdf/doc/types';
import { EXPORT_OPTION_SECTIONS } from './export-options';
import { getMode } from './modes/registry';
import type { DocumentApi } from './modes/types';
import { PreviewAsExported } from './PreviewAsExported';
import type { WorkspaceSession } from './session';
import { exportWarnings } from './export-warnings';

export interface ExportDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  session: WorkspaceSession;
  doc: DocumentApi;
  currentPage: PageId | null;
  selectedPages: PageId[];
  /** Injected in tests. */
  run?: typeof exportDocument;
  save?: typeof saveBlob;
}

/** The first page with a pending change, for the automatic preview. */
function firstChangedPage(view: DocView, baseSource: string): PageId | null {
  const changed = view.pages.find(
    (p, i) =>
      p.rotate !== 0 ||
      p.crop ||
      p.size ||
      p.blank ||
      p.source !== baseSource ||
      p.index !== i ||
      (view.overlays.get(p.id)?.length ?? 0) > 0,
  );
  return changed?.id ?? null;
}

const initialOptions = (name: string, selected: PageId[]): ExportOptions => ({
  filename: deriveFilename(name, 'edited', 'pdf'),
  onlyPages: null,
  stripMetadata: false,
  selectedPages: selected,
});

/**
 * Export PDF (spec §6.4): file name, the change summary by mode, option
 * sections, warnings, a preview of a page as exported, then the export job
 * with progress and Cancel.
 */
export function ExportDialog(props: ExportDialogProps) {
  // Fresh options and preview each time it opens.
  if (!props.open) return null;
  return <ExportDialogBody {...props} />;
}

function ExportDialogBody({
  open,
  onOpenChange,
  session,
  doc,
  currentPage,
  selectedPages,
  run = exportDocument,
  save = saveBlob,
}: ExportDialogProps) {
  const { model } = session;
  const state = model.getState();
  const view = model.getView();
  const nameId = useId();
  const [options, setOptions] = useState(() =>
    initialOptions(state.name, selectedPages),
  );
  const [preview, setPreview] = useState<PageId | null>(() =>
    firstChangedPage(view, model.currentCheckpoint().sourceId),
  );
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<ToolError | null>(null);
  const [notes, setNotes] = useState<string[] | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const summary = summarizeChanges(state, view);
  const warnings = exportWarnings(state, view);
  const sections = EXPORT_OPTION_SECTIONS.filter((s) => s.visible(doc)).sort(
    (a, b) => a.order - b.order,
  );
  const set = (patch: Partial<ExportOptions>) =>
    setOptions((o) => ({ ...o, ...patch }) as ExportOptions);

  const start = async () => {
    const filename =
      options.filename.trim() || initialOptions(state.name, []).filename;
    const c = new AbortController();
    ctrl.current = c;
    setRunning(true);
    setError(null);
    setProgress(null);
    try {
      const out = await run(
        model,
        session.blobs,
        { ...options, filename },
        {
          services: session.services,
          signal: c.signal,
          progress: setProgress,
        },
      );
      if (c.signal.aborted) return;
      save(out.bytes, filename, 'application/pdf');
      notify.success(`Exported ${filename}`);
      const told = [...out.warnings, ...out.notes];
      if (told.length) setNotes(told);
      else onOpenChange(false);
    } catch (e) {
      const err = toToolError(e);
      if (err.code !== 'CANCELLED') setError(err);
    } finally {
      if (ctrl.current === c) ctrl.current = null;
      setRunning(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} size="lg">
        <DialogHeader>
          <DialogTitle>Export PDF</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={nameId}>File name</Label>
            <Input
              id={nameId}
              value={options.filename}
              onChange={(filename) => set({ filename })}
            />
          </div>

          <section
            aria-labelledby={`${nameId}-changes`}
            className="flex flex-col gap-2"
          >
            <h3
              id={`${nameId}-changes`}
              className="text-sm font-semibold text-fg"
            >
              Changes
            </h3>
            {summary.length === 0 ? (
              <p className="text-sm text-fg-muted">
                No changes. The export is a copy of the original.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {summary.map((s) => {
                  const Icon = getMode(s.mode)?.icon;
                  return (
                    <li key={s.mode} className="flex items-start gap-2 text-sm">
                      {Icon ? (
                        <span className="mt-0.5 text-fg-muted">
                          <Icon size="sm" />
                        </span>
                      ) : null}
                      <span className="font-medium text-fg">
                        {MODE_LABELS[s.mode]}
                      </span>
                      <span className="text-fg-muted">
                        {s.lines.join(', ')}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {sections.map(({ id, title, Component }) => (
            <section
              key={id}
              aria-label={title}
              className="flex flex-col gap-2"
            >
              <h3 className="text-sm font-semibold text-fg">{title}</h3>
              <Component doc={doc} options={options} set={set} />
            </section>
          ))}

          {state.restricted ? (
            <Alert status="warning">
              <AlertDescription>{RESTRICTED_MESSAGE}</AlertDescription>
            </Alert>
          ) : null}

          {warnings.length || notes?.length ? (
            <Alert status="warning">
              <AlertDescription>
                <ul className="flex flex-col gap-1">
                  {[...warnings, ...(notes ?? [])].map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          {preview ? (
            <PreviewAsExported session={session} pageId={preview} />
          ) : currentPage ? (
            <div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<IconEye size="sm" />}
                onClick={() => setPreview(currentPage)}
              >
                Preview page as exported
              </Button>
            </div>
          ) : null}

          {error ? <ErrorState error={error} headingLevel={3} /> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {notes ? 'Done' : 'Cancel'}
          </Button>
          {notes ? null : (
            <Button
              variant="primary"
              onClick={() => void start()}
              loading={running}
              disabled={state.restricted}
            >
              Export
            </Button>
          )}
        </DialogFooter>
      </Dialog>
      <ProgressOverlay
        open={running}
        title="Exporting"
        progress={progress}
        onCancel={() => ctrl.current?.abort()}
      />
    </>
  );
}
