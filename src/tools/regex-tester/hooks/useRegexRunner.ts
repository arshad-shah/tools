import { useEffect, useState } from 'react';
import { createRegexRunner, type RegexRunner } from '../lib/runner';

/** One worker-backed runner per mounted tool, disposed on unmount. */
export function useRegexRunner(): RegexRunner {
  const [runner] = useState(() =>
    createRegexRunner(
      () =>
        new Worker(new URL('../lib/regex.worker.ts', import.meta.url), {
          type: 'module',
        }),
    ),
  );
  useEffect(() => () => runner.dispose(), [runner]);
  return runner;
}
