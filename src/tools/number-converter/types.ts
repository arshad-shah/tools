export type NumberKey = 'binary' | 'decimal' | 'hexadecimal' | 'octal';

export interface NumberType {
  value: NumberKey;
  label: string;
  base: number;
  regex: RegExp;
  description: string;
  uses: string[];
}

export type Results = Record<NumberKey, string>;
