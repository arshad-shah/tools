import React, { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconStar, IconStarFilled } from '@/shared/ui/icons';
import {
  Badge,
  IconButton,
  LoadingState,
  ToolActionsSlot,
  useScrollFade,
} from '@/shared/ui';
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
  // On phones the actions are one row that scrolls; fade the hidden ends.
  useScrollFade(actions);
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
        {/* Phones: title and star, the description, then the page actions
            in one row that scrolls sideways. From sm up: the actions join
            the title line and wrap there when it is short. */}
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2">
            <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-fg">
              {tool.name}
            </h1>
            {tool.isNew ? (
              <Badge size="xs" tone="accent">
                new
              </Badge>
            ) : null}
          </div>
          <IconButton
            variant="ghost"
            label={`Add ${tool.name} to favourites`}
            aria-pressed={favourite}
            tone={favourite ? 'accent' : undefined}
            icon={favourite ? IconStarFilled : IconStar}
            onClick={() => toggle(tool.id)}
            className="col-start-2 row-start-1 shrink-0 sm:col-start-3"
          />
          <p className="col-span-2 row-start-2 max-w-2xl text-base text-fg-muted sm:col-span-3">
            {tool.description}
          </p>
          <div
            ref={setActions}
            data-tool-actions
            className="col-span-2 row-start-3 -mx-1 mt-2 flex min-w-0 items-center gap-1 scroll-fade-x overflow-x-auto px-1 py-1 [scrollbar-width:none] empty:hidden sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mx-0 sm:mt-0 sm:gap-2 sm:flex-wrap sm:justify-end sm:overflow-visible sm:p-0 sm:[mask-image:none] [&>*]:shrink-0"
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
