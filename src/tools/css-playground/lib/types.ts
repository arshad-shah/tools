/** How serious an issue is: errors break rules, warnings likely bugs. */
export type IssueSeverity = 'error' | 'warning' | 'info';

export interface CssIssue {
  id: string;
  severity: IssueSeverity;
  /** Short rule name, e.g. "Duplicate property". */
  rule: string;
  message: string;
  line?: number;
  column?: number;
}

export interface SelectorInfo {
  selector: string;
  /** [ids, classes and attributes and pseudo-classes, types and pseudo-elements] */
  specificity: [number, number, number];
  line?: number;
  /** The at-rule context, e.g. "@media (max-width: 600px)", or "". */
  context: string;
}

export interface DeclarationInfo {
  property: string;
  value: string;
  important: boolean;
  line?: number;
  column?: number;
}

export interface CustomProperty {
  name: string;
  value: string;
  line?: number;
}

export interface CssStats {
  bytes: number;
  lines: number;
  rules: number;
  selectors: number;
  declarations: number;
  uniqueProperties: number;
  important: number;
  emptyRules: number;
  maxSpecificity: [number, number, number];
  /** At-rule name (without @) to count. */
  atRules: Record<string, number>;
}

export interface CssReport {
  stats: CssStats;
  selectors: SelectorInfo[];
  /** Property to count, most used first. */
  properties: { property: string; count: number }[];
  /** Colour as written (lowercased) to count, most used first. */
  colours: { value: string; count: number }[];
  /** Identifiers that may be colour keywords; the browser decides. */
  colourWords: { value: string; count: number }[];
  customProperties: CustomProperty[];
  /** Unique declarations (no custom properties) for the browser check. */
  declarations: DeclarationInfo[];
  issues: CssIssue[];
  /** Markup with an element for every selector, for the preview. */
  specimen: string;
  /** Elements left out of the specimen to keep it small. */
  specimenTruncated: boolean;
}

export interface OptimiseOptions {
  /** Merge and move rules (csso structural optimisations). */
  restructure: boolean;
  /** Merge @media rules even when the order might matter. */
  forceMediaMerge: boolean;
  /** Keep comments that start with "/*!" (licences). */
  keepLicenceComments: boolean;
}

export interface OptimiseResult {
  css: string;
  before: number;
  after: number;
  gzipBefore: number;
  gzipAfter: number;
}
