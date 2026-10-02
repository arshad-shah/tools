import type { ToolGroup } from '@/shared/ui';
import {
  IconCheckCheck,
  IconFileStack,
  IconOcrLanguage,
  IconOcrScan,
  IconTextLayer,
} from '@/shared/ui/icons';
import { OCR_LANGUAGE_LABELS, OCR_LANGUAGES } from '@/pdf/ocr/types';
import { ModeToolbar } from '../../ModeToolbar';
import type { ModeProps } from '../types';
import { runOcr, setLanguages } from './actions';
import { languageNames } from './languages';
import { setOcrUi, useOcrUi, type OcrPagesChoice } from './ui-store';

const PAGES: {
  id: OcrPagesChoice;
  label: string;
  icon: typeof IconTextLayer;
}[] = [
  { id: 'auto', label: 'Pages without text', icon: IconTextLayer },
  { id: 'force', label: 'All pages', icon: IconFileStack },
  { id: 'selected', label: 'Selected pages', icon: IconCheckCheck },
];

/**
 * OCR tools in one row (spec 11): which pages, Run OCR, and the language.
 * Run OCR asks for consent first while the data is not stored.
 */
export function OcrToolbar({ doc, selection }: ModeProps) {
  const ui = useOcrUi();
  const noSelection = ui.pages === 'selected' && selection.pages.size === 0;
  const run = () => {
    if (ui.cached) void runOcr(doc, selection.pages);
    // Not stored yet: the consent card in the inspector does the asking.
    else setOcrUi({ dismissed: false });
  };
  const groups: ToolGroup[] = [
    {
      id: 'pages',
      label: 'Pages',
      items: PAGES.map((p) => ({
        id: `pages-${p.id}`,
        label: p.label,
        icon: p.icon,
        kind: 'toggle' as const,
        pressed: ui.pages === p.id,
        onSelect: () => setOcrUi({ pages: p.id, error: null }),
      })),
    },
    {
      id: 'run',
      label: 'Recognise',
      items: [
        {
          id: 'run-ocr',
          label: 'Run OCR',
          icon: IconOcrScan,
          kind: 'button',
          disabled: ui.running
            ? 'OCR is running'
            : noSelection
              ? 'Select the pages to run OCR on'
              : false,
          onSelect: run,
        },
        {
          id: 'language',
          label: `Language: ${languageNames(ui.langs)}`,
          icon: IconOcrLanguage,
          kind: 'split',
          onSelect: () => setOcrUi({ dismissed: false }),
          menu: OCR_LANGUAGES.map((l) => ({
            id: `language-${l}`,
            label: OCR_LANGUAGE_LABELS[l],
            onSelect: () => setLanguages([l]),
          })),
        },
      ],
    },
  ];
  return <ModeToolbar groups={groups} />;
}
