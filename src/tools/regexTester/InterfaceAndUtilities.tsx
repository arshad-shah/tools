
// Interfaces
export interface RegexTemplate {
  name: string;
  pattern: string;
  description: string;
  category: 'web' | 'validation' | 'format' | 'common';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface Match {
  text: string;
  index: number;
  length: number;
  groups: string[] | null;
}

export interface Flags {
  global: boolean;
  ignoreCase: boolean;
  multiline: boolean;
  sticky: boolean;
  unicode: boolean;
}

export interface Theme {
  bg: string;
  text: string;
  textSecondary: string;
  border: string;
  sidebar: string;
  input: string;
  highlight: string;
  buttonPrimary: string;
  buttonSecondary: string;
  flagActive: string;
  flagInactive: string;
  card: string;
  codeBlock: string;
  matchHighlight: string;
  gradient: string;
  headerGradient: string;
  accentColor: string;
}
