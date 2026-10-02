import type { Command } from '@/shared/lib/commands';
import { OCR_OPS } from '@/pdf/doc/ops';
import type { ModeContext, ModeModule } from '../types';
import { refreshCached, removeData, runOcr } from './actions';
import { OcrInspector } from './OcrInspector';
import { OcrRailBadge } from './RailBadge';
import { OcrToolbar } from './OcrToolbar';
import { getOcrUi, setOcrUi } from './ui-store';

const GROUP = 'OCR';

function commands(ctx: ModeContext): Command[] {
  return [
    {
      id: 'ocr-run',
      label: 'Run OCR',
      keywords: ['text', 'recognise', 'searchable', 'scan'],
      group: GROUP,
      run: () => {
        if (getOcrUi().cached) void runOcr(ctx.doc, ctx.selection.pages);
        else setOcrUi({ dismissed: false });
      },
    },
    {
      id: 'ocr-remove-data',
      label: 'Remove OCR data',
      group: GROUP,
      run: () => void removeData(ctx.doc),
    },
  ];
}

const mode: ModeModule = {
  operations: [...OCR_OPS],
  Toolbar: OcrToolbar,
  Inspector: OcrInspector,
  inspectorPinned: true,
  RailBadge: OcrRailBadge,
  commands,
  onEnter: () => void refreshCached(),
};

export default mode;
