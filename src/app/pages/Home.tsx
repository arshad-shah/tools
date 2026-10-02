import { useShortcuts } from '@/shared/lib/hotkeys';
import { IconFileText, IconSearch } from '@/shared/ui/icons';
import {
  AutoGrid,
  Button,
  CategoryCard,
  ShortcutHint,
  ToolCard,
} from '@/shared/ui';
import { CATEGORIES, getCategory } from '../categories';
import { useFavorites } from '../favorites';
import { getEnabledTools, TOOLS } from '../registry';
import { categoryPath, toolPath } from '../routes';
import { useOpenPalette } from '../shell/palette';
import { routerLink } from '../shell/router-link';
import type { ToolManifest } from '../tool';
import { routePdfHubDrop } from '../drop-routing';
import { HubDropZone } from './hub/HubDropZone';
import { RecentDocuments } from './home/RecentDocuments';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const id = `home-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-lg font-semibold text-fg">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Home (spec §5.2): hero search, PDF drop card, favourites, categories. */
export default function Home() {
  const openPalette = useOpenPalette();
  const { ids, isFavorite, toggle } = useFavorites();
  const tools = getEnabledTools();
  const favourites = ids
    .map((id) => tools.find((t) => t.id === id))
    .filter((t): t is ToolManifest => t !== undefined);
  const pdf = getCategory('pdf');

  // "/" opens search from anywhere on Home except while typing.
  useShortcuts(
    [
      {
        id: 'home-search',
        combo: '/',
        description: 'Search tools',
        group: 'General',
        run: (e) => {
          e.preventDefault();
          openPalette();
        },
      },
    ],
    [openPalette],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 md:px-6">
      <section className="flex flex-col items-start gap-5">
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-fg">
          Free, private tools. Nothing leaves your browser.
        </h1>
        <Button
          variant="secondary"
          size="lg"
          onClick={openPalette}
          className="w-full max-w-xl justify-between bg-surface-2 font-normal text-fg-muted"
          leftIcon={<IconSearch size="md" />}
          rightIcon={<ShortcutHint keys="Mod+K" />}
        >
          <span className="flex-1 text-left">Search tools and actions</span>
        </Button>
      </section>

      {pdf ? (
        <section
          aria-labelledby="home-pdf"
          className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-e1 md:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent-fg">
              <IconFileText size="lg" />
            </span>
            <div className="flex flex-col gap-1">
              <h2 id="home-pdf" className="text-lg font-semibold text-fg">
                PDF workspace
              </h2>
              <p className="text-sm text-fg-muted">{pdf.blurb}</p>
            </div>
          </div>
          <HubDropZone
            category={pdf}
            title="Drop a PDF to start"
            route={(files) => routePdfHubDrop(files, TOOLS)}
          />
        </section>
      ) : null}

      <RecentDocuments />

      {favourites.length ? (
        <Section title="Favourites">
          <AutoGrid min={240} gap="3">
            {favourites.map((t) => (
              <ToolCard
                key={t.id}
                href={toolPath(t)}
                renderLink={routerLink}
                icon={t.icon}
                title={t.name}
                description={t.description}
                favourite={{
                  active: isFavorite(t.id),
                  onToggle: () => toggle(t.id),
                }}
              />
            ))}
          </AutoGrid>
        </Section>
      ) : null}

      <Section title="Categories">
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
      </Section>
    </div>
  );
}
