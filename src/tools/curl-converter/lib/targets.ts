import { toCurl } from './gen-curl';
import { toGo } from './gen-go';
import { toHttpie } from './gen-httpie';
import { toAxios, toFetch } from './gen-js';
import { toPhp } from './gen-php';
import { toPython } from './gen-python';
import type { CurlRequest } from './model';

/** Generated code and what it could not carry over. */
export interface Generated {
  code: string;
  notes: string[];
}

export type TargetId =
  | 'fetch'
  | 'axios'
  | 'python'
  | 'go'
  | 'php'
  | 'httpie'
  | 'curl';

export interface Target {
  id: TargetId;
  label: string;
  /** For the download name. */
  extension: string;
  /** CodeBlock's language label. */
  language: string;
  generate(req: CurlRequest): Generated;
}

export const TARGETS: readonly Target[] = [
  {
    id: 'fetch',
    label: 'JavaScript fetch',
    extension: 'js',
    language: 'javascript',
    generate: toFetch,
  },
  {
    id: 'axios',
    label: 'axios',
    extension: 'js',
    language: 'javascript',
    generate: toAxios,
  },
  {
    id: 'python',
    label: 'Python requests',
    extension: 'py',
    language: 'python',
    generate: toPython,
  },
  {
    id: 'go',
    label: 'Go net/http',
    extension: 'go',
    language: 'go',
    generate: toGo,
  },
  {
    id: 'php',
    label: 'PHP curl',
    extension: 'php',
    language: 'php',
    generate: toPhp,
  },
  {
    id: 'httpie',
    label: 'HTTPie',
    extension: 'sh',
    language: 'shell',
    generate: toHttpie,
  },
  {
    id: 'curl',
    label: 'curl (tidied)',
    extension: 'sh',
    language: 'shell',
    generate: (req) => ({ code: toCurl(req), notes: [] }),
  },
];

export const isTargetId = (v: string): v is TargetId =>
  TARGETS.some((t) => t.id === v);

export function targetById(id: TargetId): Target {
  return TARGETS.find((t) => t.id === id) ?? TARGETS[0];
}
