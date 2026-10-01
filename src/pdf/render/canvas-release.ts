/**
 * Runs `render`; if it fails (cancelled, render error) the canvas's backing
 * store is released at once instead of waiting for the GC. Export canvases
 * can be 16 MP.
 */
export async function freeCanvasOnFailure<T>(
  canvas: { width: number; height: number },
  render: () => Promise<T>,
): Promise<T> {
  try {
    return await render();
  } catch (e) {
    canvas.width = 0;
    canvas.height = 0;
    throw e;
  }
}
