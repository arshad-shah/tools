export declare const PDFJS_ASSET_DIRS: readonly string[];

/** Name of the version stamp file inside `workDir`. */
export declare const PDFJS_STAMP_FILE: string;

export interface SyncPdfjsAssetsOptions {
  /** The installed pdfjs-dist package folder. */
  srcDir: string;
  /** Where the assets are served from (public/pdfjs). */
  destDir: string;
  /** Scratch folder for the version stamp, the fresh copy and the old one. */
  workDir: string;
  /** pdfjs-dist version recorded in the stamp. */
  version: string;
  /** Injectable for tests; defaults to fs.promises.rename. */
  rename?: (from: string, to: string) => Promise<void>;
}

export declare function syncPdfjsAssets(
  options: SyncPdfjsAssetsOptions,
): Promise<'copied' | 'skipped'>;
