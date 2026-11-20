import { ToolError } from '@/shared/lib/errors';

/** Whether this browser can put an image on the clipboard. */
export const canCopyImages = () =>
  typeof ClipboardItem !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  typeof navigator.clipboard?.write === 'function';

/**
 * Copies a PNG to the clipboard. The blob is passed as a promise so the
 * write starts inside the click (Safari requires it) while it renders.
 */
export async function copyPng(png: Promise<Blob>): Promise<void> {
  if (!canCopyImages())
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This browser cannot copy images to the clipboard. Download the PNG instead.',
    );
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
  } catch (cause) {
    // A render failure inside the promise keeps its own message.
    const rendered = await png.then(
      () => null,
      (e: unknown) => e,
    );
    if (rendered instanceof ToolError) throw rendered;
    throw new ToolError(
      'UNKNOWN',
      'Could not copy the image. The browser may have refused clipboard access; download the PNG instead.',
      { cause },
    );
  }
}
