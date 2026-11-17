import { useEffect, useRef } from 'react';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import {
  crop as cropIcon,
  filePlus,
  pageDuplicate,
  pageExtract,
  pageLabel,
  pageMerge,
  pageRotate,
  pageRotateCcw,
  pageSplit,
  scale,
  trash,
} from '@arshad-shah/cynosure/icons';
import { FilePicker } from '../../ui/FilePicker';
import { type ToolGroup } from '../../ui/tool-groups';
import { RESTRICTED_MESSAGE } from '@/pdf/doc/restricted';
import { ModeToolbar } from '../../ModeToolbar';
import { useWorkspace } from '../../workspace-context';
import type { ModeProps } from '../types';
import {
  deleteBlocked,
  deletePages,
  duplicatePages,
  insertBlank,
  rotate,
  targetPages,
} from './actions';
import { useMergeIn } from './merge-in';
import { PageLabelsDialog } from './PageLabelsDialog';
import { PageSizeDialog } from './PageSizeDialog';
import { extractPages } from './split-extract';
import { SplitDialog } from './SplitDialog';
import { presentationFor } from './surface';
import { openOrganizeDialog, useOrganizeDialog } from './ui-store';

/** Organize tools (plan B-16 table): rotate, pages, shape, labels, files. */
export function OrganizeToolbar(ctx: ModeProps) {
  const ws = useWorkspace();
  const dialog = useOrganizeDialog();
  // A dialog belongs to this document: a new one (or none) closes it.
  const docId = ctx.doc.state.id;
  useEffect(() => () => openOrganizeDialog(null), [docId]);
  const merge = useMergeIn(ctx);
  const targets = targetPages(ctx);
  const blocked = deleteBlocked(ctx);
  const restricted = ctx.doc.state.restricted;
  const sizeAnchor = useRef<HTMLButtonElement>(null);
  const splitAnchor = useRef<HTMLButtonElement>(null);
  const presentation = presentationFor(ctx.layout);

  const extract = async (then: 'download' | 'open') => {
    const { model, blobs, services } = ws.session;
    const name = deriveFilename(model.getState().name, 'extract', 'pdf');
    try {
      const bytes = await ws.runJob('Extracting pages', (job) =>
        extractPages(model, blobs, targets, { ...job, services }),
      );
      if (!bytes) return;
      if (then === 'download') {
        saveBlob(bytes, name, 'application/pdf');
        notify.success(`Saved ${name}`);
      } else ws.openAsNew({ name, bytes });
    } catch (e) {
      notify.error(toToolError(e));
    }
  };

  const groups = (pickFile: () => void): ToolGroup[] => [
    {
      id: 'rotate',
      label: 'Rotate',
      items: [
        {
          id: 'rotate-left',
          label: 'Rotate left',
          icon: pageRotateCcw,
          shortcut: 'Shift+R',
          kind: 'button',
          onSelect: () => rotate(ctx, -90),
        },
        {
          id: 'rotate-right',
          label: 'Rotate right',
          icon: pageRotate,
          shortcut: 'R',
          kind: 'button',
          onSelect: () => rotate(ctx, 90),
        },
      ],
    },
    {
      id: 'pages',
      label: 'Pages',
      items: [
        {
          id: 'delete',
          label: 'Delete pages',
          icon: trash,
          shortcut: 'Delete',
          kind: 'button',
          disabled: blocked ?? false,
          onSelect: () => deletePages(ctx),
        },
        {
          id: 'duplicate',
          label: 'Duplicate pages',
          icon: pageDuplicate,
          shortcut: 'Mod+D',
          kind: 'button',
          onSelect: () => duplicatePages(ctx),
        },
        {
          id: 'insert-blank',
          label: 'Insert blank page',
          icon: filePlus,
          kind: 'button',
          onSelect: () => insertBlank(ctx),
        },
      ],
    },
    {
      id: 'shape',
      label: 'Shape',
      items: [
        {
          id: 'crop',
          label: 'Crop',
          icon: cropIcon,
          kind: 'toggle',
          pressed: ctx.tool.id === 'crop',
          onSelect: () => ctx.tool.set(ctx.tool.id === 'crop' ? null : 'crop'),
        },
        {
          id: 'size',
          label: 'Page size',
          icon: scale,
          kind: 'button',
          anchor: sizeAnchor,
          onSelect: () => openOrganizeDialog('size'),
        },
      ],
    },
    {
      id: 'labels',
      label: 'Labels',
      items: [
        {
          id: 'labels',
          label: 'Page labels',
          icon: pageLabel,
          kind: 'button',
          onSelect: () => openOrganizeDialog('labels'),
        },
      ],
    },
    {
      id: 'files',
      label: 'Files',
      items: [
        {
          id: 'merge-in',
          label: 'Merge in',
          icon: pageMerge,
          kind: 'button',
          onSelect: pickFile,
        },
        {
          id: 'extract',
          label: 'Extract pages',
          icon: pageExtract,
          kind: 'split',
          disabled: restricted
            ? RESTRICTED_MESSAGE
            : targets.length === 0
              ? 'Select pages to extract'
              : false,
          onSelect: () => void extract('download'),
          menu: [
            {
              id: 'extract-download',
              label: 'Download',
              onSelect: () => void extract('download'),
            },
            {
              id: 'extract-open',
              label: 'Open as new document',
              onSelect: () => void extract('open'),
            },
          ],
        },
        {
          id: 'split',
          label: 'Split',
          icon: pageSplit,
          kind: 'button',
          anchor: splitAnchor,
          disabled: restricted ? RESTRICTED_MESSAGE : false,
          onSelect: () => openOrganizeDialog('split'),
        },
      ],
    },
  ];

  const close = (o: boolean) => !o && openOrganizeDialog(null);
  return (
    <>
      <FilePicker
        onFiles={(files) => void merge.onFiles(files)}
        accept=".pdf,application/pdf"
      >
        {(pick) => <ModeToolbar groups={groups(pick)} />}
      </FilePicker>
      {merge.dialog}
      <PageSizeDialog
        open={dialog === 'size'}
        onOpenChange={close}
        ctx={ctx}
        pageIds={targets}
        surface={{ presentation, anchor: sizeAnchor }}
      />
      {dialog === 'labels' ? (
        <PageLabelsDialog open onOpenChange={close} ctx={ctx} />
      ) : null}
      <SplitDialog
        open={dialog === 'split'}
        onOpenChange={close}
        ctx={ctx}
        surface={{ presentation, anchor: splitAnchor }}
      />
    </>
  );
}
