import { detectLevel, normaliseLevel } from '../level';
import type { FormatSpec } from '../model';
import { LEADING_TS, toEpoch } from '../time';

/** Any text line: a leading timestamp and an anchored level when present. */
export const plain: FormatSpec = {
  id: 'plain',
  label: 'Plain text',
  parse(line) {
    const ts = LEADING_TS.exec(line);
    return {
      ts: ts ? toEpoch(ts[1]) : undefined,
      level: normaliseLevel(detectLevel(line)),
      message: line,
    };
  },
};
