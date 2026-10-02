import type { ComponentType } from 'react';
import type { ExportOptions } from '@/pdf/doc/export-stages';
import type { DocumentApi } from './modes/types';
import { MetadataOption, PagesOption } from './ExportOptionFields';
import { PROTECT_EXPORT_SECTION } from './modes/protect/export-section';
import { LinearizeOption } from './modes/optimize/LinearizeOption';

export interface ExportOptionSection {
  id: string;
  order: number;
  title: string;
  visible(doc: DocumentApi): boolean;
  Component: ComponentType<{
    doc: DocumentApi;
    options: ExportOptions;
    set(patch: Partial<ExportOptions>): void;
  }>;
  /** Option keys cleared once an export succeeds (passwords, G25). */
  secret?: string[];
}

/**
 * Export dialog option sections, by order. Append-only: B ships pages and
 * metadata; later Parts add flatten, linearize, password and signature.
 */
export const EXPORT_OPTION_SECTIONS: ExportOptionSection[] = [
  {
    id: 'pages',
    order: 10,
    title: 'Pages',
    visible: () => true,
    Component: PagesOption,
  },
  {
    id: 'metadata',
    order: 20,
    title: 'Document properties',
    visible: () => true,
    Component: MetadataOption,
  },
  PROTECT_EXPORT_SECTION,
  {
    id: 'linearize',
    order: 30,
    title: 'Fast web view',
    visible: () => true,
    Component: LinearizeOption,
  },
];
