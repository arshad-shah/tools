export interface CharacterSets {
  uppercase: string;
  lowercase: string;
  numbers: string;
  special: string;
}

export type CharType = 'uppercase' | 'lowercase' | 'number' | 'special';

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  special: boolean;
}
