import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ToolRoute {
  folder: string;
  id: string;
  name: string;
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
      if (!id || !name) {
        throw new Error(`Cannot read id/name from ${d.name}/index.ts`);
      }
      return {
        folder: d.name,
        id,
        name,
        enabled: /\benabled:\s*true\b/.test(src),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
