import {
  Container,
  Grid,
  Heading,
  IconTile,
  Inline,
  PageHeader,
  Section,
  Stack,
} from '@arshad-shah/cynosure';
import type React from 'react';
import { getCategory, type CategoryDef } from '../categories';
import { hubTools } from '../drop-routing';
import { TOOLS } from '../registry';
import { useBreadcrumb } from '../shell/breadcrumb';
import type { ToolManifest } from '../tool';
import { categoryGlyph } from '../ui/glyphs';
import { ToolCard } from '../ui/ToolCard';
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
      label: groups.length ? 'Other tools' : 'Tools',
      tools: rest,
    });
  return groups.filter((g) => g.tools.length);
}

export interface HubProps {
  category: CategoryDef;
  /** Hub-specific drop routing (the PDF hub). */
  route?: HubDropZoneProps['route'];
  /** Shown under the drop zone (the PDF hub's detected-document card). */
  dropAddon?: React.ReactNode;
  /** Extra card groups after the tool groups (the PDF hub's workspace modes). */
  extraGroups?: { id: string; label: string; children: React.ReactNode[] }[];
}

function Group({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  const heading = `hub-group-${id}`;
  return (
    <Section contained={false} paddingBlock="0" aria-labelledby={heading}>
      <Stack gap="5">
        <Heading level={2} size="lg" id={heading}>
          {label}
        </Heading>
        <Grid minItemWidth="15rem" columns={4} gap="5">
          {children}
        </Grid>
      </Stack>
    </Section>
  );
}

/** One layout for every category hub (redesign spec, Pages). */
export function Hub({
  category,
  route,
  dropAddon,
  extraGroups = [],
}: HubProps) {
  useBreadcrumb([{ label: category.label }]);
  const groups = groupTools(category, hubTools(TOOLS, category.id));
  return (
    <Container size="xl" paddingBlock="9">
      <Stack gap="9">
        <Inline gap="6" align="start">
          <IconTile icon={categoryGlyph(category.id)} size="lg" />
          <PageHeader title={category.label} description={category.blurb} />
        </Inline>
        {category.fileBased ? (
          <Stack gap="5">
            <HubDropZone category={category} route={route} />
            {dropAddon}
          </Stack>
        ) : null}
        {groups.map((g) => (
          <Group key={g.id} id={g.id} label={g.label}>
            {g.tools.map((t) => (
              <ToolCard
                key={t.id}
                tool={t}
                tag={
                  t.category === category.id
                    ? undefined
                    : (getCategory(t.category)?.label ?? t.category)
                }
              />
            ))}
          </Group>
        ))}
        {extraGroups.map((g) => (
          <Group key={g.id} id={g.id} label={g.label}>
            {g.children}
          </Group>
        ))}
      </Stack>
    </Container>
  );
}
