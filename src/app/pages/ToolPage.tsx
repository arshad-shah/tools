import {
  Badge,
  Button,
  Container,
  ErrorBoundary,
  IconTile,
  Inline,
  LoadingDots,
  Notice,
  PageHeader,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { home, retry as retryIcon } from '@arshad-shah/cynosure/icons';
import React, { Suspense, useState } from 'react';
import { ToolActionsSlot } from '@/shared/lib/tool-actions-slot';
import { getCategory } from '../categories';
import { categoryPath } from '../routes';
import { useBreadcrumb } from '../shell/breadcrumb';
import type { ToolManifest } from '../tool';
import { FavouriteToggle } from '../ui/ToolCard';

export interface ToolPageProps {
  tool: ToolManifest;
  /** The tool, usually `<LazyTool definition={tool} />`. */
  children: React.ReactNode;
}

/**
 * Frame for every tool page (redesign spec, Pages): a PageHeader with the
 * tool's icon, name and description, its actions (the favourite star and
 * whatever the tool puts in ToolActionsSlot, such as Send to), then the
 * tool inside an error boundary and a loading state.
 */
export function ToolPage({ tool, children }: ToolPageProps) {
  // Bumped on retry to remount the tool.
  const [attempt, setAttempt] = useState(0);
  // Where tools put their page-level actions (ToolActions, Send to).
  const [actions, setActions] = useState<HTMLElement | null>(null);
  const category = getCategory(tool.category);
  useBreadcrumb([
    {
      label: category?.label ?? tool.category,
      href: categoryPath(tool.category),
    },
    { label: tool.name },
  ]);

  return (
    <Container size="lg" paddingBlock="8">
      <Stack gap="8">
        <Inline gap="6" align="start">
          {/* Phones: the title takes the full width. */}
          <Stack hideBelow="md">
            <IconTile icon={tool.icon} size="lg" />
          </Stack>
          <PageHeader
            title={tool.name}
            description={tool.description}
            meta={
              tool.isNew ? (
                <Badge tone="accent" size="sm">
                  New
                </Badge>
              ) : undefined
            }
            actions={
              // Tools' own actions (Send to) are portalled in after the star.
              <Inline ref={setActions} gap="2" align="center" wrap>
                <FavouriteToggle tool={tool} />
              </Inline>
            }
          />
        </Inline>
        <ErrorBoundary
          resetKey={attempt}
          label={`${tool.name} stopped working`}
          onError={(error) => console.error(`Error in tool ${tool.id}:`, error)}
          fallback={(error, retry) => (
            <Notice
              tone="danger"
              title={`${tool.name} stopped working`}
              action={
                <Inline gap="2" wrap>
                  <Button
                    size="sm"
                    variant="soft"
                    tone="danger"
                    icon={retryIcon}
                    onClick={() => {
                      setAttempt((a) => a + 1);
                      retry();
                    }}
                  >
                    Try again
                  </Button>
                  <Button size="sm" variant="ghost" href="/" icon={home}>
                    Go to Home
                  </Button>
                </Inline>
              }
            >
              {error.message || 'Something went wrong.'} Your files have not
              left this device.
            </Notice>
          )}
        >
          <Suspense
            fallback={
              <Inline
                gap="4"
                align="center"
                justify="center"
                paddingBlock="10"
                role="status"
              >
                <LoadingDots tone="muted" />
                <Text tone="muted">Loading {tool.name}</Text>
              </Inline>
            }
          >
            <ToolActionsSlot.Provider value={actions}>
              <React.Fragment key={attempt}>{children}</React.Fragment>
            </ToolActionsSlot.Provider>
          </Suspense>
        </ErrorBoundary>
      </Stack>
    </Container>
  );
}
