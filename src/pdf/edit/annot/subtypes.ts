/** Annotation subtypes the workspace writes and can therefore edit (spec §9.1). Pure: no pdf-lib. */
export const EDITABLE_SUBTYPES: ReadonlySet<string> = new Set([
  'Highlight',
  'Underline',
  'StrikeOut',
  'Squiggly',
  'Text',
  'FreeText',
  'Ink',
  'Square',
  'Circle',
  'Line',
  'Stamp',
]);
