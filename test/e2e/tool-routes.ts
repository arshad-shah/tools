import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ToolRoute {
  folder: string;
  id: string;
  name: string;
  category: string;
  slug: string;
  /** /<category>/<slug> */
  path: string;
  enabled: boolean;
}

const TOOLS_DIR = 'src/tools';

/** Reads every manifest from disk (Node can't run import.meta.glob). */
export function toolRoutes(): ToolRoute[] {
  return readdirSync(TOOLS_DIR, { withFileTypes: true })
    .filter(
      (d) => d.isDirectory() && existsSync(join(TOOLS_DIR, d.name, 'index.ts')),
    )
    .map((d) => {
      const src = readFileSync(join(TOOLS_DIR, d.name, 'index.ts'), 'utf8');
      const id = /\bid:\s*'([^']+)'/.exec(src)?.[1];
      const name = /\bname:\s*'([^']+)'/.exec(src)?.[1];
      const category = /\bcategory:\s*'([^']+)'/.exec(src)?.[1];
      const slug = /\bslug:\s*'([^']+)'/.exec(src)?.[1];
      if (!id || !name || !category || !slug) {
        throw new Error(
          `Cannot read id/name/category/slug from ${d.name}/index.ts`,
        );
      }
      return {
        folder: d.name,
        id,
        name,
        category,
        slug,
        path: `/${category}/${slug}`,
        enabled: /\benabled:\s*true\b/.test(src),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

let byId: Map<string, ToolRoute> | undefined;

/** The /<category>/<slug> path of a tool id; throws for an unknown id. */
export function pathOf(id: string): string {
  byId ??= new Map(toolRoutes().map((t) => [t.id, t]));
  const tool = byId.get(id);
  if (!tool) throw new Error(`No tool with id ${id}`);
  return tool.path;
}
