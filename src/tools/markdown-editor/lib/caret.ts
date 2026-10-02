/** UTF-16 offset of the start of 1-based `line` (clamped to the text). */
export function offsetOfLine(text: string, line: number): number {
  let at = 0;
  for (let n = 1; n < line; n++) {
    const nl = text.indexOf('\n', at);
    if (nl === -1) return text.length;
    at = nl + 1;
  }
  return at;
}

/** A file name from a title: lower case words joined by hyphens. */
export function fileBase(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/\p{M}+/gu, '')
      .match(/[\p{L}\p{N}]+/gu)
      ?.join('-')
      .slice(0, 60) || 'document'
  );
}
