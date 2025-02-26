// src/data/ToolDefinitions.ts

import { Clock, Eye, Key, Palette,QrCode } from 'lucide-react';
import { ToolDefinition } from '../types/ToolTypes';

/**
 * Central registry of all tool definitions
 * Add new tools here to make them available in the application
 * 
 */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: 'color-tester',
    name: 'Color Tester',
    description: 'Test and preview color combinations',
    icon: Palette,
    color: 'bg-purple-500',
    enabled: true,
    category: 'design',
    version: '1.0.0',
  },
  {
    id: 'password-generator',
    name: 'Password Generator',
    description: 'Generate secure passwords',
    icon: Key,
    color: 'bg-red-500',
    enabled: true,
    category: 'security',
    version: '1.0.0',
  },
  {
    id: 'regex-tester',
    name: 'Regex Tester',
    description: 'Test regular expressions',
    icon: Eye,
    color: 'bg-blue-500',
    enabled: true,
    category: 'development',
    version: '1.0.0',
  },
  {
    id: 'number-converter',
    name: 'Number Converter',
    description: 'Convert between number systems',
    icon: Clock,
    color: 'bg-yellow-500',
    enabled: true,
    category: 'development',
    version: '1.0.0',
  },
  {
    //qr-code-generator
    id: 'qr-code-generator',
    name: 'QR Code Generator',
    description: 'Generate QR codes',
    icon: QrCode,
    color: 'bg-green-500',
    enabled: true,
    category: 'development',
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