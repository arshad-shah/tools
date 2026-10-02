import { useContext, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import {
  FloatingPalette,
  Toolbar,
  useDockedBarOpen,
  type ToolGroup,
} from '@/shared/ui';
import { ModeToolbarContext } from './mode-toolbar-context';

/**
 * What a mode's Toolbar component renders: the same groups become the
 * Standard toolbar, the Focus floating palette, or the phone's bar above
 * the dock (spec §6.1).
 */
export function ModeToolbar({
  groups,
  trailing,
}: {
  groups: ToolGroup[];
  /** Status after the tools (Standard and phone toolbars only). */
  trailing?: ReactNode;
}) {
  const s = useContext(ModeToolbarContext);
  // A contextual bar docked at the bottom (phone) takes this place.
  const away = useDockedBarOpen();
  if (s.layout === 'focus')
    return (
      <FloatingPalette
        label={s.label}
        groups={groups}
        side={s.palette}
        size="lg"
        onSideChange={s.onPaletteChange}
      />
    );
  if (s.layout === 'phone')
    return (
      <div
        inert={away}
        className={cn(
          'fixed inset-x-2 bottom-20 z-toolbar flex justify-center',
          away && 'invisible',
        )}
      >
        <div className="max-w-full overflow-x-auto rounded-xl bg-surface p-1 shadow-e3">
          <Toolbar
            label={s.label}
            groups={groups}
            size="lg"
            trailing={trailing}
          />
        </div>
      </div>
    );
  return <Toolbar label={s.label} groups={groups} trailing={trailing} />;
}
