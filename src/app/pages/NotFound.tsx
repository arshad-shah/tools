import {
  Button,
  Container,
  EmptyState,
  Grid,
  Heading,
  SearchField,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { home, signpost } from '@arshad-shah/cynosure/icons';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { rankCommands } from '@/shared/lib/fuzzy';
import { CATEGORIES } from '../categories';
import { getEnabledTools } from '../registry';
import { categoryPath } from '../routes';
import { useBreadcrumb } from '../shell/breadcrumb';
import { LinkCard, ToolCard } from '../ui/ToolCard';

/** Unknown path (spec §3.2): says so, offers search and the categories. Never redirects. */
export default function NotFound() {
  const { pathname } = useLocation();
  const [query, setQuery] = useState('');
  useBreadcrumb([{ label: 'Not found' }]);
  const tools = getEnabledTools();
  const results = useMemo(
    () =>
      query.trim()
        ? rankCommands(
            query,
            tools.map((t) => ({
              tool: t,
              label: t.name,
              keywords: [...t.keywords, t.category],
            })),
            8,
          ).map((r) => r.tool)
        : [],
    [query, tools],
  );

  return (
    <Container size="lg" paddingBlock="10">
      <Stack gap="9">
        <EmptyState
          headingLevel={1}
          icon={signpost}
          title="This page does not exist"
          description={
            <>
              There is no page at <Text variant="code">{pathname}</Text>. Tools
              moved to category paths: search for the one you need.
            </>
          }
          actions={
            <Button href="/" variant="soft" icon={home}>
              Go to Home
            </Button>
          }
        />
        <Stack gap="6" align="stretch">
          <SearchField
            size="lg"
            label="Search tools"
            labelHidden
            placeholder="Search tools"
            value={query}
            onChange={setQuery}
          />
          {query.trim() ? (
            <Stack as="section" gap="5" aria-label="Search results">
              {results.length ? (
                <Grid minItemWidth="15rem" columns={4} gap="5">
                  {results.map((t) => (
                    <ToolCard key={t.id} tool={t} />
                  ))}
                </Grid>
              ) : (
                <Text tone="muted">
                  No tools match &quot;{query.trim()}&quot;.
                </Text>
              )}
            </Stack>
          ) : null}
        </Stack>
        <Stack as="section" gap="5" aria-labelledby="notfound-categories">
          <Heading level={2} size="lg" id="notfound-categories">
            Categories
          </Heading>
          <Grid minItemWidth="15rem" columns={4} gap="5">
            {CATEGORIES.map((c) => (
              <LinkCard
                key={c.id}
                href={categoryPath(c.id)}
                icon={c.icon}
                title={c.label}
                description={c.blurb}
              />
            ))}
          </Grid>
        </Stack>
      </Stack>
    </Container>
  );
}
