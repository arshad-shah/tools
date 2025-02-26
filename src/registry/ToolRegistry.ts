// src/registry/ToolRegistry.ts

import { ToolComponent, ToolRegistry } from '../types/ToolTypes';

/**
 * Singleton class that manages tool component registration
 */
class ToolRegistryManager {
  private static instance: ToolRegistryManager;
  private registry: ToolRegistry = {};

  /**
   * Get the singleton instance
   */
  public static getInstance(): ToolRegistryManager {
    if (!ToolRegistryManager.instance) {
      ToolRegistryManager.instance = new ToolRegistryManager();
    }
    return ToolRegistryManager.instance;
  }

  /**
   * Register a tool component
   * @param id Tool ID
   * @param component Tool component
   */
  public register(id: string, component: ToolComponent): void {
    this.registry[id] = component;
  }

  /**
   * Register multiple tools at once
   * @param tools Object mapping tool IDs to components
   */
  public registerTools(tools: ToolRegistry): void {
    this.registry = { ...this.registry, ...tools };
  }

  /**
   * Get a tool component by ID
   * @param id Tool ID
   */
  public getComponent(id: string): ToolComponent | undefined {
    return this.registry[id];
  }

  /**
   * Check if a tool is registered
   * @param id Tool ID
   */
  public hasComponent(id: string): boolean {
    return !!this.registry[id];
  }

  /**
   * Get the entire registry
   */
  public getRegistry(): ToolRegistry {
    return { ...this.registry };
  }
}

// Export the singleton instance
export const toolRegistry = ToolRegistryManager.getInstance();

// Initialize with default tools
import ColorTester from '../tools/ColorTester/ColorTester';
import PasswordGenerator from '../tools/PasswordGenerator/Generator';
import RegexTester from '../tools/regexTester/RegexStudio';
import NumberConverter from '../tools/NumberConverter/NumberConverter';
import QrCodeGenerator from '../tools/QrCodeGenerator/QRCodeGenerator';
import JsonViewer from '../tools/JsonViewer/components/JsonViewer';
import Pomodoro from '../tools/pomodoro/main';

// Register all tool components
toolRegistry.registerTools({
  'color-tester': ColorTester,
  'password-generator': PasswordGenerator,
  'regex-tester': RegexTester,
  'number-converter': NumberConverter,
  'qr-code-generator': QrCodeGenerator,
  'json-and-xml-viewer': JsonViewer,
  'pomodoro': Pomodoro,
});

// Convenience function to get a tool component by ID
export function getToolComponent(id: string): ToolComponent | undefined {
  return toolRegistry.getComponent(id);
}