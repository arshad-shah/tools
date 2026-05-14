import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, X, Sun, Moon } from 'lucide-react';
import {
  Container,
  Section,
  Stack,
  Inline,
  Grid,
  Heading,
  Text,
  SearchInput,
  Button,
  IconButton,
  Badge,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardTitle,
  CardDescription,
  EmptyState,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateActions,
  useTheme,
} from '@arshad-shah/cynosure-react';
import { getEnabledTools } from '../data/ToolDefinitions';
import { ToolDefinition } from '../types/ToolTypes';
import AnimatedBackground from './AnimatedBackground';
import Footer from './Footer';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dashboard-dark';
  const tools = useMemo<ToolDefinition[]>(() => getEnabledTools(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>([]);

  const categories = useMemo(
    () => [...new Set(tools.map((t) => t.category).filter(Boolean))] as string[],
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
    const matchesCategory = !selectedCategory || tool.category === selectedCategory;
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
      <Card
        key={tool.id}
        variant="elevated"
        size="md"
        interactive
        onClick={() => navigate(`/${tool.id}`)}
      >
        <CardHeader>
          <Inline justify="between" align="start" wrap={false} gap="3">
            <Inline align="center" gap="3" wrap={false}>
              <Icon size={28} aria-hidden />
              <CardTitle as="h3"><Text size="lg">{tool.name}</Text></CardTitle>
            </Inline>
            <IconButton
              variant="ghost"
              colorScheme="neutral"
              size="sm"
              label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              icon={
                <Star
                  size={18}
                  fill={isFavorite ? '#ffa500' : 'none'}
                />
              }
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(tool.id);
              }}
            />
          </Inline>
        </CardHeader>
        <CardBody>
          <CardDescription>{tool.description}</CardDescription>
        </CardBody>
        {(tool.version || tool.isNew) && (
          <CardFooter>
            <Inline gap="2" align="center">
              {tool.isNew && (
                <Badge variant="solid" colorScheme="success" size="sm" shape="pill">
                  New
                </Badge>
              )}
              {tool.version && (
                <Badge variant="soft" colorScheme="neutral" size="sm">
                  v{tool.version}
                </Badge>
              )}
              <Badge variant="outline" colorScheme="accent" size="sm" shape="pill">
                {tool.category}
              </Badge>
            </Inline>
          </CardFooter>
        )}
      </Card>
    );
  };

  return (
    <>
      <AnimatedBackground />
      <Section as="main" space="lg" padding="12">
        <Container size="xl">
          <Stack gap="8">
            <Inline justify="between" align="start" gap="4" wrap={false}>
              <Stack gap="3">
                <Heading level={1} size="4xl" weight="bold">
                  Tools Dashboard
                </Heading>
                <Text size="lg" variant="lead">
                  A curated collection of essential development utilities and
                  productivity tools.
                </Text>
              </Stack>
              <IconButton
                variant="soft"
                colorScheme="neutral"
                size="md"
                shape="pill"
                label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
                onClick={() => setTheme(isDark ? 'dashboard-light' : 'dashboard-dark')}
              />
            </Inline>

          <Card variant="filled" size="md">
            <CardBody>
              <Stack gap="4">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={setSearchQuery}
                  placeholder="Search tools..."
                  size="lg"
                />
                {categories.length > 0 && (
                  <Inline gap="2" wrap>
                    <Button
                      size="sm"
                      variant={!selectedCategory ? 'solid' : 'soft'}
                      colorScheme={!selectedCategory ? 'accent' : 'neutral'}
                      shape="pill"
                      onClick={() => setSelectedCategory('')}
                    >
                      All
                    </Button>
                    {categories.map((category) => (
                      <Button
                        key={category}
                        size="sm"
                        variant={selectedCategory === category ? 'solid' : 'soft'}
                        colorScheme={
                          selectedCategory === category ? 'accent' : 'neutral'
                        }
                        shape="pill"
                        onClick={() => setSelectedCategory(category)}
                      >
                        {category}
                      </Button>
                    ))}
                  </Inline>
                )}
              </Stack>
            </CardBody>
          </Card>

          {favoriteTools.length > 0 && (
            <Stack gap="4">
              <Inline align="center" gap="2">
                <Star size={20} aria-hidden color="#ffa500" fill="#ffa500"/>
                <Heading level={2} size="xl" weight="semibold">
                  Favorites
                </Heading>
                <Badge variant="soft" colorScheme="warning" size="sm">
                  {favoriteTools.length}
                </Badge>
              </Inline>
              <Grid columns={{ base: 1, md: 2, lg: 3 }} gap="5" padding="8">
                {favoriteTools.map(renderToolCard)}
              </Grid>
            </Stack>
          )}

          <Stack gap="4">
            <Inline align="center" gap="2">
              <Heading level={2} size="xl" weight="semibold">
                {selectedCategory || 'All Tools'}
              </Heading>
              {filteredTools.length > 0 && (
                <Badge variant="soft" colorScheme="neutral" size="sm">
                  {filteredTools.length}
                </Badge>
              )}
            </Inline>

            {filteredTools.length > 0 ? (
              <Grid columns={{ base: 1, md: 2, lg: 3 }} gap="5">
                {filteredTools.map(renderToolCard)}
              </Grid>
            ) : (
              <EmptyState size="lg">
                <EmptyStateTitle>No tools found</EmptyStateTitle>
                <EmptyStateDescription>
                  Try adjusting your search or selecting a different category.
                </EmptyStateDescription>
                <EmptyStateActions>
                  <Button
                    variant="solid"
                    colorScheme="accent"
                    leftIcon={<X size={16} />}
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
