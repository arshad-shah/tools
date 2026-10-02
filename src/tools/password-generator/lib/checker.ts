import type { ZxcvbnFactory } from '@zxcvbn-ts/core';
import { humanizeSeconds, OFFLINE_RATE, ONLINE_RATE } from './entropy';

export interface StrengthReport {
  /** 0 (too guessable) to 4 (very unguessable). */
  score: 0 | 1 | 2 | 3 | 4;
  guessesLog10: number;
  crackTime: { online: string; offline: string };
  warning?: string;
  suggestions: string[];
}

let factory: Promise<ZxcvbnFactory> | null = null;

/** zxcvbn-ts and its dictionaries (about 1 MB), imported on first use. */
function loadZxcvbn(): Promise<ZxcvbnFactory> {
  factory ??= Promise.all([
    import('@zxcvbn-ts/core'),
    import('@zxcvbn-ts/language-common'),
    import('@zxcvbn-ts/language-en'),
  ]).then(
    ([core, common, en]) =>
      new core.ZxcvbnFactory({
        dictionary: { ...common.dictionary, ...en.dictionary },
        graphs: common.adjacencyGraphs,
        translations: en.translations,
      }),
  );
  factory.catch(() => (factory = null));
  return factory;
}

/**
 * Scores an existing password locally with zxcvbn-ts (spec §8.4). Crack
 * times use the generator's stated rates: 1e4 guesses per second online,
 * 1e10 offline.
 */
export async function checkStrength(password: string): Promise<StrengthReport> {
  const zxcvbn = await loadZxcvbn();
  const r = zxcvbn.check(password);
  return {
    score: r.score,
    guessesLog10: r.guessesLog10,
    crackTime: {
      online: humanizeSeconds(r.guesses / 2 / ONLINE_RATE),
      offline: humanizeSeconds(r.guesses / 2 / OFFLINE_RATE),
    },
    warning: r.feedback.warning ?? undefined,
    suggestions: r.feedback.suggestions,
  };
}
