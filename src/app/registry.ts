import type { ToolManifest } from './tool';

type ManifestModules = Record<string, { default: ToolManifest }>;

const REQUIRED_STRINGS = ['name', 'description', 'category'] as const;
/**
 * Legacy folders still allowed to differ from their id: folder → its id.
 * PdfCompressor is rebuilt as pdf-compressor/ by phase 3 Part C; this entry
 * is removed when that lands.
 */
const LEGACY_FOLDERS: Readonly<Record<string, string>> = {
  PdfCompressor: 'pdf-compressor',
};

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
  if (folder === undefined)
    throw new Error(
      `${path}: tool "${manifest.id}" must live at tools/<id>/index.ts`,
    );
  const legacyId = Object.hasOwn(LEGACY_FOLDERS, folder)
    ? LEGACY_FOLDERS[folder]
    : undefined;
  if (folder !== manifest.id && legacyId !== manifest.id)
    throw new Error(
      `Tool folder "${folder}" must match its id "${manifest.id}" (${path})`,
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
