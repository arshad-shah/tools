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
import UnitConverter from '../tools/UnitConverter/UnitConverter';
import { TOOL_IDS } from '../constants';
import PeriodicTable from '../tools/PeriodicTable/PeriodicTable';
import TextDiffChecker from '../tools/TextDiffChecker/TextDiffChecker';
import ImageOptimiser from '../tools/ImageOptimiser/ImageOptimiser';
import CSVTSVViewer from '../tools/CSVViewer/Csv-Tsv-viewer';
import RandomDataGenerator from '../tools/RandomDataGenerator/RandomDataGenerator';
import URLEncoderDecoder from '../tools/URLEncoderDecoder/URLEncoderDecoder';
import DateCalculator from '../tools/DateCalculator/DateCalculator';
import HashGenerator from '../tools/HashGenerator/HashGenerator';
import Base64Converter from '../tools/Base64Convertor/Base64Convertor';

// Register all tool components
toolRegistry.registerTools({
  [TOOL_IDS.COLOR_TESTER]: ColorTester,
  [TOOL_IDS.PASSWORD_GENERATOR]: PasswordGenerator,
  [TOOL_IDS.REGEX_TESTER]: RegexTester,
  [TOOL_IDS.NUMBER_CONVERTER]: NumberConverter,
  [TOOL_IDS.QR_CODE_GENERATOR]: QrCodeGenerator,
  [TOOL_IDS.JSON_AND_XML_VIEWER]: JsonViewer,
  [TOOL_IDS.POMODORO]: Pomodoro,
  [TOOL_IDS.UNIT_CONVERTER]: UnitConverter,
  [TOOL_IDS.PERIODIC_TABLE]: PeriodicTable,
  [TOOL_IDS.TEXT_DIFF_CHECKER]: TextDiffChecker,
  [TOOL_IDS.IMAGE_OPTIMIZER]: ImageOptimiser,
  [TOOL_IDS.CSV_VIEWER]: CSVTSVViewer,
  [TOOL_IDS.RANDOM_DATA_GENERATOR]: RandomDataGenerator,
  [TOOL_IDS.URL_ENCODER]: URLEncoderDecoder,
  [TOOL_IDS.DATE_CALCULATOR]: DateCalculator,
  [TOOL_IDS.HASH_GENERATOR]: HashGenerator,
  [TOOL_IDS.BASE64_CONVERTER]: Base64Converter,
});

// Convenience function to get a tool component by ID
export function getToolComponent(id: string): ToolComponent | undefined {
  return toolRegistry.getComponent(id);
}