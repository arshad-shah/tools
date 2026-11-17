import { createTheme, type ThemeInput } from '@arshad-shah/cynosure';

/** The saved colour mode (`system | light | dark`), shared with public/theme-init.js. */
export const THEME_KEY = 'tools:theme';

export const TOOLS_ACCENT = '#3ddc97';

/**
 * Cynosure's own font, Hanken Grotesk, self-hosted by the package
 * (`@arshad-shah/cynosure/fonts/hanken.css`, imported in app.css).
 */
const HANKEN =
  '"Hanken Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * The tools theme (redesign spec, rule 4): Cynosure's own palette, type
 * scale and spacing from the tools accent. Nothing else is overridden.
 */
export const TOOLS_THEME_INPUT: ThemeInput = {
  accent: TOOLS_ACCENT,
  font: { sans: HANKEN, display: HANKEN },
};

export const toolsTheme = createTheme(TOOLS_THEME_INPUT);
