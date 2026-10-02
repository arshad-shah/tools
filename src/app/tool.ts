import type { ComponentType } from 'react';
import type { IconComponent } from '@/shared/ui/icons';

export type ToolCategory =
  | 'encoding'
  | 'text'
  | 'data'
  | 'web'
  | 'security'
  | 'math'
  | 'media'
  | 'pdf'
  | 'time';

/** 'quick-task' = single-purpose PDF task; 'workspace' = the PDF editor. */
export type ToolKind = 'tool' | 'quick-task' | 'workspace';

/** File kinds a tool accepts from a hub drop (sniffed from content). */
export type AcceptKind =
  | 'pdf'
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'gif'
  | 'csv'
  | 'tsv'
  | 'text'
  | 'json'
  | 'xml'
  | 'log'
  | 'riv'
  | 'any';

export interface AcceptRule {
  /** File kinds from a hub drop; a rule needs kinds, mimes or both. */
  kinds?: AcceptKind[];
  /** Text hand-off mimes (spec §4.3), e.g. 'application/json'. */
  mimes?: string[];
  /** false (default) means exactly one file. */
  multiple?: boolean;
  min?: number;
  max?: number;
}

/** Tool metadata, passed to every tool component as `definition`. */
export interface ToolDefinition {
  id: string;
  /** URL segment within the category: the route is /<category>/<slug>. */
  slug: string;
  category: ToolCategory;
  kind: ToolKind;
  name: string;
  description: string;
  icon: IconComponent;
  /** Plain words for search and Mod+K. */
  keywords: string[];
  /** Hub drop and hand-off routing; absent = the tool takes neither. */
  accepts?: AcceptRule[];
  /** Cross-listed (link only) on these other hubs. */
  alsoIn?: ToolCategory[];
  enabled: boolean;
  version?: string;
  isNew?: boolean;
}

export interface ToolProps {
  definition: ToolDefinition;
}

export type ToolComponent = ComponentType<ToolProps>;

export interface ToolManifest extends ToolDefinition {
  load: () => Promise<{ default: ToolComponent }>;
}

/** Each tool folder's index.ts default-exports defineTool({...}). */
export function defineTool(manifest: ToolManifest): ToolManifest {
  return manifest;
}
