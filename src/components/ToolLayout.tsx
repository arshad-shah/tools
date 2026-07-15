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
  Divider,
} from './ui';
import { ToolComponent, ToolDefinition } from '../types/ToolTypes';
import ToolErrorBoundary from './ToolErrorBoundary';
import Footer from './Footer';

interface ToolLayoutProps {
  definition: ToolDefinition;
  ToolComponent: React.LazyExoticComponent<ToolComponent> | ToolComponent;
}

const ToolLoadingFallback: React.FC<{ definition: ToolDefinition }> = ({
  definition,
}) => (
  <Center className="py-10">
    <Stack gap="4" align="center">
      <Spinner size="xl" />
      <Text size="md" weight="medium" mono>
        Loading {definition.name}…
      </Text>
    </Stack>
  </Center>
);

type BadgeTone = 'success' | 'warning' | 'accent';
const getVersionBadge = (
  definition: ToolDefinition,
): { label: string; tone: BadgeTone } | null => {
  if (!definition.version) return null;
  const isBeta =
    definition.version.includes('beta') ||
    definition.version.startsWith('0.') ||
    parseFloat(definition.version) < 1;
  if (isBeta) return { label: 'Beta', tone: 'warning' };
  if (definition.isNew) return { label: 'New', tone: 'success' };
  return { label: `v${definition.version}`, tone: 'accent' };
};

const ToolLayout: React.FC<ToolLayoutProps> = ({
  definition,
  ToolComponent,
}) => {
  const navigate = useNavigate();
  const [key, setKey] = useState<number>(Date.now());

  const handleRetry = () => setKey(Date.now());
  const handleNavigateHome = () => navigate('/');
  const versionBadge = getVersionBadge(definition);
  const Icon = definition.icon;

  return (
    <Box className="min-h-screen">
      <Section as="header" className="py-6">
        <Container size="xl">
          <Stack gap="4">
            <Inline justify="between" align="center" gap="4">
              <Inline align="center" gap="4" className="min-w-0">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  leftIcon={<ArrowLeft size={16} />}
                >
                  <Link to="/">Back</Link>
                </Button>
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface-subtle text-accent"
                >
                  <Icon size={22} />
                </span>
                <Stack gap="1" className="min-w-0">
                  <Inline gap="2" wrap>
                    <Heading level={1} size="xl">
                      {definition.name}
                    </Heading>
                    {definition.category && (
                      <Badge variant="soft" tone="neutral" size="sm" mono>
                        {definition.category}
                      </Badge>
                    )}
                    {versionBadge && (
                      <Badge
                        variant="soft"
                        tone={versionBadge.tone}
                        size="sm"
                        mono
                      >
                        {versionBadge.label}
                      </Badge>
                    )}
                    {!definition.enabled && (
                      <Badge variant="outline" tone="warning" size="sm" mono>
                        Coming soon
                      </Badge>
                    )}
                  </Inline>
                  <Text size="sm" tone="muted">
                    {definition.description}
                  </Text>
                </Stack>
              </Inline>
            </Inline>

            <Divider />
          </Stack>
        </Container>
      </Section>

      <Section as="main" className="py-4">
        <Container size="xl">
          <ToolErrorBoundary
            toolName={definition.name}
            toolId={definition.id}
            onRetry={handleRetry}
            onNavigateHome={handleNavigateHome}
          >
            <Suspense
              fallback={<ToolLoadingFallback definition={definition} />}
            >
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
