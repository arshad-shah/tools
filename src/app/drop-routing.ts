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
  | { type: 'error'; error: ToolError }
  /** PDFs and images together: convert the images and merge (asks first). */
  | { type: 'confirm-merge'; message: string; path: string; files: File[] }
  /** The hub took the files itself (the PDF hub's detected-document card). */
  | { type: 'handled' };

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
  svg: 'SVG',
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
  const accepted = rule.kinds ?? [];
  if (accepted.length === 0) return false; // a text hand-off rule only
  if (accepted.includes('any')) return true;
  // An SVG is also XML: an XML tool takes it when no SVG tool is closer.
  return kinds.every(
    (k) =>
      k !== null &&
      (accepted.includes(k) || (k === 'svg' && accepted.includes('xml'))),
  );
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
    (t.accepts ?? []).flatMap((r) => r.kinds ?? []),
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

const IMAGE_KINDS = new Set<SniffedKind>(['png', 'jpeg', 'webp', 'gif']);

/**
 * PDF hub drops (spec §5.3): one PDF opens the workspace, several merge,
 * images become a PDF, and PDFs mixed with images merge after the images are
 * converted, which the hub asks about first.
 */
export async function routePdfHubDrop(
  files: File[],
  tools: readonly ToolManifest[],
): Promise<DropDecision> {
  const tool = (id: string) => tools.find((t) => t.id === id && t.enabled);
  const none = () => ({
    type: 'error' as const,
    error: new ToolError(
      'INVALID_FILE',
      `No tool here accepts these files. Accepted: ${describeAcceptKinds(['pdf', 'png', 'jpeg', 'webp', 'gif'])}`,
    ),
  });
  if (files.length === 0) return none();
  const kinds = await Promise.all(files.map((f) => sniffAcceptKind(f)));
  const pdfs = kinds.filter((k) => k === 'pdf').length;
  const images = kinds.filter((k) => k !== null && IMAGE_KINDS.has(k)).length;
  const go = (id: string): DropDecision => {
    const t = tool(id);
    return t ? { type: 'navigate', path: toolPath(t), tool: t, files } : none();
  };
  if (pdfs + images !== files.length) return none();
  if (images === 0) return go(pdfs === 1 ? 'pdf-edit' : 'pdf-merger');
  if (pdfs === 0) return go('images-to-pdf');
  const merger = tool('pdf-merger');
  if (!merger) return none();
  return {
    type: 'confirm-merge',
    message: 'Convert the images and merge everything?',
    path: toolPath(merger),
    files,
  };
}
