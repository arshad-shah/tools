import { useEffect, useRef } from 'react';
import {
  IconExtractPages,
  IconFileCode,
  IconFilePlus,
  IconFileText,
  IconImages,
} from '@/shared/ui/icons';
import { FilePicker, type ToolGroup } from '@/shared/ui';
import { ModeToolbar } from '../../ModeToolbar';
import type { ModeProps } from '../types';
import { IMAGE_ACCEPT, selectedPages, useConvertActions } from './actions';
import { useConvertRequest } from './ui-store';

/** Convert tools (spec 7.2): exports of the current view, and insert images. */
export function ConvertToolbar(ctx: ModeProps) {
  const act = useConvertActions(ctx);
  const none = selectedPages(ctx).length === 0;
  const pickRef = useRef<() => void>(() => {});
  const latest = useRef(act);
  const request = useConvertRequest();
  // A request made before this toolbar mounted is not replayed.
  const handled = useRef(request?.nonce ?? 0);

  useEffect(() => {
    latest.current = act;
  });

  // Palette commands arrive as requests; each runs once.
  useEffect(() => {
    if (!request || request.nonce === handled.current) return;
    handled.current = request.nonce;
    const a = latest.current;
    if (request.action === 'images') void a.images();
    else if (request.action === 'text') void a.text();
    else if (request.action === 'markdown') void a.markdown();
    else if (request.action === 'selected-pdf') void a.selectedPdf('download');
    else pickRef.current();
  }, [request]);

  const groups = (pickImages: () => void): ToolGroup[] => [
    {
      id: 'export',
      label: 'Export',
      items: [
        {
          id: 'to-images',
          label: 'Pages to images',
          icon: IconImages,
          kind: 'button',
          onSelect: () => void act.images(),
        },
        {
          id: 'to-text',
          label: 'Text',
          icon: IconFileText,
          kind: 'button',
          onSelect: () => void act.text(),
        },
        {
          id: 'to-markdown',
          label: 'Markdown (best-effort structure)',
          icon: IconFileCode,
          kind: 'button',
          onSelect: () => void act.markdown(),
        },
        {
          id: 'selected-pdf',
          label: 'Selected pages as PDF',
          icon: IconExtractPages,
          kind: 'split',
          disabled: none ? 'Select pages to export' : false,
          onSelect: () => void act.selectedPdf('download'),
          menu: [
            {
              id: 'selected-pdf-download',
              label: 'Download',
              onSelect: () => void act.selectedPdf('download'),
            },
            {
              id: 'selected-pdf-open',
              label: 'Open as new document',
              onSelect: () => void act.selectedPdf('open'),
            },
          ],
        },
      ],
    },
    {
      id: 'insert',
      label: 'Insert',
      items: [
        {
          id: 'insert-images',
          label: 'Insert images as pages',
          icon: IconFilePlus,
          kind: 'button',
          onSelect: pickImages,
        },
      ],
    },
  ];

  return (
    <FilePicker
      onFiles={(files) => void act.insertImages(files)}
      accept={IMAGE_ACCEPT}
      multiple
    >
      {(pick) => {
        pickRef.current = pick;
        return <ModeToolbar groups={groups(pick)} />;
      }}
    </FilePicker>
  );
}
