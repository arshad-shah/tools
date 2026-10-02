import { useEffect, useState } from 'react';
import { EMPTY_FILTER } from '../lib/filter';
import type { LogSource } from './useLogSource';

export const SAMPLE_LINE_COUNT = 20;

/** The first 20 lines of the open log, fetched while `active`. */
export function useSampleLines(source: LogSource, active: boolean): string[] {
  const [lines, setLines] = useState<{ version: number; lines: string[] }>({
    version: -1,
    lines: [],
  });
  const { status, version, window } = source;
  useEffect(() => {
    if (!active || status !== 'ready') return;
    let stale = false;
    window(0, SAMPLE_LINE_COUNT, EMPTY_FILTER)
      .then(({ entries }) => {
        if (stale) return;
        const all = entries.flatMap((e) => e.raw.split('\n'));
        setLines({ version, lines: all.slice(0, SAMPLE_LINE_COUNT) });
      })
      .catch(() => {
        if (!stale) setLines({ version, lines: [] });
      });
    return () => {
      stale = true;
    };
  }, [active, status, version, window]);
  return status === 'ready' && lines.version === version ? lines.lines : NONE;
}

const NONE: string[] = [];
