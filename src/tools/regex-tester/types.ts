export type TemplateCategory = 'web' | 'validation' | 'format' | 'common';

export interface RegexTemplate {
  name: string;
  pattern: string;
  description: string;
  category: TemplateCategory;
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
