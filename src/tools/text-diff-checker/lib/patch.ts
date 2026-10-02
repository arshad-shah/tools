import { createTwoFilesPatch } from 'diff';

/** A unified patch (`diff -u` style) from the original texts. */
export function toUnifiedPatch(
  leftName: string,
  rightName: string,
  left: string,
  right: string,
  context = 3,
): string {
  return createTwoFilesPatch(
    leftName,
    rightName,
    left,
    right,
    undefined,
    undefined,
    { context },
  );
}
