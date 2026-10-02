/**
 * Target index for roving focus in a one-dimensional set (tabs, toolbar),
 * or null when the key is not a navigation key. Arrows wrap; Home and End
 * jump to the ends. Modified keys are left to other handlers.
 */
export function rovingIndex(
  e: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
  },
  index: number,
  count: number,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
): number | null {
  if (count === 0 || e.altKey || e.ctrlKey || e.metaKey) return null;
  const [prev, next] =
    orientation === 'horizontal'
      ? ['ArrowLeft', 'ArrowRight']
      : ['ArrowUp', 'ArrowDown'];
  if (e.key === 'Home') return 0;
  if (e.key === 'End') return count - 1;
  if (e.key === next) return (index + 1) % count;
  if (e.key === prev) return (index - 1 + count) % count;
  return null;
}
