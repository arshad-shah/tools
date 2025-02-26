export interface CharacterSets {
  uppercase: string;
  lowercase: string;
  numbers: string;
  special: string;
}
// types.ts
export interface PasswordMetrics {
  strength: number;
  entropy: number;
  uniqueChars: number;
  uniqueRatio: number;
  crackTimes: {
    desktop: string;
    distributed: string;
    quantum: string;
  };
}
export interface GuessesPerSecond {
  desktop: number;
  supercomputer: number;
  quantumComputer: number;
}