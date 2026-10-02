import type { FormatSpec } from '../model';
import { access } from './access';
import { docker } from './docker';
import { jsonl } from './jsonl';
import { LEGACY_FORMATS } from './legacy';
import { logfmt } from './logfmt';
import { plain } from './plain';
import { syslog } from './syslog';

/** Every built-in format, most specific first. */
export const BUILTIN_FORMATS: FormatSpec[] = [
  jsonl,
  docker,
  access,
  syslog,
  logfmt,
  ...LEGACY_FORMATS,
  plain,
];

export const getFormat = (id: string): FormatSpec | undefined =>
  BUILTIN_FORMATS.find((f) => f.id === id);

export { access, docker, jsonl, logfmt, plain, syslog };
