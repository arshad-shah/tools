// src/data/ToolDefinitions.ts

import { Clock, Eye, Key, Palette, QrCode, CodeXml, Calculator, Blocks, PenTool, FileCode, Lock, Calendar, Link, Dice1, Code, Table, Image  , Split } from 'lucide-react';
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
  },
    {
    id: TOOL_IDS.TEXT_DIFF_CHECKER,
    name: 'Text Diff Checker',
    description: 'Compare differences between text files or snippets',
    icon: Split,
    color: 'bg-violet-500',
    enabled: true,
    category: 'development',
    version: '1.0.0',
  },
  {
    id: TOOL_IDS.IMAGE_OPTIMIZER,
    name: 'Image Optimizer',
    description: 'Compress and optimize images for web usage',
    icon: Image,
    color: 'bg-fuchsia-500',
    enabled: false,
    category: 'design',
    version: '1.0.0',
  },
  {
    id: TOOL_IDS.CSV_VIEWER,
    name: 'CSV Viewer',
    description: 'View and manipulate CSV data with sorting and filtering',
    icon: Table,
    color: 'bg-lime-500',
    enabled: false,
    category: 'development',
    version: '1.0.0',
  },
  {
    id: TOOL_IDS.CODE_FORMATTER,
    name: 'Code Formatter',
    description: 'Format and beautify code for different languages',
    icon: Code,
    color: 'bg-pink-500',
    enabled: false,
    category: 'development',
    version: '1.0.0',
  },
  {
    id: TOOL_IDS.RANDOM_DATA_GENERATOR,
    name: 'Random Data Generator',
    description: 'Generate test data like names, emails, and addresses',
    icon: Dice1,
    color: 'bg-rose-500',
    enabled: false,
    category: 'development',
    version: '1.0.0',
  },
  {
    id: TOOL_IDS.URL_ENCODER,
    name: 'URL Encoder/Decoder',
    description: 'Encode and decode URL parameters',
    icon: Link,
    color: 'bg-amber-600',
    enabled: false,
    category: 'development',
    version: '1.0.0',
  },
  {
    id: TOOL_IDS.DATE_CALCULATOR,
    name: 'Date Calculator',
    description: 'Calculate time between dates, add or subtract time periods',
    icon: Calendar,
    color: 'bg-green-600',
    enabled: false,
    category: 'productivity',
    version: '1.0.0',
  },
  {
    id: TOOL_IDS.HASH_GENERATOR,
    name: 'Hash Generator',
    description: 'Generate MD5, SHA-256, and other hash algorithms',
    icon: Lock,
    color: 'bg-yellow-600',
    enabled: false,
    category: 'security',
    version: '1.0.0',
  },
  {
    id: TOOL_IDS.NOTE_TAKING,
    name: 'Note Taking',
    description: 'Simple note-taking tool with local storage',
    icon: PenTool,
    color: 'bg-blue-600',
    enabled: false,
    category: 'productivity',
    version: '1.0.0',
  },
  {
    id: TOOL_IDS.BASE64_CONVERTER,
    name: 'Base64 Converter',
    description: 'Convert text and files to and from Base64 encoding',
    icon: FileCode,
    color: 'bg-teal-600',
    enabled: false,
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