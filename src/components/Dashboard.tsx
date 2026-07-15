import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import {
  Container,
  Section,
  Stack,
  Inline,
  Grid,
  Text,
  Button,
  SearchInput,
  Badge,
  EmptyState,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateActions,
} from './ui';
import { cn } from '@/lib/utils';
import { getEnabledTools } from '../data/ToolDefinitions';
import { ToolDefinition } from '../types/ToolTypes';
import AnimatedBackground from './AnimatedBackground';
import Footer from './Footer';

/** A mono section label with count and a trailing hairline rule. */
const SectionLabel: React.FC<{
  label: string;
  count: number;
  icon?: React.ReactNode;
}> = ({ label, count, icon }) => (
  <Inline gap="3" align="center">
    {icon}
    <span className="font-mono text-sm font-bold text-fg">{label}</span>
    <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[0.65rem] text-fg-subtle">
      {count}
    </span>
    <span className="h-px flex-1 bg-line" />
  </Inline>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const tools = useMemo<ToolDefinition[]>(() => getEnabledTools(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>([]);

  const categories = useMemo(
    () =>
      [...new Set(tools.map((t) => t.category).filter(Boolean))] as string[],
    [tools],
  );

  useEffect(() => {
    const saved = localStorage.getItem('favoriteTools');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('favoriteTools', JSON.stringify(favorites));
  }, [favorites]);

  const filteredTools = tools.filter((tool) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q);
    const matchesCategory =
      !selectedCategory || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const favoriteTools = tools.filter((t) => favorites.includes(t.id));

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const renderToolCard = (tool: ToolDefinition) => {
    const isFavorite = favorites.includes(tool.id);
    const Icon = tool.icon;
    return (
      <div
        key={tool.id}
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/${tool.id}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/${tool.id}`);
          }
        }}
        className="group flex cursor-pointer flex-col gap-2.5 rounded-lg border border-line bg-surface p-4 transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-accent focus-visible:border-accent"
      >
        <div className="flex items-start justify-between">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-md border border-line-strong bg-surface-subtle text-accent"
          >
            <Icon size={18} />
          </span>
          <button
            type="button"
            aria-label={
              isFavorite ? 'Remove from favorites' : 'Add to favorites'
            }
            aria-pressed={isFavorite}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(tool.id);
            }}
            className={cn(
              'transition-colors',
              isFavorite ? 'text-accent' : 'text-fg-faint hover:text-fg-muted',
            )}
          >
            <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        <h3 className="font-semibold leading-tight text-fg">{tool.name}</h3>
        <p className="text-xs leading-relaxed text-fg-muted">
          {tool.description}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {tool.isNew && (
            <Badge variant="solid" tone="accent" size="sm" mono>
              NEW
            </Badge>
          )}
          <span className="font-mono text-[0.65rem] text-fg-subtle">
            {tool.category}
          </span>
          {tool.version && (
            <span className="font-mono text-[0.65rem] text-fg-faint">
              v{tool.version}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <AnimatedBackground />
      <Section as="main" className="py-12">
        <Container size="xl">
          <Stack gap="8">
            {/* Prompt header */}
            <Stack gap="2">
              <h1 className="flex items-center font-mono text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
                <span className="text-fg-faint">~/</span>tools
                <span
                  aria-hidden
                  className="ml-1 inline-block h-7 w-2.5 animate-caret bg-accent sm:h-8"
                />
              </h1>
              <Text mono size="sm" tone="muted">
                {tools.length} utilities · {categories.join(' / ')}
              </Text>
            </Stack>

            {/* grep search */}
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="grep tools…"
              size="lg"
              aria-label="Search tools"
            />

            {/* Category filter chips */}
            {categories.length > 0 && (
              <Inline gap="2" wrap>
                {['', ...categories].map((category) => {
                  const active = selectedCategory === category;
                  return (
                    <button
                      key={category || 'all'}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        'rounded-md border px-3 py-1.5 font-mono text-xs transition-colors',
                        active
                          ? 'border-accent bg-accent font-bold text-accent-ink'
                          : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                      )}
                    >
                      {category || 'all'}
                    </button>
                  );
                })}
              </Inline>
            )}

            {/* Favorites */}
            {favoriteTools.length > 0 && (
              <Stack gap="4">
                <SectionLabel
                  label="favorites"
                  count={favoriteTools.length}
                  icon={
                    <Star
                      size={15}
                      className="text-accent"
                      fill="currentColor"
                    />
                  }
                />
                <Grid gap="3" max={4}>
                  {favoriteTools.map(renderToolCard)}
                </Grid>
              </Stack>
            )}

            {/* All tools */}
            <Stack gap="4">
              <SectionLabel
                label={selectedCategory || 'all tools'}
                count={filteredTools.length}
              />
              {filteredTools.length > 0 ? (
                <Grid gap="3" max={4}>
                  {filteredTools.map(renderToolCard)}
                </Grid>
              ) : (
                <EmptyState>
                  <EmptyStateTitle>No tools found</EmptyStateTitle>
                  <EmptyStateDescription>
                    Nothing matches that filter. Try a different search or
                    category.
                  </EmptyStateDescription>
                  <EmptyStateActions>
                    <Button
                      variant="solid"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('');
                      }}
                    >
                      Clear filters
                    </Button>
                  </EmptyStateActions>
                </EmptyState>
              )}
            </Stack>
          </Stack>
        </Container>
      </Section>
      <Footer />
    </>
  );
};

export default Dashboard;
