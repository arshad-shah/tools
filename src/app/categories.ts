import type { IconData } from '@arshad-shah/cynosure/icons';
import {
  binary,
  calculator,
  clock,
  fileText,
  globe,
  image,
  shield,
  table,
  type,
} from '@arshad-shah/cynosure/icons';
import type { ToolCategory } from './tool';

export interface CategoryDef {
  id: ToolCategory;
  label: string;
  /** A Facet icon (redesign spec, rule 2). */
  icon: IconData;
  blurb: string;
  order: number;
  /** Hub shows a drop zone that routes files to a tool. */
  fileBased: boolean;
  /** Hub sections; tools not listed fall into an unlabelled trailing group. */
  groups?: { id: string; label: string; toolIds: string[] }[];
}

/** Home and the hubs are generated from this table plus the registry. */
export const CATEGORIES = [
  {
    id: 'pdf',
    label: 'PDF',
    icon: fileText,
    blurb: 'Edit, sign, organise and convert PDFs in your browser.',
    order: 1,
    fileBased: true,
    groups: [
      { id: 'workspace', label: 'Workspace', toolIds: ['pdf-edit'] },
      {
        id: 'quick-tasks',
        label: 'Quick tasks',
        toolIds: [
          'pdf-merger',
          'pdf-splitter',
          'pdf-compressor',
          'images-to-pdf',
          'pdf-to-images',
          'pdf-to-text',
          'pdf-protect',
          'pdf-unlock',
        ],
      },
    ],
  },
  {
    id: 'text',
    label: 'Text',
    icon: type,
    blurb: 'Patterns, differences and logs.',
    order: 2,
    fileBased: true,
  },
  {
    id: 'data',
    label: 'Data',
    icon: table,
    blurb: 'View and generate structured data.',
    order: 3,
    fileBased: true,
  },
  {
    id: 'encoding',
    label: 'Encoding',
    icon: binary,
    blurb: 'Encode, decode and inspect tokens.',
    order: 4,
    fileBased: false,
  },
  {
    id: 'web',
    label: 'Web & dev',
    icon: globe,
    blurb: 'Requests, URLs and QR codes.',
    order: 5,
    fileBased: false,
  },
  {
    id: 'media',
    label: 'Media',
    icon: image,
    blurb: 'Images, colours and animations.',
    order: 6,
    fileBased: true,
  },
  {
    id: 'security',
    label: 'Security',
    icon: shield,
    blurb: 'Hashes, passwords and PDF protection.',
    order: 7,
    fileBased: false,
  },
  {
    id: 'math',
    label: 'Math',
    icon: calculator,
    blurb: 'Calculate and convert numbers and units.',
    order: 8,
    fileBased: false,
  },
  {
    id: 'time',
    label: 'Time',
    icon: clock,
    blurb: 'Dates and focus timers.',
    order: 9,
    fileBased: false,
  },
] as const satisfies readonly CategoryDef[];

const BY_ID = new Map<string, CategoryDef>(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): CategoryDef | undefined {
  return BY_ID.get(id);
}
