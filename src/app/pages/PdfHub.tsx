import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToolCard } from '@/shared/ui';
import { pdfRender } from '@/pdf/render';
import { qpdf } from '@/pdf/qpdf/client';
import { MODES } from '@/pdf/workspace/modes/registry';
import { getCategory } from '../categories';
import { routePdfHubDrop } from '../drop-routing';
import { TOOLS } from '../registry';
import { routerLink } from '../shell/router-link';
import { Hub } from './Hub';
import { DetectedDocumentCard } from './pdf-hub/DetectedDocumentCard';

/**
 * PDF hub (spec §5.3): one dropped PDF opens the workspace, several merge,
 * images become a PDF; the workspace modes are listed as entry points.
 */
export function PdfHub() {
  const navigate = useNavigate();
  const [dropped, setDropped] = useState<{
    key: number;
    name: string;
    bytes: Uint8Array;
  } | null>(null);
  const pdf = getCategory('pdf');
  if (!pdf) throw new Error('The pdf category is missing');
  return (
    <Hub
      category={pdf}
      route={async (files) => {
        const decision = await routePdfHubDrop(files, TOOLS);
        // One PDF: show what it is before opening it (spec §5.3).
        if (decision.type !== 'navigate' || decision.tool.id !== 'pdf-edit')
          return decision;
        const [file] = decision.files;
        setDropped({
          key: Date.now(),
          name: file.name,
          bytes: new Uint8Array(await file.arrayBuffer()),
        });
        return { type: 'handled' };
      }}
      dropAddon={
        dropped ? (
          <DetectedDocumentCard
            key={dropped.key}
            file={dropped}
            render={pdfRender}
            qpdf={qpdf}
            onNavigate={(path) => navigate(path)}
            onDismiss={() => setDropped(null)}
          />
        ) : null
      }
      extraGroups={
        MODES.length === 0
          ? []
          : [
              {
                id: 'workspace-modes',
                label: 'Workspace modes',
                children: MODES.map((m) => (
                  <ToolCard
                    key={m.id}
                    href={`/pdf/edit/${m.id}`}
                    renderLink={routerLink}
                    icon={m.icon}
                    title={m.label}
                    description={`Open a PDF in the workspace in ${m.label} mode`}
                  />
                )),
              },
            ]
      }
    />
  );
}
