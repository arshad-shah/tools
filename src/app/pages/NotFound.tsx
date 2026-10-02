import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { rankCommands } from '@/shared/lib/fuzzy';
import {
  AutoGrid,
  CategoryCard,
  Code,
  SearchInput,
  ToolCard,
} from '@/shared/ui';
import { CATEGORIES } from '../categories';
import { getEnabledTools } from '../registry';
import { categoryPath, toolPath } from '../routes';
import { useBreadcrumb } from '../shell/breadcrumb';
import { routerLink } from '../shell/router-link';

/** Unknown path (spec §3.2): says so, offers search and categories. Never redirects. */
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
            6,
          ).map((r) => r.tool)
        : [],
    [query, tools],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          No page at <Code>{pathname}</Code>
        </h1>
        <p className="text-base text-fg-muted">
          Tools moved to category paths. Search for the one you need.
        </p>
        <SearchInput
          aria-label="Search tools"
          placeholder="Search tools"
          value={query}
          onChange={setQuery}
          size="lg"
          className="max-w-xl"
        />
      </div>
      {query.trim() ? (
        <section aria-label="Search results" className="flex flex-col gap-3">
          {results.length ? (
            <AutoGrid min={240} gap="3">
              {results.map((t) => (
                <ToolCard
                  key={t.id}
                  href={toolPath(t)}
                  renderLink={routerLink}
                  icon={t.icon}
                  title={t.name}
                  description={t.description}
                />
              ))}
            </AutoGrid>
          ) : (
            <p className="text-sm text-fg-muted">
              No tools match &quot;{query}&quot;.
            </p>
          )}
        </section>
      ) : null}
      <section
        aria-labelledby="notfound-categories"
        className="flex flex-col gap-3"
      >
        <h2 id="notfound-categories" className="text-lg font-semibold text-fg">
          Categories
        </h2>
        <AutoGrid min={240} gap="3">
          {CATEGORIES.map((c) => {
            const inCategory = tools
              .filter((t) => t.category === c.id)
              .sort((a, b) => a.name.localeCompare(b.name));
            return (
              <CategoryCard
                key={c.id}
                href={categoryPath(c.id)}
                renderLink={routerLink}
                icon={c.icon}
                label={c.label}
                count={inCategory.length}
                topTools={inCategory.slice(0, 3).map((t) => t.name)}
              />
            );
          })}
        </AutoGrid>
      </section>
    </div>
  );
}
