import { useContext } from 'react';
import { FloatingPalette, Toolbar, type ToolGroup } from '@/shared/ui';
import { ModeToolbarContext } from './mode-toolbar-context';

/**
 * What a mode's Toolbar component renders: the same groups become the
 * Standard toolbar, the Focus floating palette, or the phone's bar above
 * the dock (spec §6.1).
 */
export function ModeToolbar({ groups }: { groups: ToolGroup[] }) {
  const s = useContext(ModeToolbarContext);
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
      <div className="fixed inset-x-2 bottom-20 z-toolbar flex justify-center">
        <div className="max-w-full overflow-x-auto rounded-xl bg-surface p-1 shadow-e3">
          <Toolbar label={s.label} groups={groups} size="lg" />
        </div>
      </div>
    );
  return <Toolbar label={s.label} groups={groups} />;
}
