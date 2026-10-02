import type { ToolCategory, ToolDefinition } from './tool';

/** Segments a tool slug may not take (spec §3.1): /pdf/edit is the workspace. */
export const RESERVED_SLUGS: Record<ToolCategory, readonly string[]> = {
  pdf: ['edit'],
  text: [],
  data: [],
  encoding: [],
  web: [],
  media: [],
  security: [],
  math: [],
  time: [],
};

export function toolPath(t: Pick<ToolDefinition, 'category' | 'slug'>): string {
  return `/${t.category}/${t.slug}`;
}

export function categoryPath(c: ToolCategory): string {
  return `/${c}`;
}
