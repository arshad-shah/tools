import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { putHandoff, HANDOFF_PARAM } from '@/shared/lib/handoff';
import type { ToolError } from '@/shared/lib/errors';
import { IconX } from '@/shared/ui/icons';
import { Alert, AlertDescription, DropZone, IconButton } from '@/shared/ui';
import type { CategoryDef } from '../../categories';
import { routeDrop, type DropDecision } from '../../drop-routing';
import { TOOLS } from '../../registry';
import { ToolChooser } from './ToolChooser';

export interface HubDropZoneProps {
  category: CategoryDef;
  title?: string;
  hint?: string;
}

/**
 * Hub drop target (spec §5.3): one matching tool opens with the files
 * handed off, several offer a chooser, none shows an inline error.
 */
export function HubDropZone({
  category,
  title = 'Drop files to pick a tool',
  hint,
}: HubDropZoneProps) {
  const navigate = useNavigate();
  const anchor = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [choice, setChoice] = useState<Extract<
    DropDecision,
    { type: 'choose' }
  > | null>(null);

  const go = (path: string, files: File[]) =>
    navigate(`${path}?${HANDOFF_PARAM}=${putHandoff(files)}`);

  const onFiles = async (files: File[]) => {
    setError(null);
    setChoice(null);
    const decision = await routeDrop(files, TOOLS, category.id);
    if (decision.type === 'navigate') go(decision.path, decision.files);
    else if (decision.type === 'choose') setChoice(decision);
    else setError(decision.error);
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
