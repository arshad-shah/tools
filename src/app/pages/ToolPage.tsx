import React, { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconStar, IconStarFilled } from '@/shared/ui/icons';
import { Badge, IconButton, LoadingState, ToolActionsSlot } from '@/shared/ui';
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
  // Where tools portal their page-level actions (ToolActions).
  const [actions, setActions] = useState<HTMLDivElement | null>(null);
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
      <header className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface text-accent-fg shadow-e1">
          <Icon size="lg" />
        </span>
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
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
        <div className="ms-auto flex shrink-0 items-center gap-2 sm:pt-1">
          <div
            ref={setActions}
            data-tool-actions
            className="flex flex-wrap items-center justify-end gap-2 empty:hidden"
          />
          <IconButton
            variant="ghost"
            label={`Add ${tool.name} to favourites`}
            aria-pressed={favourite}
            tone={favourite ? 'accent' : undefined}
            icon={favourite ? IconStarFilled : IconStar}
            onClick={() => toggle(tool.id)}
          />
        </div>
      </header>
      <ToolErrorBoundary
        toolName={tool.name}
        toolId={tool.id}
        onRetry={() => setAttempt((a) => a + 1)}
        onNavigateHome={() => navigate('/')}
      >
        <Suspense fallback={<LoadingState label={`Loading ${tool.name}`} />}>
          <ToolActionsSlot.Provider value={actions}>
            <React.Fragment key={attempt}>{children}</React.Fragment>
          </ToolActionsSlot.Provider>
        </Suspense>
      </ToolErrorBoundary>
    </div>
  );
}
