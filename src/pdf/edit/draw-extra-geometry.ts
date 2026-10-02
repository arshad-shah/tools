/** Head length of drawArrow for a line width (pure: shared with the overlay preview). */
export const arrowHead = (width: number, length: number) =>
  Math.min(Math.max(width * 4, 6), length);
