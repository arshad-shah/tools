import { useEffect, useState } from 'react';
import { createRegexRunner, type RegexRunner } from '../lib/runner';

/**
 * One dedicated killable text worker per mounted tool (1 s budget),
 * disposed on unmount.
 */
export function useRegexRunner(): RegexRunner {
  const [runner] = useState(() => createRegexRunner());
  useEffect(() => () => runner.dispose(), [runner]);
  return runner;
}
