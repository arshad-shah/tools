import { textMatches } from '@arshad-shah/cynosure';
import { getCategory } from '../../categories';
import type { ToolManifest } from '../../tool';

/** Every word of the query is in the tool's name, description, keywords or category. */
export function toolMatches(tool: ToolManifest, query: string): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean);
  const fields = [
    tool.name,
    tool.description,
    ...tool.keywords,
    getCategory(tool.category)?.label ?? tool.category,
  ];
  return words.every((w) => fields.some((f) => textMatches(f, w)));
}
