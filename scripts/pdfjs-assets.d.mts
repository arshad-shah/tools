export declare const PDFJS_ASSET_DIRS: readonly string[];

export interface SyncPdfjsAssetsOptions {
  /** The installed pdfjs-dist package folder. */
  srcDir: string;
  /** Where the assets are served from (public/pdfjs). */
  destDir: string;
  /** Scratch folder for the fresh copy and the swapped-out old one. */
  workDir: string;
  /** pdfjs-dist version written to destDir/.version. */
  version: string;
  /** Injectable for tests; defaults to fs.promises.rename. */
  rename?: (from: string, to: string) => Promise<void>;
}

export declare function syncPdfjsAssets(
  options: SyncPdfjsAssetsOptions,
): Promise<'copied' | 'skipped'>;
