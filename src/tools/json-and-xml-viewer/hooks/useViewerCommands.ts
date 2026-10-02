import { copyText } from '@/shared/lib/clipboard';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import { useToolCommands, type ToolCommand } from '@/shared/lib/tool-commands';
import type { DocFormat } from '../lib/detect-format';
import type { DocNode } from '../lib/doc-model';
import { reformatText } from '../lib/format-doc';
import { toDisplayPath } from '../lib/paths';
import type { ViewerTab } from '../settings';
import type { ParsedDocument } from './useParsedDocument';

export const TAB_ORDER: ViewerTab[] = [
  'source',
  'tree',
  'map',
  'query',
  'convert',
];
export const TAB_LABEL: Record<ViewerTab, string> = {
  source: 'Source',
  tree: 'Tree',
  map: 'Map',
  query: 'Query',
  convert: 'Convert',
};

export interface ViewerCommandDeps {
  format: DocFormat;
  parsed: ParsedDocument;
  text: string;
  setText(t: string): void;
  selected: DocNode | null;
  tab: ViewerTab;
  setTab(t: ViewerTab): void;
  expandAll(): void;
  collapseAll(): void;
  focusSearch(): void;
  download(): void;
  indent: number;
}

/** The viewer's palette commands and shortcuts (spec §7.2 Commands). */
export function useViewerCommands(d: ViewerCommandDeps): void {
  const ready = d.parsed.doc !== null;
  const rewrite = (mode: 'pretty' | 'min') =>
    reformatText(d.text, d.format, mode, d.indent).then(
      d.setText,
      (e: unknown) => notify.error(toToolError(e)),
    );
  const commands: ToolCommand[] = [
    {
      id: 'format',
      label: 'Format document',
      shortcut: 'Mod+Shift+F',
      enabled: ready,
      run: () => void rewrite('pretty'),
    },
    {
      id: 'minify',
      label: 'Minify document',
      enabled: ready && d.format !== 'yaml',
      run: () => void rewrite('min'),
    },
    {
      id: 'copy-path',
      label: 'Copy path of the selection',
      shortcut: 'Mod+Shift+P',
      enabled: d.selected !== null,
      run: () => {
        if (!d.selected) return;
        copyText(toDisplayPath(d.selected.path)).then(
          () => notify.success('Path copied'),
          (e: unknown) => notify.error(toToolError(e)),
        );
      },
    },
    {
      id: 'focus-search',
      label: 'Search the tree',
      shortcut: '/',
      enabled: ready,
      run: d.focusSearch,
    },
    { id: 'expand-all', label: 'Expand all', enabled: ready, run: d.expandAll },
    {
      id: 'collapse-all',
      label: 'Collapse all',
      enabled: ready,
      run: d.collapseAll,
    },
    {
      id: 'download',
      label: 'Download document',
      enabled: ready,
      run: d.download,
    },
    {
      id: 'clear',
      label: 'Clear',
      shortcut: 'Mod+Shift+X',
      enabled: d.text !== '',
      run: () => d.setText(''),
    },
    ...TAB_ORDER.map((t, i) => ({
      id: `tab-${t}`,
      label: `Show ${TAB_LABEL[t]}`,
      group: 'View',
      shortcut: `Alt+${i + 1}`,
      enabled: t === 'source' || ready,
      run: () => d.setTab(t),
    })),
  ];
  useToolCommands('json-and-xml-viewer', commands);
}
