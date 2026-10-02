import latinExtUrl from '@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff?url';
import { loadNotoSans } from '@/pdf/edit';
import { ToolError } from '@/shared/lib/errors';

let latinExt: Promise<Uint8Array> | null = null;

/** Noto Sans latin-ext (OFL-1.1), fetched once from our own origin. */
function loadNotoSansLatinExt(): Promise<Uint8Array> {
  if (!latinExt) {
    const failed = (cause?: unknown) =>
      new ToolError('NETWORK', 'Could not load the text layer font', { cause });
    const loading = fetch(latinExtUrl).then(
      async (res) => {
        if (!res.ok) throw failed();
        return new Uint8Array(await res.arrayBuffer());
      },
      (cause: unknown) => {
        throw failed(cause);
      },
    );
    loading.catch(() => {
      if (latinExt === loading) latinExt = null;
    });
    latinExt = loading;
  }
  return latinExt;
}

/**
 * The text layer's fonts in fallback order: Noto Sans latin, then
 * latin-ext, which together cover every shipped OCR language.
 */
export const loadOcrFonts = (): Promise<Uint8Array[]> =>
  Promise.all([loadNotoSans(), loadNotoSansLatinExt()]);
