// src/registry/ToolRegistry.ts

import { ToolComponent, LazyToolComponent } from '../types/ToolTypes';
import { TOOL_IDS } from '../constants';

/**
 * Singleton class that manages tool component registration with lazy loading support
 */
class ToolRegistryManager {
  private static instance: ToolRegistryManager;
  private registry: Record<string, LazyToolComponent> = {};
  private loadedComponents: Record<string, ToolComponent> = {};

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
   * Register a lazy-loaded tool component
   * @param id Tool ID
   * @param loader Function that imports the component
   */
  public register(
    id: string,
    loader: () => Promise<{ default: ToolComponent }>,
  ): void {
    this.registry[id] = { loader };
  }

  /**
   * Register multiple lazy-loaded tools at once
   * @param tools Object mapping tool IDs to loader functions
   */
  public registerTools(
    tools: Record<string, () => Promise<{ default: ToolComponent }>>,
  ): void {
    const lazyTools: Record<string, LazyToolComponent> = {};
    for (const [id, loader] of Object.entries(tools)) {
      lazyTools[id] = { loader };
    }
    this.registry = { ...this.registry, ...lazyTools };
  }

  /**
   * Get a tool component by ID, loading it if necessary
   * @param id Tool ID
   */
  public async getComponent(id: string): Promise<ToolComponent | undefined> {
    // If already loaded, return from cache
    if (this.loadedComponents[id]) {
      return this.loadedComponents[id];
    }

    // If not registered, return undefined
    if (!this.registry[id]) {
      return undefined;
    }

    try {
      // Load the component dynamically
      const module = await this.registry[id].loader();
      const component = module.default;

      // Cache the loaded component
      this.loadedComponents[id] = component;

      return component;
    } catch (error) {
      console.error(`Failed to load tool component: ${id}`, error);
      return undefined;
    }
  }

  /**
   * Check if a tool is registered
   * @param id Tool ID
   */
  public hasComponent(id: string): boolean {
    return !!this.registry[id];
  }

  /**
   * Get the entire registry (IDs only, not the actual components)
   */
  public getRegistryIds(): string[] {
    return Object.keys(this.registry);
  }
}

// Export the singleton instance
export const toolRegistry = ToolRegistryManager.getInstance();

// Initialize with lazy-loaded tools
toolRegistry.registerTools({
  [TOOL_IDS.COLOR_TESTER]: () => import('../tools/ColorTester/ColorTester'),
  [TOOL_IDS.PASSWORD_GENERATOR]: () =>
    import('../tools/PasswordGenerator/Generator'),
  [TOOL_IDS.REGEX_TESTER]: () => import('../tools/regexTester/RegexStudio'),
  [TOOL_IDS.NUMBER_CONVERTER]: () =>
    import('../tools/NumberConverter/NumberConverter'),
  [TOOL_IDS.QR_CODE_GENERATOR]: () =>
    import('../tools/QrCodeGenerator/QRCodeGenerator'),
  [TOOL_IDS.JSON_AND_XML_VIEWER]: () =>
    import('../tools/JsonViewer/components/JsonViewer'),
  [TOOL_IDS.POMODORO]: () => import('../tools/pomodoro/main'),
  [TOOL_IDS.UNIT_CONVERTER]: () =>
    import('../tools/UnitConverter/UnitConverter'),
  [TOOL_IDS.TEXT_DIFF_CHECKER]: () =>
    import('../tools/TextDiffChecker/TextDiffChecker'),
  [TOOL_IDS.IMAGE_OPTIMIZER]: () =>
    import('../tools/ImageOptimiser/ImageOptimiser'),
  [TOOL_IDS.CSV_VIEWER]: () => import('../tools/CSVViewer/Csv-Tsv-viewer'),
  [TOOL_IDS.RANDOM_DATA_GENERATOR]: () =>
    import('../tools/RandomDataGenerator/RandomDataGenerator'),
  [TOOL_IDS.URL_ENCODER]: () =>
    import('../tools/URLEncoderDecoder/URLEncoderDecoder'),
  [TOOL_IDS.DATE_CALCULATOR]: () =>
    import('../tools/DateCalculator/DateCalculator'),
  [TOOL_IDS.HASH_GENERATOR]: () =>
    import('../tools/HashGenerator/HashGenerator'),
  [TOOL_IDS.BASE64_CONVERTER]: () =>
    import('../tools/Base64Convertor/Base64Convertor'),
  [TOOL_IDS.JWT_DECODE]: () => import('../tools/JWTDecoder/JwtDecoder'),
  [TOOL_IDS.URL_PARSER]: () => import('../tools/UrlParser/UrlParser'),
  [TOOL_IDS.API_REQUEST]: () => import('../tools/ApiTester/ApiTester'),
  [TOOL_IDS.CALCULATOR]: () => import('../tools/Calculator/Calculator'),
  [TOOL_IDS.LOG_PARSER]: () => import('../tools/LogParser/LogParser'),
  [TOOL_IDS.RIVE_ANIMATION_PLAYER]: () =>
    import('../tools/RiveAnimationPlayer/RiveAnimationPlayer'),
  [TOOL_IDS.PDF_MERGER]: () => import('../tools/PdfMerger/PdfMerger'),
  [TOOL_IDS.PDF_SPLITTER]: () => import('../tools/PdfSplitter/PdfSplitter'),
  [TOOL_IDS.PDF_COMPRESSOR]: () =>
    import('../tools/PdfCompressor/PdfCompressor'),
});

// Convenience function to get a tool component by ID (async)
export async function getToolComponent(
  id: string,
): Promise<ToolComponent | undefined> {
  return toolRegistry.getComponent(id);
}

// For synchronous checks (just to see if a tool is registered)
export function hasToolComponent(id: string): boolean {
  return toolRegistry.hasComponent(id);
}
