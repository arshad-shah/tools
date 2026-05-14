import React, { Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import {
  Box,
  Container,
  Section,
  Stack,
  Inline,
  Center,
  Heading,
  Text,
  Badge,
  Button,
  IconButton,
  Spinner,
  Divider,
  useTheme,
} from '@arshad-shah/cynosure-react';
import { ToolComponent, ToolDefinition } from '../types/ToolTypes';
import ToolErrorBoundary from './ToolErrorBoundary';
import Footer from './Footer';
import styles from './ToolLayout.module.css';

interface ToolLayoutProps {
  definition: ToolDefinition;
  ToolComponent: React.LazyExoticComponent<ToolComponent> | ToolComponent;
}

const ToolLoadingFallback: React.FC<{ definition: ToolDefinition }> = ({
  definition,
}) => (
  <Center paddingY="10">
    <Stack gap="4" align="center">
      <Spinner size="xl" colorScheme="accent" variant="border" />
      <Text size="md" weight="medium">
        Loading {definition.name}…
      </Text>
    </Stack>
  </Center>
);

const getVersionBadge = (
  definition: ToolDefinition,
): { label: string; colorScheme: 'success' | 'warning' | 'accent' } | null => {
  if (!definition.version) return null;
  const isBeta =
    definition.version.includes('beta') ||
    definition.version.startsWith('0.') ||
    parseFloat(definition.version) < 1;
  if (isBeta) return { label: 'Beta', colorScheme: 'warning' };
  if (definition.isNew) return { label: 'New', colorScheme: 'success' };
  return { label: `v${definition.version}`, colorScheme: 'accent' };
};

const ToolLayout: React.FC<ToolLayoutProps> = ({ definition, ToolComponent }) => {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dashboard-dark';
  const [key, setKey] = useState<number>(Date.now());

  const handleRetry = () => setKey(Date.now());
  const handleNavigateHome = () => navigate('/');
  const versionBadge = getVersionBadge(definition);
  const Icon = definition.icon;

  return (
    <Box minHeight="screen">
      <Section as="header" space="sm">
        <Container size="xl">
          <Stack gap="4">
            <Inline justify="between" align="center" gap="4" wrap={false}>
              <Inline align="center" gap="4" wrap={false} className={styles.titleRow}>
                <Button
                  asChild
                  variant="ghost"
                  colorScheme="neutral"
                  size="sm"
                  shape="pill"
                  leftIcon={<ArrowLeft size={16} />}
                  aria-label="Back to tools"
                >
                  <Link to="/">Back</Link>
                </Button>
                <span className={styles.iconTile} aria-hidden>
                  <Icon size={24} />
                </span>
                <Stack gap="1" className={styles.titleBlock}>
                  <Inline justify="start" align="center" gap="2" wrap>
                    <Heading level={1} size="xl" weight="bold">
                      {definition.name}
                    </Heading>
                    {definition.category && (
                      <Badge
                        variant="soft"
                        colorScheme="neutral"
                        size="sm"
                        shape="pill"
                      >
                        {definition.category}
                      </Badge>
                    )}
                    {versionBadge && (
                      <Badge
                        variant="soft"
                        colorScheme={versionBadge.colorScheme}
                        size="sm"
                        shape="pill"
                      >
                        {versionBadge.label}
                      </Badge>
                    )}
                    {!definition.enabled && (
                      <Badge
                        variant="outline"
                        colorScheme="warning"
                        size="sm"
                        shape="pill"
                      >
                        Coming soon
                      </Badge>
                    )}
                  </Inline>
                  <Text size="sm" variant="caption">
                    {definition.description}
                  </Text>
                </Stack>
              </Inline>
              <IconButton
                variant="soft"
                colorScheme="neutral"
                size="sm"
                shape="pill"
                label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                icon={isDark ? <Sun size={16} /> : <Moon size={16} />}
                onClick={() =>
                  setTheme(isDark ? 'dashboard-light' : 'dashboard-dark')
                }
              />
            </Inline>

            <Divider />
          </Stack>
        </Container>
      </Section>

      <Section as="main" space="md">
        <Container size="xl">
          <ToolErrorBoundary
            toolName={definition.name}
            toolId={definition.id}
            onRetry={handleRetry}
            onNavigateHome={handleNavigateHome}
          >
            <Suspense fallback={<ToolLoadingFallback definition={definition} />}>
              {React.isValidElement(ToolComponent) ? (
                ToolComponent
              ) : (
                <ToolComponent key={key} definition={definition} />
              )}
            </Suspense>
          </ToolErrorBoundary>
        </Container>
      </Section>
      <Footer />
    </Box>
  );
};

export default ToolLayout;
