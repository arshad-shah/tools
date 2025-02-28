// src/data/ToolDefinitions.ts

import { Clock, Eye, Key, Palette, QrCode, CodeXml, Calculator, Blocks } from 'lucide-react';
import { ToolDefinition } from '../types/ToolTypes';
import { TOOL_IDS } from '../constants';

/**
 * Central registry of all tool definitions
 * Add new tools here to make them available in the application
 * 
 */

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
  id: TOOL_IDS.COLOR_TESTER,
  name: 'Color Tester',
  description: 'Test and preview color combinations',
  icon: Palette,
  color: 'bg-indigo-500',
  enabled: true,
  category: 'design',
  version: '1.0.0',
  },
  {
  id: TOOL_IDS.PASSWORD_GENERATOR,
  name: 'Password Generator',
  description: 'Generate secure passwords',
  icon: Key,
  color: 'bg-orange-500',
  enabled: true,
  category: 'security',
  version: '1.0.0',
  },
  {
  id: TOOL_IDS.REGEX_TESTER,
  name: 'Regex Tester',
  description: 'Test regular expressions',
  icon: Eye,
  color: 'bg-teal-500',
  enabled: true,
  category: 'development',
  version: '1.0.0',
  },
  {
  id: TOOL_IDS.NUMBER_CONVERTER,
  name: 'Number Converter',
  description: 'Convert between number systems',
  icon: Calculator,
  color: 'bg-amber-500',
  enabled: true,
  category: 'development',
  version: '1.0.0',
  },
  {
  id: TOOL_IDS.QR_CODE_GENERATOR,
  name: 'QR Code Generator',
  description: 'Generate QR codes',
  icon: QrCode,
  color: 'bg-emerald-500',
  enabled: true,
  category: 'development',
  version: '1.0.0',
  },
  {
  id: TOOL_IDS.JSON_AND_XML_VIEWER,
  name: 'Json and Xml Viewer',
  description: 'View Json and Xml',
  icon: CodeXml,
  color: 'bg-cyan-500',
  enabled: true,
  category: 'development',
  version: '1.0.0',
  },
  {
  id: TOOL_IDS.POMODORO,
  name: 'Pomodoro',
  description: 'Focus and productivity timer',
  icon: Clock,
  color: 'bg-red-500',
  enabled: true,
  category: 'productivity',
  version: '1.0.0',
  },
  {
  id: TOOL_IDS.UNIT_CONVERTER,
  name: 'Unit Converter',
  description: 'Convert between units',
  icon: Calculator,
  color: 'bg-purple-500',
  enabled: true,
  category: 'development',
  version: '1.0.0',
  },
  {
    id: TOOL_IDS.PERIODIC_TABLE,
    name: 'Periodic Table',
    description: 'Explore the periodic table of elements',
    icon: Blocks,
    color: 'bg-blue-500',
    enabled: true,
    category: 'science',
    version: '1.0.0',
  }
];

/**
 * Utility functions for working with tool definitions
 */

/**
 * Get a tool definition by ID
 */
export function getToolDefinition(id: string): ToolDefinition | undefined {
  return TOOL_DEFINITIONS.find(tool => tool.id === id);
}

/**
 * Get all enabled tool definitions
 */
export function getEnabledTools(): ToolDefinition[] {
  return TOOL_DEFINITIONS.filter(tool => tool.enabled);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: string): ToolDefinition[] {
  return TOOL_DEFINITIONS.filter(tool => tool.category === category && tool.enabled);
}

/**
 * Check if a tool exists and is enabled
 */
export function isToolAvailable(id: string): boolean {
  const tool = getToolDefinition(id);
  return !!tool && tool.enabled;
}