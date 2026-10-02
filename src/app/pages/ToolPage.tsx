import React, { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconStar, IconStarFilled } from '@/shared/ui/icons';
import { Badge, IconButton, LoadingState } from '@/shared/ui';
import { getCategory } from '../categories';
import { useFavorites } from '../favorites';
import { categoryPath } from '../routes';
import { useBreadcrumb } from '../shell/breadcrumb';
import type { ToolManifest } from '../tool';
import ToolErrorBoundary from '../ToolErrorBoundary';

export interface ToolPageProps {
  tool: ToolManifest;
  /** The tool, usually `<LazyTool definition={tool} />`. */
  children: React.ReactNode;
}

/**
 * Frame for every tool page (spec §16 step 2): breadcrumb, header with icon,
 * name, description and favourite toggle, then the tool inside an error
 * boundary and a loading state.
 */
export function ToolPage({ tool, children }: ToolPageProps) {
  const navigate = useNavigate();
  const { isFavorite, toggle } = useFavorites();
  // Bumped on retry to remount the tool.
  const [attempt, setAttempt] = useState(0);
  const category = getCategory(tool.category);
  useBreadcrumb([
    {
      label: category?.label ?? tool.category,
      href: categoryPath(tool.category),
    },
    { label: tool.name },
  ]);
  const Icon = tool.icon;
  const favourite = isFavorite(tool.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <header className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface text-accent-fg shadow-e1">
          <Icon size="lg" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              {tool.name}
            </h1>
            {tool.isNew ? (
              <Badge size="xs" tone="accent">
                new
              </Badge>
            ) : null}
          </div>
          <p className="max-w-2xl text-base text-fg-muted">
            {tool.description}
          </p>
        </div>
        <IconButton
          variant="ghost"
          label={`Add ${tool.name} to favourites`}
          aria-pressed={favourite}
          tone={favourite ? 'accent' : undefined}
          icon={favourite ? IconStarFilled : IconStar}
          onClick={() => toggle(tool.id)}
        />
      </header>
      <ToolErrorBoundary
        toolName={tool.name}
        toolId={tool.id}
        onRetry={() => setAttempt((a) => a + 1)}
        onNavigateHome={() => navigate('/')}
      >
        <Suspense fallback={<LoadingState label={`Loading ${tool.name}`} />}>
          <React.Fragment key={attempt}>{children}</React.Fragment>
        </Suspense>
      </ToolErrorBoundary>
    </div>
  );
}
