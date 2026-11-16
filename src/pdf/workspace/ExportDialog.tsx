import { useEffect, useId, useRef, useState } from 'react';
import { saveBlob, deriveFilename } from '@/shared/lib/download';
import {
  toToolError,
  type ToolError,
  type ToolErrorCode,
} from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import type { JobProgress } from '@/shared/state/useJob';
import {
  Button,
  Dialog,
  Heading,
  Icon,
  Inline,
  Notice,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { eye } from '@arshad-shah/cynosure/icons';
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
import { JobOverlay } from './ui/JobOverlay';
import { ErrorNotice } from './ui/states';

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

/** Failures a plain retry can fix: the secrets stay for that retry. */
const RETRYABLE = new Set<ToolErrorCode>(['CANCELLED', 'NETWORK', 'TIMEOUT']);

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
  // Leaving (closing the dialog, the workspace or the page) stops the
  // export, so nothing downloads after the user has gone.
  useEffect(() => () => ctrl.current?.abort(), []);

  const summary = summarizeChanges(state, view);
  const warnings = exportWarnings(state, view);
  const sections = EXPORT_OPTION_SECTIONS.filter((s) => s.visible(doc)).sort(
    (a, b) => a.order - b.order,
  );
  const exportLabel =
    sections.map((s) => s.exportLabel?.(options)).find(Boolean) ?? 'Export';
  const blockers = sections
    .map((s) => s.blocker?.(options, doc))
    .filter((b): b is string => !!b);
  const set = (patch: Partial<ExportOptions>) =>
    setOptions((o) => ({ ...o, ...patch }) as ExportOptions);

  // Passwords and keys do not outlive the export that used them (G25).
  const dropSecrets = () => {
    const secrets = EXPORT_OPTION_SECTIONS.flatMap((s) => s.secret ?? []);
    if (secrets.length)
      setOptions(
        (o) =>
          ({
            ...o,
            ...Object.fromEntries(secrets.map((k) => [k, ''])),
          }) as ExportOptions,
      );
  };

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
      dropSecrets();
      save(out.bytes, filename, 'application/pdf');
      notify.success(`Exported ${filename}`);
      const told = [...out.warnings, ...out.notes];
      if (told.length) setNotes(told);
      else onOpenChange(false);
    } catch (e) {
      const err = toToolError(e);
      if (err.code !== 'CANCELLED') setError(err);
      // Kept only for a failure worth retrying as is (G25, review M14).
      if (!RETRYABLE.has(err.code)) dropSecrets();
    } finally {
      if (ctrl.current === c) ctrl.current = null;
      setRunning(false);
    }
  };

  const told = [...warnings, ...(notes ?? [])];
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        size="lg"
        title="Export PDF"
        actions={
          <>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {notes ? 'Done' : 'Cancel'}
            </Button>
            {notes ? null : (
              <Button
                variant="solid"
                tone="accent"
                onClick={() => void start()}
                loading={running}
                disabled={state.restricted || blockers.length > 0}
                aria-describedby={
                  blockers.length ? `${nameId}-blockers` : undefined
                }
              >
                {exportLabel}
              </Button>
            )}
          </>
        }
      >
        <Stack gap="6">
          <TextField
            label="File name"
            value={options.filename}
            onChange={(filename) => set({ filename })}
          />

          <Stack as="section" gap="2" aria-labelledby={`${nameId}-changes`}>
            <Heading level={3} size="xs" id={`${nameId}-changes`}>
              Changes
            </Heading>
            {summary.length === 0 ? (
              <Text size="sm" tone="muted">
                No changes. The export is a copy of the original.
              </Text>
            ) : (
              <Stack gap="2">
                {summary.map((s) => {
                  const icon = getMode(s.mode)?.icon;
                  return (
                    <Inline key={s.mode} gap="2" align="start">
                      {icon ? (
                        <Icon icon={icon} size="sm" tone="muted" />
                      ) : null}
                      <Text size="sm" weight="medium">
                        {MODE_LABELS[s.mode]}
                      </Text>
                      <Text size="sm" tone="muted">
                        {s.lines.join(', ')}
                      </Text>
                    </Inline>
                  );
                })}
              </Stack>
            )}
          </Stack>

          {sections.map(({ id, title, Component }) => (
            <Stack as="section" key={id} gap="3" aria-label={title}>
              <Heading level={3} size="xs">
                {title}
              </Heading>
              <Component doc={doc} options={options} set={set} />
            </Stack>
          ))}

          {state.restricted ? (
            <Notice tone="warning">{RESTRICTED_MESSAGE}</Notice>
          ) : null}

          {told.length ? (
            <Notice tone="warning">
              <Stack gap="1">
                {told.map((w) => (
                  <Text key={w} as="p" size="sm">
                    {w}
                  </Text>
                ))}
              </Stack>
            </Notice>
          ) : null}

          {preview ? (
            <PreviewAsExported session={session} pageId={preview} />
          ) : currentPage ? (
            <Inline>
              <Button
                variant="outline"
                size="sm"
                icon={eye}
                onClick={() => setPreview(currentPage)}
              >
                Preview page as exported
              </Button>
            </Inline>
          ) : null}

          {blockers.length ? (
            <Text as="p" size="sm" tone="muted" id={`${nameId}-blockers`}>
              {blockers.join(' ')}
            </Text>
          ) : null}

          {error ? <ErrorNotice error={error} /> : null}
        </Stack>
      </Dialog>
      <JobOverlay
        open={running}
        title="Exporting"
        progress={progress}
        onCancel={() => ctrl.current?.abort()}
      />
    </>
  );
}
