import { createToolSettings } from '@/shared/lib/tool-settings';
import { DEFAULT_GRADIENT, DEFAULT_SOLID } from './lib/backgrounds';
import { DEFAULT_THEME } from './lib/themes';

/** Styling only: never the code, its title or the highlighted lines. */
export interface CodeImageSettings {
  language: string;
  theme: string;
  fontSize: number;
  padding: number;
  /** 'gradient' | 'solid' | 'transparent' */
  background: string;
  gradient: string;
  solid: string;
  chrome: boolean;
  lineNumbers: boolean;
  /** 'auto' | 'fixed' */
  widthMode: string;
  width: number;
  /** 'wrap' | 'clip' */
  overflow: string;
  tabSize: number;
  /** 1, 2 or 3 device pixels per CSS pixel in the PNG. */
  scale: number;
}

export const CODE_IMAGE_DEFAULTS: CodeImageSettings = {
  language: 'js',
  theme: DEFAULT_THEME,
  fontSize: 15,
  padding: 48,
  background: 'gradient',
  gradient: DEFAULT_GRADIENT,
  solid: DEFAULT_SOLID,
  chrome: true,
  lineNumbers: true,
  widthMode: 'auto',
  width: 800,
  overflow: 'wrap',
  tabSize: 2,
  scale: 2,
};

export const codeImageSettings = createToolSettings(
  'code-to-image',
  CODE_IMAGE_DEFAULTS,
  { version: 1 },
);

/** The PNG scale, 1 to 3. */
export const readScale = (s: CodeImageSettings): 1 | 2 | 3 =>
  s.scale === 1 || s.scale === 3 ? s.scale : 2;
