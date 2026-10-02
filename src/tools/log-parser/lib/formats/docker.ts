import type { FormatSpec, LogEntry } from '../model';
import { toEpoch } from '../time';
import { fromJsonObject } from './jsonl';
import { logfmt } from './logfmt';
import { plain } from './plain';

const CRI =
  /^(\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})) (stdout|stderr) ([FP]) (.*)$/;
const KUBECTL = /^\[(pod\/[^/\]\s]+\/[^\]\s]+)\] (.*)$/;
// `docker logs --timestamps`: RFC 3339 with nanoseconds.
const DOCKER_TS = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{9}Z) (.*)$/;

/** The rest of the line after a prefix: JSON, logfmt or plain text. */
function inner(rest: string): Partial<LogEntry> {
  const t = rest.trim();
  if (t.startsWith('{')) {
    try {
      const v: unknown = JSON.parse(t);
      if (v && typeof v === 'object' && !Array.isArray(v))
        return fromJsonObject(v as Record<string, unknown>);
    } catch {
      // Not JSON.
    }
  }
  return logfmt.parse(rest) ?? plain.parse(rest)!;
}

/** Docker and Kubernetes (CRI, kubectl --prefix, json-file) prefixes, stripped into fields. */
export const docker: FormatSpec = {
  id: 'docker',
  label: 'Docker or Kubernetes',
  parse(line) {
    let m = CRI.exec(line);
    if (m) {
      const e = inner(m[4]);
      return {
        ...e,
        ts: e.ts ?? toEpoch(m[1]),
        fields: {
          ...e.fields,
          stream: m[2],
          ...(m[3] === 'P' ? { partial: 'true' } : {}),
        },
      };
    }
    m = KUBECTL.exec(line);
    if (m) {
      const e = inner(m[2]);
      const [, pod, container] = m[1].split('/');
      return { ...e, fields: { ...e.fields, pod, container } };
    }
    if (line.startsWith('{"log":')) {
      try {
        const v = JSON.parse(line) as {
          log?: unknown;
          stream?: unknown;
          time?: unknown;
        };
        if (typeof v.log === 'string') {
          const e = inner(v.log.replace(/\n$/, ''));
          return {
            ...e,
            ts:
              e.ts ??
              (typeof v.time === 'string' ? toEpoch(v.time) : undefined),
            fields: {
              ...e.fields,
              ...(typeof v.stream === 'string' ? { stream: v.stream } : {}),
            },
          };
        }
      } catch {
        return null;
      }
    }
    m = DOCKER_TS.exec(line);
    if (m) {
      const e = inner(m[2]);
      return { ...e, ts: e.ts ?? toEpoch(m[1]) };
    }
    return null;
  },
};
