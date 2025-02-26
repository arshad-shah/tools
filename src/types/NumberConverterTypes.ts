// Define TypeScript interfaces
interface NumberType {
  value: string;
  label: string;
  base: number;
  regex: RegExp;
  icon: React.ReactNode;
  color: string;
}

interface Results {
  binary: string;
  decimal: string;
  hexadecimal: string;
  octal: string;
}

interface ThemeStyles {
  background: string;
  card: string;
  text: string;
  input: string;
  button: string;
  select: string;
  resultCard: string;
  badge: string;
}

interface ThemeOptions {
  dark: ThemeStyles;
  light: ThemeStyles;
}

export type { NumberType, Results, ThemeStyles, ThemeOptions };