import React from 'react';
import { useShortcuts } from '@/shared/lib/hotkeys';
import { IconFileText } from '@/shared/ui/icons';
import {
  AppShell,
  DropZone,
  ErrorState,
  FilePicker,
  LoadingState,
  TopBar,
  useWindowFileDrag,
  type RenderLink,
} from '@/shared/ui';
import { PasswordPrompt } from '@/pdf/components/PasswordPrompt';
import { RecentDocuments } from './RecentDocuments';
import { useRecentDocuments } from './use-recent-documents';
import type { WorkspacePhase } from './use-workspace-document';

export interface OpenDocumentProps {
  phase: Exclude<WorkspacePhase, { kind: 'ready' }>;
  breadcrumb: React.ReactNode;
  renderLink?: RenderLink;
  onFiles(files: File[]): void;
  onRestore(id: string): void;
  onPassword(password: string): void;
  onRepair(): void;
  onReset(): void;
}

/**
 * The workspace before a document is open (spec §13.3 Workspace row): a
 * window-wide drop target, the "Open a PDF" hero, recent documents, and the
 * opening, password and error states.
 */
export function OpenDocument({
  phase,
  breadcrumb,
  renderLink,
  onFiles,
  onRestore,
  onPassword,
  onRepair,
  onReset,
}: OpenDocumentProps) {
  const recent = useRecentDocuments();
  const { dragging } = useWindowFileDrag(onFiles);

  let body: React.ReactNode;
  if (phase.kind === 'opening')
    body = <LoadingState label={`Opening ${phase.name}`} />;
  else if (phase.kind === 'locked')
    body = (
      <PasswordPrompt
        fileName={phase.file.name}
        error={phase.error}
        busy={phase.busy}
        onSubmit={onPassword}
        onCancel={onReset}
        submitLabel="Open"
      />
    );
  else if (phase.kind === 'error') {
    const repairable = phase.error.code === 'INVALID_FILE' && phase.file;
    const crashed = phase.error.code === 'WORKER_CRASHED';
    body = (
      <ErrorState
        error={phase.error}
        headingLevel={2}
        actions={[
          ...(repairable
            ? [
                {
                  label: 'Try to repair',
                  onClick: onRepair,
                  variant: 'primary' as const,
                },
              ]
            : []),
          crashed
            ? { label: 'Reload', onClick: () => window.location.reload() }
            : { label: 'Choose another file', onClick: onReset },
        ]}
      />
    );
  } else
    body = (
      <FilePicker onFiles={onFiles} accept=".pdf,application/pdf">
        {(open) => <ChooseShortcut open={open} />}
      </FilePicker>
    );

  return (
    <AppShell
      topBar={<TopBar breadcrumb={breadcrumb} renderLink={renderLink} />}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 md:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            PDF workspace
          </h1>
          <p className="text-base text-fg-muted">
            Organise, edit and export a PDF. It stays in your browser.
          </p>
        </div>
        {phase.kind === 'empty' ? (
          <DropZone
            variant="hero"
            icon={IconFileText}
            title="Open a PDF"
            hint="Drop a file here or choose one"
            chooseLabel="Choose file"
            accept=".pdf,application/pdf"
            onFiles={onFiles}
          />
        ) : null}
        <div aria-live="polite">{body}</div>
        {phase.kind === 'empty' && recent.docs?.length ? (
          <RecentDocuments
            docs={recent.docs}
            onOpen={onRestore}
            onRemove={(id) => void recent.remove(id)}
          />
        ) : null}
      </div>
      <DropZone
        variant="fullscreen"
        active={dragging}
        title="Drop to open"
        onFiles={onFiles}
      />
    </AppShell>
  );
}

/** Mod+O opens the file chooser. */
function ChooseShortcut({ open }: { open(): void }) {
  useShortcuts(
    [
      {
        id: 'workspace-open-file',
        combo: 'Mod+O',
        description: 'Open a file',
        group: 'Workspace',
        allowInFields: true,
        run: open,
      },
    ],
    [open],
  );
  return null;
}
