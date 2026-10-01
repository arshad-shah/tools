import type { ToolDefinition } from './tool';

export const REPO_URL = 'https://github.com/arshad-shah/tools';
const DOT = '·';

export interface BuildStamp {
  label: string;
  /** Commit URL, or null when there is nothing to link to. */
  href: string | null;
  /** The SHA part of the label (for linking), or null. */
  sha: string | null;
  version: string | null;
}

/** "v2026.10.01 · a1b2c3d" in production, "dev" in dev or without git. */
export function formatBuildStamp(
  sha: string,
  date: string,
  isDev: boolean,
): BuildStamp {
  if (isDev || !sha)
    return { label: 'dev', href: null, sha: null, version: null };
  const version = `v${date.replace(/-/g, '.')}`;
  return {
    label: `${version} ${DOT} ${sha}`,
    href: `${REPO_URL}/commit/${sha}`,
    sha,
    version,
  };
}

export function issuesUrl(tool?: ToolDefinition): string {
  return tool
    ? `${REPO_URL}/issues/new?title=${encodeURIComponent(`[${tool.id}] `)}`
    : `${REPO_URL}/issues/new`;
}
