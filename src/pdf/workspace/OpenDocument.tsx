import { AppShell, Container, FileDrop, Stack } from '@arshad-shah/cynosure';
import { PageHeader } from '@arshad-shah/cynosure';
import type { ReactNode } from 'react';
import { useShortcuts } from '@/shared/lib/hotkeys';
import { PasswordForm } from '@/pdf/ui/PasswordForm';
import { RecentDocuments } from './RecentDocuments';
import { FilePicker } from './ui/FilePicker';
import { ErrorNotice, LoadingLine } from './ui/states';
import { useRecentDocuments } from './use-recent-documents';
import type { WorkspacePhase } from './use-workspace-document';

export interface OpenDocumentProps {
  phase: Exclude<WorkspacePhase, { kind: 'ready' }>;
  /** The header's breadcrumbs (pdf, edit). */
  breadcrumb: ReactNode;
  onFiles(files: File[]): void;
  onRestore(id: string): void;
  onPassword(password: string): void;
  onRepair(): void;
  onReset(): void;
}

const ACCEPT = '.pdf,application/pdf';

/**
 * The workspace before a document is open: a window-wide FileDrop, recent
 * documents, and the opening, password and error states next to it.
 */
export function OpenDocument({
  phase,
  breadcrumb,
  onFiles,
  onRestore,
  onPassword,
  onRepair,
  onReset,
}: OpenDocumentProps) {
  const recent = useRecentDocuments();

  let body: ReactNode = null;
  if (phase.kind === 'opening')
    body = <LoadingLine label={`Opening ${phase.name}`} />;
  else if (phase.kind === 'locked')
    body = (
      <PasswordForm
        fileName={phase.file.name}
        error={phase.error}
        busy={phase.busy}
        onSubmit={onPassword}
        onCancel={onReset}
        submitLabel="Open"
      />
    );
  else if (phase.kind === 'error') {
    const repairable = phase.error.code === 'INVALID_FILE' && !!phase.file;
    const crashed = phase.error.code === 'WORKER_CRASHED';
    body = (
      <ErrorNotice
        error={phase.error}
        actions={[
          ...(repairable
            ? [{ label: 'Try to repair', onClick: onRepair, primary: true }]
            : []),
          crashed
            ? { label: 'Reload', onClick: () => window.location.reload() }
            : { label: 'Choose another file', onClick: onReset },
        ]}
      />
    );
  }

  return (
    <AppShell header={breadcrumb}>
      <Container size="md" paddingBlock="8">
        <Stack gap="7">
          <PageHeader
            title="PDF workspace"
            description="Organise, edit, sign and export a PDF. It stays in your browser."
          />
          {phase.kind === 'empty' ? (
            <FileDrop
              size="lg"
              target="window"
              accept={ACCEPT}
              hint="Files stay on this device."
              labels={{ prompt: 'Drop a PDF here, or' }}
              onFiles={(files) => files.length && onFiles(files)}
            />
          ) : null}
          {body}
          {phase.kind === 'empty' && recent.docs?.length ? (
            <RecentDocuments
              docs={recent.docs}
              onOpen={onRestore}
              onRemove={(id) => void recent.remove(id)}
            />
          ) : null}
        </Stack>
      </Container>
      <FilePicker onFiles={onFiles} accept={ACCEPT}>
        {(open) => <ChooseShortcut open={open} />}
      </FilePicker>
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
