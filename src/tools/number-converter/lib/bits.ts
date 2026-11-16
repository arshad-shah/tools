/** The index of the one bit that differs between two words (BitField's change). */
export function changedBit(before: bigint, after: bigint): number {
  const diff = before ^ after;
  return diff === 0n ? 0 : diff.toString(2).length - 1;
}
