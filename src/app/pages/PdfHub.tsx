import { ToolCard } from '@/shared/ui';
import { MODES } from '@/pdf/workspace/modes/registry';
import { getCategory } from '../categories';
import { routePdfHubDrop } from '../drop-routing';
import { TOOLS } from '../registry';
import { routerLink } from '../shell/router-link';
import { Hub } from './Hub';

/**
 * PDF hub (spec §5.3): one dropped PDF opens the workspace, several merge,
 * images become a PDF; the workspace modes are listed as entry points.
 */
export function PdfHub() {
  const pdf = getCategory('pdf');
  if (!pdf) throw new Error('The pdf category is missing');
  return (
    <Hub
      category={pdf}
      route={(files) => routePdfHubDrop(files, TOOLS)}
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
