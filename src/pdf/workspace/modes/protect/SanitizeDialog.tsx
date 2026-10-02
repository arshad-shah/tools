import { useEffect, useId, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import { IconSanitize } from '@/shared/ui/icons';
import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ErrorState,
  Inline,
  Label,
  LoadingState,
  Stack,
  Text,
} from '@/shared/ui';
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
  const id = useId();
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
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogHeader>
        <DialogTitle>Sanitise document</DialogTitle>
        <DialogDescription>
          Removes content that can run, hide or leak information. You can undo
          until you export.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-4">
        <Stack gap="2">
          {SANITIZE_KEYS.map((k) => (
            <Inline key={k} gap="2" align="center">
              <Checkbox
                id={`${id}-${k}`}
                checked={chosen[k]}
                onCheckedChange={(v) => setChosen((c) => ({ ...c, [k]: v }))}
              />
              <Label htmlFor={`${id}-${k}`}>{LABELS[k]}</Label>
            </Inline>
          ))}
        </Stack>
        <Text size="sm" tone="muted">
          Page thumbnails and private application data are always removed.
        </Text>
        <section aria-label="Will be removed" className="flex flex-col gap-2">
          <Text size="sm" weight="semibold">
            Will be removed
          </Text>
          {error ? (
            <ErrorState error={error} headingLevel={3} />
          ) : !preview ? (
            <LoadingState label="Checking the document" />
          ) : lines.length ? (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-fg">
              {lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          ) : (
            <Text size="sm" tone="muted">
              Nothing to remove for the chosen items.
            </Text>
          )}
        </section>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={close}>
          Cancel
        </Button>
        <Button
          variant="primary"
          leftIcon={<IconSanitize size="sm" />}
          disabled={nothingChosen || !preview || lines.length === 0}
          onClick={() => void apply()}
        >
          Remove
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
