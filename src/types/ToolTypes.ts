// src/types/ToolTypes.ts

// Make sure this is imported in your types file
import { LucideIcon } from 'lucide-react';
import { ComponentType } from 'react';

// New type for lazy-loaded components
export interface LazyToolComponent {
  loader: () => Promise<{ default: ToolComponent }>;
}
/**
 * Available tool categories
 */
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

/**
 * Core tool metadata definition
 */
export interface ToolDefinition {
  id: string; // Unique identifier (used for routing)
  name: string; // Display name
  description: string; // Short description
  icon: LucideIcon; // Lucide icon component
  color: string; // Tailwind color class (e.g., 'bg-blue-500')
  enabled: boolean; // Whether the tool is available
  category: ToolCategory; // Tool category
  version?: string; // Optional version info
  isNew?: boolean; // Optional flag for new tools
}

/**
 * Props that will be passed to each tool component
 */
export interface ToolProps {
  definition: ToolDefinition; // The tool's metadata
}

/**
 * Type for tool components - must accept ToolProps
 */
export type ToolComponent = ComponentType<ToolProps>;

/**
 * Registry mapping tool IDs to their components
 */
export interface ToolRegistry {
  [toolId: string]: ToolComponent;
}
