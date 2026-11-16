import { Button, Menu } from '@arshad-shah/cynosure';
import { external } from '@arshad-shah/cynosure/icons';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routeDrop } from '@/app/drop-routing';
import { getEnabledTools, getTool } from '@/app/registry';
import { sendTo } from '@/shared/lib/handoff';
import { useSendCommands } from '@/shared/lib/send-commands';

export const TOOL_ID = 'image-optimizer';

export interface HandoffActionsProps {
  /** The compressed files (kept originals included). */
  outputs: () => File[];
  originals: File[];
}

interface Target {
  id: string;
  label: string;
  files: () => File[];
}

/**
 * "Open in": the media workflows first (with what each takes), then every
 * other tool that takes the compressed files.
 */
export function HandoffActions({ outputs, originals }: HandoffActionsProps) {
  const navigate = useNavigate();
  const fixed: Target[] = [
    { id: 'images-to-pdf', label: 'Images to PDF', files: outputs },
    {
      id: 'favicon-generator',
      label: 'Make a favicon',
      files: () => originals.slice(0, 1),
    },
    {
      id: 'exif-tool',
      label: 'View EXIF of originals',
      files: () => originals,
    },
    {
      id: 'color-tester',
      label: 'Extract palette',
      files: () => originals.slice(0, 1),
    },
  ].filter((t) => getTool(t.id)?.enabled);
  // Other tools that take the compressed files (by sniffed kind).
  const [others, setOthers] = useState<Target[]>([]);
  useEffect(() => {
    let live = true;
    const files = outputs();
    if (!files.length) return;
    void routeDrop(files, getEnabledTools()).then((d) => {
      if (!live) return;
      const tools =
        d.type === 'navigate'
          ? [d.tool]
          : d.type === 'choose'
            ? d.options.map((o) => o.tool)
            : [];
      setOthers(
        tools
          .filter((t) => t.id !== TOOL_ID && !fixed.some((f) => f.id === t.id))
          .map((t) => ({ id: t.id, label: t.name, files: outputs })),
      );
    });
    return () => {
      live = false;
    };
    // outputs is a fresh function each render; the files are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originals]);
  const targets = [...fixed, ...others];
  const open = (t: Target) =>
    sendTo(navigate, t.id, {
      kind: 'files',
      files: t.files(),
      sourceTool: TOOL_ID,
    });
  useSendCommands(
    TOOL_ID,
    targets.map((t) => ({ target: t.id, run: () => open(t) })),
  );
  if (!targets.length) return null;
  return (
    <Menu
      label="Open in"
      items={targets.map((t) => ({ value: t.id, label: t.label }))}
      onSelect={(id) => {
        const t = targets.find((x) => x.id === id);
        if (t) open(t);
      }}
      trigger={(props) => (
        <Button {...props} variant="soft" icon={external}>
          Open in
        </Button>
      )}
    />
  );
}
