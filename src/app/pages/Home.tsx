import {
  Button,
  Card,
  Container,
  EmptyState,
  Grid,
  Heading,
  IconTile,
  Inline,
  Kbd,
  Link,
  PageHeader,
  SearchField,
  Section,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import {
  arrowRight,
  filePen,
  search as searchIcon,
} from '@arshad-shah/cynosure/icons';
import { useMemo, useRef, useState } from 'react';
import { useShortcuts } from '@/shared/lib/hotkeys';
import { CATEGORIES, getCategory, type CategoryDef } from '../categories';
import { routePdfHubDrop } from '../drop-routing';
import { getEnabledTools, TOOLS } from '../registry';
import { categoryPath } from '../routes';
import type { ToolManifest } from '../tool';
import { categoryGlyph } from '../ui/glyphs';
import { ToolCard } from '../ui/ToolCard';
import { HubDropZone } from './hub/HubDropZone';
import { PickUp } from './home/PickUp';
import { toolMatches } from './home/tool-matches';

function CategorySection({
  category,
  tools,
  query,
}: {
  category: CategoryDef;
  tools: ToolManifest[];
  query: string;
}) {
  const id = `home-category-${category.id}`;
  return (
    <Section
      contained={false}
      paddingBlock="0"
      aria-labelledby={id}
      id={`category-${category.id}`}
    >
      <Stack gap="5">
        <Inline gap="4" align="center" justify="between" wrap>
          <Inline gap="4" align="center">
            <IconTile
              icon={categoryGlyph(category.id)}
              size="sm"
              tone="neutral"
            />
            <Heading level={2} size="lg" id={id}>
              {category.label}
            </Heading>
            <Text size="sm" tone="muted">
              {tools.length} {tools.length === 1 ? 'tool' : 'tools'}
            </Text>
          </Inline>
          {query ? null : (
            <Link href={categoryPath(category.id)} size="sm" underline="hover">
              Open {category.label}
            </Link>
          )}
        </Inline>
        <Grid minItemWidth="15rem" columns={4} gap="5">
          {tools.map((t) => (
            <ToolCard key={t.id} tool={t} query={query || undefined} />
          ))}
        </Grid>
      </Stack>
    </Section>
  );
}

/**
 * Home (redesign spec, Pages): a search that filters every tool live, what
 * you used last, the PDF workspace drop and all tools by category.
 */
export default function Home() {
  const [query, setQuery] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const tools = getEnabledTools();
  const pdf = getCategory('pdf');

  // "/" puts the cursor in the search field (never while typing).
  useShortcuts(
    [
      {
        id: 'home-search',
        combo: '/',
        description: 'Search tools',
        group: 'General',
        run: (e) => {
          e.preventDefault();
          field.current?.focus();
        },
      },
    ],
    [],
  );

  const groups = useMemo(
    () =>
      [...CATEGORIES]
        .sort((a, b) => a.order - b.order)
        .map((c) => ({
          category: c as CategoryDef,
          tools: tools
            .filter((t) => t.category === c.id && toolMatches(t, query))
            .sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .filter((g) => g.tools.length > 0),
    [tools, query],
  );
  const matches = groups.reduce((n, g) => n + g.tools.length, 0);
  const searching = query.trim() !== '';

  return (
    <Container size="xl" paddingBlock="9">
      <Stack gap="10">
        <PageHeader
          size="lg"
          title="Private tools that run in your browser"
          description="Nothing you open is uploaded: every tool works on this device, offline too."
        >
          <Stack gap="3">
            <SearchField
              ref={field}
              size="lg"
              label="Search tools"
              labelHidden
              placeholder={`Search ${tools.length} tools`}
              value={query}
              onChange={setQuery}
              trailing={searching ? `${matches} of ${tools.length}` : undefined}
            />
            <Inline gap="2" align="center" wrap>
              <Text size="sm" tone="muted">
                Press
              </Text>
              <Kbd keys="mod+k" size="sm" />
              <Text size="sm" tone="muted">
                on any page to search tools and actions.
              </Text>
            </Inline>
          </Stack>
        </PageHeader>

        {searching ? null : <PickUp />}

        {searching || !pdf ? null : (
          <Card padding="lg" as="section" aria-label="PDF workspace">
            <Stack gap="6">
              <Inline gap="5" align="start" justify="between" wrap>
                <Inline gap="5" align="start">
                  <IconTile icon={filePen} size="lg" />
                  <Stack gap="2">
                    <Heading level={2} size="lg">
                      PDF workspace
                    </Heading>
                    <Text tone="muted">
                      Drop one PDF to edit, sign or redact it. Drop several to
                      merge them, or images to make a PDF.
                    </Text>
                  </Stack>
                </Inline>
                <Button href="/pdf" variant="ghost" iconEnd={arrowRight}>
                  All PDF tools
                </Button>
              </Inline>
              <HubDropZone
                category={pdf}
                size="lg"
                prompt="Drop PDFs or images here, or"
                route={(files) => routePdfHubDrop(files, TOOLS)}
              />
            </Stack>
          </Card>
        )}

        <Stack as="section" gap="9" aria-labelledby="home-all-tools">
          <Heading level={2} size="xl" id="home-all-tools">
            {searching ? 'Matching tools' : 'All tools'}
          </Heading>
          {groups.length ? (
            groups.map((g) => (
              <CategorySection
                key={g.category.id}
                category={g.category}
                tools={g.tools}
                query={query.trim()}
              />
            ))
          ) : (
            <EmptyState
              icon={searchIcon}
              title={`No tools match "${query.trim()}"`}
              description="Try another word, such as pdf, json or colour."
              actions={
                <Button variant="soft" onClick={() => setQuery('')}>
                  Clear search
                </Button>
              }
            />
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
