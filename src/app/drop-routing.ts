import { ToolError } from '@/shared/lib/errors';
import { sniffAcceptKind, type SniffedKind } from '@/shared/lib/sniff';
import { toolPath } from './routes';
import type {
  AcceptKind,
  AcceptRule,
  ToolCategory,
  ToolManifest,
} from './tool';

export type DropDecision =
  | { type: 'navigate'; path: string; tool: ToolManifest; files: File[] }
  | {
      type: 'choose';
      options: { tool: ToolManifest; path: string }[];
      files: File[];
    }
  | { type: 'error'; error: ToolError };

const KIND_LABEL: Record<AcceptKind, string> = {
  pdf: 'PDF',
  png: 'PNG',
  jpeg: 'JPEG',
  webp: 'WebP',
  gif: 'GIF',
  csv: 'CSV',
  tsv: 'TSV',
  text: 'text',
  json: 'JSON',
  xml: 'XML',
  log: 'log',
  riv: 'Rive',
  any: 'any file',
};

export function describeAcceptKinds(kinds: readonly AcceptKind[]): string {
  const labels = [...new Set(kinds)].map((k) => KIND_LABEL[k]);
  if (labels.length <= 1) return labels[0] ?? 'none';
  return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`;
}

function ruleMatches(rule: AcceptRule, kinds: (SniffedKind | null)[]): boolean {
  const n = kinds.length;
  if (!rule.multiple && n !== 1) return false;
  if (rule.min !== undefined && n < rule.min) return false;
  if (rule.max !== undefined && n > rule.max) return false;
  if (rule.kinds.includes('any')) return true;
  return kinds.every((k) => k !== null && rule.kinds.includes(k));
}

/** Enabled tools listed on a hub: its own plus cross-listed ones. */
export function hubTools(
  tools: readonly ToolManifest[],
  category?: ToolCategory,
): ToolManifest[] {
  return tools.filter(
    (t) =>
      t.enabled &&
      (!category ||
        t.category === category ||
        (t.alsoIn?.includes(category) ?? false)),
  );
}

/**
 * Where files dropped on a hub go (spec §5.3): a tool matches when one of
 * its accepts rules takes every file's kind and the file count. One match
 * navigates, several offer a choice, none is an INVALID_FILE error naming
 * what the hub accepts.
 */
export async function routeDrop(
  files: File[],
  tools: readonly ToolManifest[],
  category?: ToolCategory,
): Promise<DropDecision> {
  const candidates = hubTools(tools, category).filter((t) => t.accepts);
  const accepted = candidates.flatMap((t) =>
    (t.accepts ?? []).flatMap((r) => r.kinds),
  );
  const none = () => ({
    type: 'error' as const,
    error: new ToolError(
      'INVALID_FILE',
      `No tool here accepts these files. Accepted: ${describeAcceptKinds(accepted)}`,
    ),
  });
  if (files.length === 0) return none();
  const kinds = await Promise.all(files.map((f) => sniffAcceptKind(f)));
  const matches = candidates.filter((t) =>
    (t.accepts ?? []).some((r) => ruleMatches(r, kinds)),
  );
  if (matches.length === 0) return none();
  if (matches.length === 1)
    return {
      type: 'navigate',
      path: toolPath(matches[0]),
      tool: matches[0],
      files,
    };
  return {
    type: 'choose',
    options: matches.map((tool) => ({ tool, path: toolPath(tool) })),
    files,
  };
}
