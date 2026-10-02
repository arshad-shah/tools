import { useCallback } from 'react';
import { createToolSettings } from '@/shared/lib/tool-settings';

/**
 * The last pane per PaneTabs id (a setting, never data; ruling R41). One
 * store for every tool, keyed by the id each PaneTabs passes.
 */
const paneSettings = createToolSettings(
  'pane-tabs',
  { tabs: {} as Record<string, string> },
  { version: 1 },
);

/**
 * The shown pane of the PaneTabs `id`, remembered across visits. `show`
 * switches panes: tools call it after an explicit run or convert so the
 * result is on screen (R41).
 */
export function usePaneTab(id: string, initial: string) {
  const [{ tabs }, update] = paneSettings.useSettings();
  const value = tabs[id] ?? initial;
  const show = useCallback(
    (pane: string) => {
      const current = paneSettings.getSettings().tabs;
      if (current[id] !== pane) update({ tabs: { ...current, [id]: pane } });
    },
    [id, update],
  );
  return { value, show };
}
