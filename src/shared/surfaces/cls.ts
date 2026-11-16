/** Joins the class names that are set (surfaces only; pages use no classes). */
export const cls = (...names: (string | false | null | undefined)[]): string =>
  names.filter(Boolean).join(' ');
