import type { LanguageId } from '@/shared/lib/syntax/tokenize';
import type { ConvertTarget } from './convert';

/** Convert tab targets: file extension, hand-off mime and editor language. */
export type ConvertTabTarget =
  | ConvertTarget
  | 'ts'
  | 'schema'
  | 'escape'
  | 'unescape';

interface TargetInfo {
  label: string;
  ext: string;
  mime: string;
  language: LanguageId | 'plain';
}

export const TARGETS: Record<ConvertTabTarget, TargetInfo> = {
  json: {
    label: 'JSON',
    ext: 'json',
    mime: 'application/json',
    language: 'json',
  },
  'json-min': {
    label: 'Minified',
    ext: 'min.json',
    mime: 'application/json',
    language: 'json',
  },
  yaml: {
    label: 'YAML',
    ext: 'yaml',
    mime: 'application/yaml',
    language: 'yaml',
  },
  xml: { label: 'XML', ext: 'xml', mime: 'application/xml', language: 'xml' },
  csv: { label: 'CSV', ext: 'csv', mime: 'text/csv', language: 'csv' },
  toml: { label: 'TOML', ext: 'toml', mime: 'text/plain', language: 'plain' },
  ts: {
    label: 'TypeScript',
    ext: 'ts',
    mime: 'text/typescript',
    language: 'ts',
  },
  schema: {
    label: 'JSON Schema',
    ext: 'schema.json',
    mime: 'application/json',
    language: 'json',
  },
  escape: { label: 'Escape', ext: 'txt', mime: 'text/plain', language: 'json' },
  unescape: {
    label: 'Unescape',
    ext: 'txt',
    mime: 'text/plain',
    language: 'plain',
  },
};
