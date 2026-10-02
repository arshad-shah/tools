import { getCategory } from './categories';
import { RESERVED_SLUGS, toolPath } from './routes';
import type { ToolManifest } from './tool';

type ManifestModules = Record<string, { default: ToolManifest }>;

const REQUIRED_STRINGS = ['name', 'description', 'category', 'slug'] as const;
const KINDS = new Set(['tool', 'quick-task', 'workspace']);
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MIME_RE = /^[a-z]+\/[a-z0-9.+-]+$/;

/** Route and search fields (spec §3.1). */
function validateRouting(path: string, m: ToolManifest) {
  const fail = (msg: string) => {
    throw new Error(`${path}: tool "${m.id}" ${msg}`);
  };
  if (!getCategory(m.category)) fail(`has unknown category "${m.category}"`);
  if (!SLUG_RE.test(m.slug)) fail(`slug "${m.slug}" must be kebab-case`);
  if (RESERVED_SLUGS[m.category].includes(m.slug))
    fail(`slug "${m.slug}" is reserved under /${m.category}`);
  if (!KINDS.has(m.kind)) fail(`has invalid kind "${String(m.kind)}"`);
  if (
    !Array.isArray(m.keywords) ||
    m.keywords.some((k) => typeof k !== 'string' || !k.trim())
  )
    fail('needs keywords to be an array of non-empty strings');
  for (const c of m.alsoIn ?? [])
    if (!getCategory(c) || c === m.category)
      fail(`alsoIn "${c}" must be another existing category`);
  for (const rule of m.accepts ?? []) {
    const kinds = rule.kinds ?? [];
    const mimes = rule.mimes ?? [];
    if (!Array.isArray(kinds) || !Array.isArray(mimes))
      fail('has an accepts rule whose kinds or mimes is not a list');
    if (kinds.length === 0 && mimes.length === 0)
      fail('has an accepts rule without kinds or mimes');
    for (const mime of mimes)
      if (typeof mime !== 'string' || !MIME_RE.test(mime))
        fail(`accepts mime "${String(mime)}" is not a valid mime type`);
  }
}
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
  if (folder !== manifest.id)
    throw new Error(
      `Tool folder "${folder}" must match its id "${manifest.id}" (${path})`,
    );
  validateRouting(path, manifest);
}

export function buildRegistry(modules: ManifestModules): ToolManifest[] {
  const seen = new Map<string, string>();
  const routes = new Map<string, string>();
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
    const route = toolPath(manifest);
    const clash = routes.get(route);
    if (clash)
      throw new Error(`Duplicate route ${route} in ${path} and ${clash}`);
    routes.set(route, path);
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

/** Enabled tools that take a text hand-off of `mime` (spec §4.3). */
export function toolsAccepting(
  mime: string,
  tools: readonly ToolManifest[] = TOOLS,
): ToolManifest[] {
  return tools.filter(
    (t) => t.enabled && (t.accepts ?? []).some((r) => r.mimes?.includes(mime)),
  );
}
