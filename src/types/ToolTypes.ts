// src/types/ToolTypes.ts

import { LucideIcon } from 'lucide-react';
import { ComponentType } from 'react';

/**
 * Available tool categories
 */
export type ToolCategory = 'design' | 'development' | 'security' | 'productivity' | 'utility';

/**
 * Core tool metadata definition
 */
export interface ToolDefinition {
  id: string;               // Unique identifier (used for routing)
  name: string;             // Display name
  description: string;      // Short description
  icon: LucideIcon;         // Lucide icon component
  color: string;            // Tailwind color class (e.g., 'bg-blue-500')
  enabled: boolean;         // Whether the tool is available
  category: ToolCategory;   // Tool category
  version?: string;         // Optional version info
}

/**
 * Props that will be passed to each tool component
 */
export interface ToolProps {
  definition: ToolDefinition;  // The tool's metadata
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