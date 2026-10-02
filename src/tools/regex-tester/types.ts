export type TemplateCategory = 'web' | 'validation' | 'format' | 'common';

export interface RegexTemplate {
  name: string;
  pattern: string;
  flags: string;
  description: string;
  category: TemplateCategory;
  /** Sample lines; at least one matches. */
  samples: string[];
}

export interface Flags {
  global: boolean;
  ignoreCase: boolean;
  multiline: boolean;
  dotAll: boolean;
  unicode: boolean;
  sticky: boolean;
  hasIndices: boolean;
}
