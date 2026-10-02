export type FormatType = 'json' | 'xml';
export type ViewMode = 'tree' | 'network';
export type LayoutType = 'split' | 'single';
export type PaneType = 'editor' | 'view';

/** Parsed JSON, or the JSON shape of an XML document element. */
export type ParsedData = Record<string, unknown>;
