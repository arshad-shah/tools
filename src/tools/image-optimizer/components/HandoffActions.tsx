import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getTool } from '@/app/registry';
import { sendTo } from '@/shared/lib/handoff';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Inline,
  SendToMenu,
} from '@/shared/ui';
import { IconChevronDown, IconExternalLink } from '@/shared/ui/icons';

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

/** "Open in" shortcuts for the media workflows, plus the generic Send to. */
export const HandoffActions: React.FC<HandoffActionsProps> = ({
  outputs,
  originals,
}) => {
  const navigate = useNavigate();
  const targets: Target[] = [
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

  return (
    <Inline gap="2" wrap>
      {targets.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<IconExternalLink size="sm" />}
              rightIcon={<IconChevronDown size="sm" />}
            >
              Open in
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent aria-label="Open in" className="min-w-56">
            {targets.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() =>
                  sendTo(navigate, t.id, {
                    kind: 'files',
                    files: t.files(),
                    sourceTool: TOOL_ID,
                  })
                }
              >
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <SendToMenu
        sourceTool={TOOL_ID}
        payload={() => {
          const files = outputs();
          return files.length
            ? { kind: 'files', files, sourceTool: TOOL_ID }
            : null;
        }}
      />
    </Inline>
  );
};
