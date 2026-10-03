import { FilePicker } from './file-upload';
import {
  IconClipboard,
  IconCopy,
  IconDownload,
  IconEraser,
  IconFileText,
  IconFolderOpen,
} from './icons';
import { Select } from './select';
import { ENCODING_LABELS, type TextEncodingId } from './text-input-lib';
import { Toolbar, type ToolGroup, type ToolItem } from './toolbar';

export interface TextSample {
  label: string;
  value: string;
}

export const OPEN_SHORTCUT = 'Mod+O';
export const DOWNLOAD_SHORTCUT = 'Mod+S';

export interface TextInputToolbarProps {
  /** Tool-specific groups shown first (Undo and Redo, say). */
  groups?: ToolGroup[];
  readOnly: boolean;
  hasValue: boolean;
  accept?: string;
  samples?: readonly TextSample[];
  encodingOptions?: readonly TextEncodingId[];
  encoding: TextEncodingId;
  onEncoding(e: TextEncodingId): void;
  onPaste(): void;
  onFile(file: File): void;
  onSample(sample: TextSample): void;
  onClear(): void;
  onCopy?(): void;
  onDownload?(): void;
  openRef: React.RefObject<HTMLButtonElement | null>;
  downloadRef: React.RefObject<HTMLButtonElement | null>;
  /** Names the toolbar (for example "Input actions"). */
  label: string;
}

/**
 * The TextInputPanel's actions as a kit Toolbar: one Tab stop with roving
 * arrows, a named icon button and tooltip per action, labelled with words on
 * desktop. Like every kit Toolbar it stays one row that scrolls sideways
 * (edge fade) on narrow screens.
 */
export function TextInputToolbar({
  groups: extra,
  readOnly,
  hasValue,
  accept,
  samples,
  encodingOptions,
  encoding,
  onEncoding,
  onPaste,
  onFile,
  onSample,
  onClear,
  onCopy,
  onDownload,
  openRef,
  downloadRef,
  label,
}: TextInputToolbarProps) {
  const empty = hasValue ? undefined : 'Nothing to act on yet';
  const output = (): ToolItem[] => [
    ...(readOnly
      ? [
          {
            id: 'copy',
            label: 'Copy',
            icon: IconCopy,
            kind: 'button' as const,
            disabled: empty,
            onSelect: () => onCopy?.(),
          },
        ]
      : []),
    ...(onDownload
      ? [
          {
            id: 'download',
            label: 'Download',
            icon: IconDownload,
            kind: 'button' as const,
            shortcut: DOWNLOAD_SHORTCUT,
            disabled: empty,
            onSelect: onDownload,
            anchor: downloadRef,
          },
        ]
      : []),
  ];
  const input = (open: () => void): ToolItem[] => [
    {
      id: 'paste',
      label: 'Paste',
      icon: IconClipboard,
      kind: 'button',
      onSelect: onPaste,
    },
    {
      id: 'open',
      label: 'Open file',
      icon: IconFolderOpen,
      kind: 'button',
      shortcut: OPEN_SHORTCUT,
      onSelect: open,
      anchor: openRef,
    },
    ...(samples?.length === 1
      ? [
          {
            id: 'sample',
            label: 'Load sample',
            icon: IconFileText,
            kind: 'button' as const,
            onSelect: () => onSample(samples[0]),
          },
        ]
      : samples && samples.length > 1
        ? [
            {
              id: 'samples',
              label: 'Load a sample',
              icon: IconFileText,
              kind: 'menu' as const,
              menu: samples.map((sm) => ({
                id: sm.label,
                label: sm.label,
                onSelect: () => onSample(sm),
              })),
            },
          ]
        : []),
    {
      id: 'clear',
      label: 'Clear',
      icon: IconEraser,
      kind: 'button',
      disabled: empty,
      onSelect: onClear,
    },
  ];
  const encodingSelect =
    encodingOptions?.length && !readOnly ? (
      <div className="w-44">
        <Select
          aria-label="Encoding"
          value={encoding}
          onValueChange={(v) => onEncoding(v as TextEncodingId)}
          items={encodingOptions.map((e) => ({
            value: e,
            label: ENCODING_LABELS[e],
          }))}
          size="sm"
        />
      </div>
    ) : undefined;
  const bar = (open: () => void) => {
    const groups: ToolGroup[] = [...(extra ?? [])];
    if (!readOnly)
      groups.push({ id: 'input', label: 'Fill and clear', items: input(open) });
    const out = output();
    if (out.length) groups.push({ id: 'output', label: 'Export', items: out });
    return (
      <Toolbar
        label={label}
        groups={groups}
        trailing={encodingSelect}
        labelled
      />
    );
  };
  if (readOnly) return bar(() => {});
  return (
    <FilePicker accept={accept} onFiles={(files) => onFile(files[0])}>
      {bar}
    </FilePicker>
  );
}
