import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

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

/** Tool metadata, passed to every tool component as `definition`. */
export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  category: ToolCategory;
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
