import type { ToolManifest } from './tool';

type ManifestModules = Record<string, { default: ToolManifest }>;

const REQUIRED_STRINGS = ['name', 'description', 'category'] as const;
/** New-style tool folders; legacy PascalCase ones are exempt until phase 4. */
const KEBAB_FOLDER = /^[a-z0-9-]+$/;

function validate(path: string, manifest: ToolManifest | undefined) {
  if (!manifest || typeof manifest.id !== 'string' || !manifest.id) {
    throw new Error(`${path} must default-export defineTool({...})`);
  }
  for (const key of REQUIRED_STRINGS) {
    if (typeof manifest[key] !== 'string' || !manifest[key])
      throw new Error(`${path}: tool "${manifest.id}" is missing ${key}`);
  }
  if (!manifest.icon)
    throw new Error(`${path}: tool "${manifest.id}" is missing icon`);
  if (typeof manifest.load !== 'function')
    throw new Error(
      `${path}: tool "${manifest.id}" needs load to be a function`,
    );
  // Spec §3.2: a tool's id is its folder name.
  const folder = /\/tools\/([^/]+)\/index\.ts$/.exec(path)?.[1];
  if (folder && KEBAB_FOLDER.test(folder) && manifest.id !== folder)
    throw new Error(
      `${path}: tool id "${manifest.id}" must match its folder "${folder}"`,
    );
}

export function buildRegistry(modules: ManifestModules): ToolManifest[] {
  const seen = new Map<string, string>();
  const list: ToolManifest[] = [];
  for (const [path, mod] of Object.entries(modules)) {
    const manifest = mod.default;
    validate(path, manifest);
    const previous = seen.get(manifest.id);
    if (previous)
      throw new Error(
        `Duplicate tool id "${manifest.id}" in ${path} and ${previous}`,
      );
    seen.set(manifest.id, path);
    list.push(manifest);
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

// Manifests are tiny (metadata + a lazy loader), so eager is fine.
export const TOOLS = buildRegistry(
  import.meta.glob<{ default: ToolManifest }>('../tools/*/index.ts', {
    eager: true,
  }),
);

export const getEnabledTools = () => TOOLS.filter((t) => t.enabled);
export const getTool = (id: string) => TOOLS.find((t) => t.id === id);
