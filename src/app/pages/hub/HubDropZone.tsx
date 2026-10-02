import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { putHandoff, HANDOFF_PARAM } from '@/shared/lib/handoff';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { IconX } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropZone,
  IconButton,
} from '@/shared/ui';
import type { CategoryDef } from '../../categories';
import { routeDrop, type DropDecision } from '../../drop-routing';
import { TOOLS } from '../../registry';
import { imagesAsPdfs } from './images-as-pdfs';
import { ToolChooser } from './ToolChooser';

export interface HubDropZoneProps {
  category: CategoryDef;
  title?: string;
  hint?: string;
  /** Hub-specific routing (the PDF hub); default: match tools' accepts rules. */
  route?: (files: File[]) => Promise<DropDecision>;
}

/**
 * Hub drop target (spec §5.3): one matching tool opens with the files
 * handed off, several offer a chooser, none shows an inline error.
 */
export function HubDropZone({
  category,
  title = 'Drop files to pick a tool',
  hint,
  route = (files) => routeDrop(files, TOOLS, category.id),
}: HubDropZoneProps) {
  const navigate = useNavigate();
  const anchor = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [choice, setChoice] = useState<Extract<
    DropDecision,
    { type: 'choose' }
  > | null>(null);
  const [merge, setMerge] = useState<Extract<
    DropDecision,
    { type: 'confirm-merge' }
  > | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (path: string, files: File[]) =>
    navigate(`${path}?${HANDOFF_PARAM}=${putHandoff(files)}`);

  const onFiles = async (files: File[]) => {
    setError(null);
    setChoice(null);
    const decision = await route(files);
    if (decision.type === 'navigate') go(decision.path, decision.files);
    else if (decision.type === 'choose') setChoice(decision);
    else if (decision.type === 'confirm-merge') setMerge(decision);
    else if (decision.type === 'handled') return;
    else setError(decision.error);
  };

  const convertAndMerge = async () => {
    if (!merge) return;
    setBusy(true);
    try {
      go(merge.path, await imagesAsPdfs(merge.files));
    } catch (e) {
      setError(toToolError(e));
    } finally {
      setBusy(false);
      setMerge(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div ref={anchor}>
        <DropZone
          variant="hero"
          title={title}
          hint={hint}
          onFiles={(files) => void onFiles(files)}
        />
      </div>
      <ToolChooser
        open={choice !== null}
        onOpenChange={(open) => !open && setChoice(null)}
        anchor={anchor}
        options={choice?.options ?? []}
        onChoose={(path) => choice && go(path, choice.files)}
      />
      <Dialog open={merge !== null} onOpenChange={(o) => !o && setMerge(null)}>
        <DialogHeader>
          <DialogTitle>PDFs and images</DialogTitle>
          <DialogDescription>{merge?.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setMerge(null)}>
            Cancel
          </Button>
          <Button loading={busy} onClick={() => void convertAndMerge()}>
            Convert and merge
          </Button>
        </DialogFooter>
      </Dialog>
      {error ? (
        <Alert status="danger">
          <div className="flex items-start justify-between gap-3">
            <AlertDescription className="mt-0 text-danger">
              {error.message}
            </AlertDescription>
            <IconButton
              variant="ghost"
              size="sm"
              label="Dismiss"
              icon={IconX}
              onClick={() => setError(null)}
            />
          </div>
        </Alert>
      ) : null}
    </div>
  );
}
