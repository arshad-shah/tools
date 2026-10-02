/** Types for banned-glyphs.js (shared by the lint rule and the dist scan). */
export declare const BANNED_RANGES: readonly (readonly [number, number])[];
export declare const BANNED_DESCRIPTION: string;
export declare function findBanned(
  text: string,
): { index: number; codePoint: number } | null;
export declare const EMOJI_ONLY_RE: RegExp;
export declare function hex(cp: number): string;
export declare function cookRegex(pattern: string): string;
