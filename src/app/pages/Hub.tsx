import type React from 'react';
import { HubLayout, ToolCard } from '@/shared/ui';
import type { CategoryDef } from '../categories';
import { hubTools } from '../drop-routing';
import { useFavorites } from '../favorites';
import { TOOLS } from '../registry';
import { toolPath } from '../routes';
import { useBreadcrumb } from '../shell/breadcrumb';
import { routerLink } from '../shell/router-link';
import type { ToolManifest } from '../tool';
import { HubDropZone, type HubDropZoneProps } from './hub/HubDropZone';

/** Tools grouped as the category table says; the rest in a trailing group. */
function groupTools(category: CategoryDef, tools: ToolManifest[]) {
  const byName = [...tools].sort((a, b) => a.name.localeCompare(b.name));
  const placed = new Set<string>();
  const groups = (category.groups ?? []).map((g) => {
    const list = g.toolIds
      .map((id) => byName.find((t) => t.id === id))
      .filter((t): t is ToolManifest => t !== undefined);
    list.forEach((t) => placed.add(t.id));
    return { id: g.id, label: g.label, tools: list };
  });
  const rest = byName.filter((t) => !placed.has(t.id));
  if (rest.length)
    groups.push({
      id: 'tools',
      label: groups.length ? 'Other tools' : '',
      tools: rest,
    });
  return groups.filter((g) => g.tools.length);
}

export interface HubProps {
  category: CategoryDef;
  /** Hub-specific drop routing (the PDF hub). */
  route?: HubDropZoneProps['route'];
  /** Extra card groups after the tool groups (the PDF hub's workspace modes). */
  extraGroups?: { id: string; label: string; children: React.ReactNode[] }[];
}

/** One layout for every category hub (spec §5.3). */
export function Hub({ category, route, extraGroups = [] }: HubProps) {
  const { isFavorite, toggle } = useFavorites();
  useBreadcrumb([{ label: category.label }]);
  const groups = groupTools(category, hubTools(TOOLS, category.id));
  return (
    <HubLayout
      icon={category.icon}
      title={category.label}
      blurb={category.blurb}
      dropZone={
        category.fileBased ? (
          <HubDropZone category={category} route={route} />
        ) : undefined
      }
      groups={[
        ...groups.map((g) => ({
          id: g.id,
          label: g.label || undefined,
          children: g.tools.map((t) => (
            <ToolCard
              key={t.id}
              href={toolPath(t)}
              renderLink={routerLink}
              icon={t.icon}
              title={t.name}
              description={t.description}
              tag={t.category === category.id ? undefined : t.category}
              isNew={t.isNew}
              favourite={{
                active: isFavorite(t.id),
                onToggle: () => toggle(t.id),
              }}
            />
          )),
        })),
        ...extraGroups,
      ]}
    />
  );
}
