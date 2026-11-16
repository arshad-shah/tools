import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  List,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { fileClean } from '@arshad-shah/cynosure/icons';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import { ErrorNotice, LoadingLine } from '../../ui/states';
import { SANITIZE_KEYS, type SanitizeParams } from '@/pdf/doc/ops/protect';
import { useWorkspace } from '../../workspace-context';
import type { ModeProps } from '../types';
import {
  openSanitize,
  previewLines,
  sanitizePreview,
  useSanitizeOpen,
  type SanitizePreview,
} from './protect-ui';

const LABELS: Record<keyof SanitizeParams, string> = {
  scripts: 'Scripts and automatic actions',
  attachments: 'Attachments',
  links: 'Links to web pages and other files',
  metadata: 'Document properties',
  hiddenLayers: 'Hidden layers',
};

const DEFAULTS: SanitizeParams = {
  scripts: true,
  attachments: true,
  links: false,
  metadata: false,
  hiddenLayers: true,
};

/**
 * "Sanitise" (Protect mode): five kinds of content with a preview of what
 * each removes, then the `sanitize` checkpoint (undoable until export).
 */
export function SanitizeDialog({ doc }: ModeProps) {
  const open = useSanitizeOpen();
  if (!open) return null;
  return <SanitizeBody doc={doc} />;
}

function SanitizeBody({ doc }: Pick<ModeProps, 'doc'>) {
  const ws = useWorkspace();
  const [chosen, setChosen] = useState<SanitizeParams>(DEFAULTS);
  const [preview, setPreview] = useState<SanitizePreview | null>(null);
  const [error, setError] = useState<ToolError | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    sanitizePreview(ws.session, ctrl.signal).then(
      (p) => !ctrl.signal.aborted && setPreview(p),
      (e) => !ctrl.signal.aborted && setError(toToolError(e)),
    );
    return () => ctrl.abort();
  }, [ws.session]);

  const lines = preview ? previewLines(preview, chosen) : [];
  const nothingChosen = !SANITIZE_KEYS.some((k) => chosen[k]);
  const close = () => openSanitize(false);
  const apply = async () => {
    try {
      const report = await doc.runCheckpoint('sanitize', chosen, {
        title: 'Sanitising',
      });
      if (!report) return;
      notify.success(report.title);
      close();
    } catch (e) {
      setError(toToolError(e));
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && close()}
      title="Sanitise document"
      description="Removes content that can run, hide or leak information. You can undo until you export."
      actions={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="solid"
            tone="accent"
            icon={fileClean}
            disabled={nothingChosen || !preview || lines.length === 0}
            onClick={() => void apply()}
          >
            Remove
          </Button>
        </>
      }
    >
      <Stack gap="5">
        <Stack gap="2">
          {SANITIZE_KEYS.map((k) => (
            <Checkbox
              key={k}
              label={LABELS[k]}
              checked={chosen[k]}
              onChange={(v) => setChosen((c) => ({ ...c, [k]: v }))}
            />
          ))}
          <Text size="sm" tone="muted">
            Page thumbnails and private application data are always removed.
          </Text>
        </Stack>
        <Stack as="section" gap="2" aria-label="Will be removed">
          <Text size="sm" weight="medium">
            Will be removed
          </Text>
          {error ? (
            <ErrorNotice error={error} />
          ) : !preview ? (
            <LoadingLine label="Checking the document" />
          ) : lines.length ? (
            <List size="sm" items={lines.map((l) => ({ id: l, label: l }))} />
          ) : (
            <Text size="sm" tone="muted">
              Nothing to remove for the chosen items.
            </Text>
          )}
        </Stack>
      </Stack>
    </Dialog>
  );
}
