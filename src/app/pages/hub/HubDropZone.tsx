import {
  Button,
  Dialog,
  FileDrop,
  IconTile,
  ListRow,
  ListRows,
  Notice,
  Stack,
} from '@arshad-shah/cynosure';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { putHandoff, HANDOFF_PARAM } from '@/shared/lib/handoff';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import type { CategoryDef } from '../../categories';
import { routeDrop, type DropDecision } from '../../drop-routing';
import { TOOLS } from '../../registry';
import { toolGlyph } from '../../ui/glyphs';
import { imagesAsPdfs } from './images-as-pdfs';

export interface HubDropZoneProps {
  category: CategoryDef;
  /** The zone's prompt. */
  prompt?: string;
  hint?: string;
  size?: 'md' | 'lg';
  /** Hub-specific routing (the PDF hub); default: match tools' accepts rules. */
  route?: (files: File[]) => Promise<DropDecision>;
}

type Choice = Extract<DropDecision, { type: 'choose' }>;
type Merge = Extract<DropDecision, { type: 'confirm-merge' }>;

/**
 * Drop files to open the right tool (spec §5.3, existing drop routing):
 * one matching tool opens with the files handed off, several offer a
 * choice, none says why next to the zone.
 */
export function HubDropZone({
  category,
  prompt = 'Drop files here to pick a tool, or',
  hint,
  size = 'md',
  route = (files) => routeDrop(files, TOOLS, category.id),
}: HubDropZoneProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<ToolError | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [merge, setMerge] = useState<Merge | null>(null);
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
    <Stack gap="4">
      <FileDrop
        multiple
        size={size}
        hint={hint ?? 'Files stay on this device'}
        labels={{ prompt }}
        onFiles={(files) => void onFiles(files)}
      />
      {error ? (
        <Notice tone="danger" dismissible onDismiss={() => setError(null)}>
          {error.message}
        </Notice>
      ) : null}
      <Dialog
        open={choice !== null}
        onOpenChange={(o) => !o && setChoice(null)}
        title="Choose a tool for these files"
        description="More than one tool takes them."
        size="sm"
      >
        <ListRows label="Tools">
          {(choice?.options ?? []).map(({ tool, path }) => (
            <ListRow
              key={tool.id}
              label={tool.name}
              description={tool.description}
              leading={<IconTile icon={toolGlyph(tool.id)} size="sm" />}
              onClick={() => {
                const files = choice?.files ?? [];
                setChoice(null);
                go(path, files);
              }}
            />
          ))}
        </ListRows>
      </Dialog>
      <Dialog
        open={merge !== null}
        onOpenChange={(o) => !o && setMerge(null)}
        title="PDFs and images"
        description={merge?.message}
        size="sm"
        actions={
          <>
            <Button variant="ghost" onClick={() => setMerge(null)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              tone="accent"
              loading={busy}
              onClick={() => void convertAndMerge()}
            >
              Convert and merge
            </Button>
          </>
        }
      />
    </Stack>
  );
}
