/** A rendered block: its source line and its top offset in the preview. */
export interface BlockPos {
  line: number;
  top: number;
}

/**
 * The source line at a preview scroll offset, interpolated between the
 * surrounding blocks (blocks sorted by `top`). For editor to preview sync.
 */
export function lineAt(blocks: readonly BlockPos[], scrollTop: number): number {
  if (blocks.length === 0) return 1;
  if (scrollTop <= blocks[0].top) return blocks[0].line;
  for (let i = 0; i < blocks.length - 1; i++) {
    const a = blocks[i];
    const b = blocks[i + 1];
    if (scrollTop < b.top) {
      const t = (scrollTop - a.top) / Math.max(1, b.top - a.top);
      return a.line + t * (b.line - a.line);
    }
  }
  return blocks[blocks.length - 1].line;
}

/** The preview offset for a source line (the inverse of lineAt). */
export function topFor(blocks: readonly BlockPos[], line: number): number {
  if (blocks.length === 0) return 0;
  if (line <= blocks[0].line) return blocks[0].top;
  for (let i = 0; i < blocks.length - 1; i++) {
    const a = blocks[i];
    const b = blocks[i + 1];
    if (line < b.line) {
      const t = (line - a.line) / Math.max(1, b.line - a.line);
      return a.top + t * (b.top - a.top);
    }
  }
  return blocks[blocks.length - 1].top;
}

/** Reads block positions from a rendered document (`[data-line]` elements). */
export function readBlocks(root: ParentNode): BlockPos[] {
  return [...root.querySelectorAll<HTMLElement>('[data-line]')]
    .map((el) => ({ line: Number(el.dataset.line), top: el.offsetTop }))
    .filter((b) => Number.isFinite(b.line))
    .sort((a, b) => a.top - b.top);
}
