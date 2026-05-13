import React, { Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
  Spinner,
} from '@arshad-shah/cynosure-react';
import { ToolComponent, ToolDefinition } from '../types/ToolTypes';
import ToolErrorBoundary from './ToolErrorBoundary';

interface ToolLayoutProps {
  definition: ToolDefinition;
  ToolComponent: React.LazyExoticComponent<ToolComponent> | ToolComponent;
}

const ToolLoadingFallback: React.FC<{ definition: ToolDefinition }> = ({
  definition,
}) => (
  <Center style={{ minHeight: '40vh' }}>
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
  const [key, setKey] = useState<number>(Date.now());

  const handleRetry = () => setKey(Date.now());
  const handleNavigateHome = () => navigate('/');
  const versionBadge = getVersionBadge(definition);
  const Icon = definition.icon;

  return (
    <Box as="div" style={{ minHeight: '100vh' }}>
      <Box
        as="header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--cyn-color-border-subtle, rgba(255,255,255,0.08))',
          background: 'var(--cyn-color-bg-surface, rgba(15,23,42,0.7))',
        }}
      >
        <Container size="xl" paddingY="3">
          <Inline justify="between" align="center" gap="4" wrap>
            <Inline align="center" gap="4" wrap={false}>
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
              <Inline align="center" gap="3" wrap={false}>
                <Icon size={28} aria-hidden />
                <Stack gap="1">
                  <Inline align="center" gap="2" wrap>
                    <Heading level={1} size="lg" weight="bold">
                      {definition.name}
                    </Heading>
                    {definition.category && (
                      <Badge variant="soft" colorScheme="neutral" size="sm" shape="pill">
                        {definition.category}
                      </Badge>
                    )}
                    {versionBadge && (
                      <Badge
                        variant="soft"
                        colorScheme={versionBadge.colorScheme}
                        size="sm"
                      >
                        {versionBadge.label}
                      </Badge>
                    )}
                    {!definition.enabled && (
                      <Badge variant="outline" colorScheme="warning" size="sm">
                        Coming soon
                      </Badge>
                    )}
                  </Inline>
                </Stack>
              </Inline>
            </Inline>
            <Box style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
              <Text size="sm" variant="caption" truncate>
                {definition.description}
              </Text>
            </Box>
          </Inline>
        </Container>
      </Box>

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
    </Box>
  );
};

export default ToolLayout;
