export declare const OCR_LANGUAGES: Readonly<Record<string, string>>;
export declare const OCR_LANG_VARIANT: string;
export declare const OCR_CORE_FILES: Readonly<{ simd: string; plain: string }>;
export declare const OCR_MANIFEST_FILE: string;
export declare function manifestUrl(version: string): string;
export declare function ocrFolder(tesseract: string, core: string): string;

export interface OcrAssetEntry {
  path: string;
  bytes: number;
}

export interface OcrAssetManifest {
  version: string;
  worker: OcrAssetEntry;
  core: {
    simd: OcrAssetEntry & { dir: string };
    plain: OcrAssetEntry & { dir: string };
  };
  languages: Record<string, OcrAssetEntry & { label: string }>;
}

export interface CopyOcrAssetsOptions {
  /** The project's node_modules folder. */
  nodeModules: string;
  /** The folder Vite serves statically (public/); files land in public/ocr. */
  publicDir: string;
}

export declare function copyOcrAssets(options: CopyOcrAssetsOptions): Promise<{
  version: string;
  copied: number;
  manifest: OcrAssetManifest;
}>;

export declare function buildOcrManifest(
  nodeModules: string,
): Promise<OcrAssetManifest>;
