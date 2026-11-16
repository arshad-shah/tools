import {
  swiftChartTheme,
  useCynosureTheme,
  type Theme,
} from '@arshad-shah/cynosure';
import { addTheme } from '@arshad-shah/swift-chart/react';
import { useMemo } from 'react';

const ids = new WeakMap<Theme, number>();
let next = 0;

/**
 * The swift-chart theme name for the Cynosure theme in force: registered
 * with `addTheme(name, swiftChartTheme(theme, palette))`, and registered
 * again under a new name when the theme or the palette (light, dark,
 * contrast) changes, so every chart given the name re-themes.
 */
export function useChartTheme() {
  const { theme, palette, colors } = useCynosureTheme();
  const name = useMemo(() => {
    let id = ids.get(theme);
    if (id === undefined) ids.set(theme, (id = next++));
    const n = `tools-${id}-${palette}`;
    // Registered while rendering, so a chart created by a child's effect
    // already finds it. Registering the same theme again is harmless.
    addTheme(n, swiftChartTheme(theme, palette));
    return n;
  }, [theme, palette]);
  return { name, colors };
}
