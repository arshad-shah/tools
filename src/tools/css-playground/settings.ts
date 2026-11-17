import { createToolSettings } from '@/shared/lib/tool-settings';

export type PreviewDevice = 'fill' | 'phone' | 'tablet' | 'browser';
export type PreviewCanvas = 'light' | 'dark';
export type MarkupSource = 'auto' | 'html';

export interface CssPlaygroundSettings {
  wrap: boolean;
  device: PreviewDevice;
  canvas: PreviewCanvas;
  markup: MarkupSource;
  restructure: boolean;
  forceMediaMerge: boolean;
  keepLicenceComments: boolean;
  indent: 2 | 4;
}

export const CSS_PLAYGROUND_DEFAULTS: CssPlaygroundSettings = {
  wrap: true,
  device: 'fill',
  canvas: 'light',
  markup: 'auto',
  restructure: true,
  forceMediaMerge: false,
  keepLicenceComments: true,
  indent: 2,
};

/** View and optimiser options only: the CSS and HTML are never stored. */
export const cssPlaygroundSettings = createToolSettings<CssPlaygroundSettings>(
  'css-playground',
  CSS_PLAYGROUND_DEFAULTS,
  { version: 1 },
);
