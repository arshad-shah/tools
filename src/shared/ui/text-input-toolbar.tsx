import React from 'react';
import { IconButton } from './button';
import { FilePicker } from './file-upload';
import {
  IconClipboard,
  IconCopy,
  IconDownload,
  IconEraser,
  IconFileText,
  IconFolderOpen,
  type IconComponent,
} from './icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './menu';
import { Select } from './select';
import { ENCODING_LABELS, type TextEncodingId } from './text-input-lib';
import { Tooltip } from './tooltip';
import { useScrollRow } from './use-scroll-row';

export interface TextSample {
  label: string;
  value: string;
}

export const OPEN_SHORTCUT = 'Mod+O';
export const DOWNLOAD_SHORTCUT = 'Mod+S';

const ToolButton = React.forwardRef<
  HTMLButtonElement,
  {
    label: string;
    icon: IconComponent;
    shortcut?: string;
    onClick(): void;
    disabled?: boolean;
  }
>(({ label, icon, shortcut, onClick, disabled }, ref) => (
  <Tooltip content={label} shortcut={shortcut} side="bottom">
    <IconButton
      ref={ref}
      size="sm"
      variant="ghost"
      label={label}
      icon={icon}
      showLabel="desktop"
      onClick={onClick}
      disabled={disabled}
    />
  </Tooltip>
));
ToolButton.displayName = 'ToolButton';

export interface TextInputToolbarProps {
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
  openRef: React.Ref<HTMLButtonElement>;
  downloadRef: React.Ref<HTMLButtonElement>;
}

/**
 * The TextInputPanel's actions: each a named icon button with a tooltip,
 * labelled with words on desktop (6-H). Like the kit Toolbar, it stays one
 * row that scrolls sideways (edge fade) on narrow screens.
 */
export function TextInputToolbar({
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
}: TextInputToolbarProps) {
  const many = (samples?.length ?? 0) > 1;
  const row = useScrollRow<HTMLDivElement>('x');
  return (
    <div
      ref={row}
      className="flex min-w-0 max-w-full flex-nowrap items-center gap-1 overflow-x-auto overscroll-x-contain p-0.5 scrollbar-none scroll-fade-x [&>*]:shrink-0"
    >
      {encodingOptions?.length && !readOnly ? (
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
      ) : null}
      {readOnly ? (
        <ToolButton
          label="Copy"
          icon={IconCopy}
          onClick={() => onCopy?.()}
          disabled={!hasValue}
        />
      ) : (
        <>
          <ToolButton label="Paste" icon={IconClipboard} onClick={onPaste} />
          <FilePicker accept={accept} onFiles={(files) => onFile(files[0])}>
            {(open) => (
              <ToolButton
                ref={openRef}
                label="Open file"
                icon={IconFolderOpen}
                shortcut={OPEN_SHORTCUT}
                onClick={open}
              />
            )}
          </FilePicker>
          {samples?.length === 1 ? (
            <ToolButton
              label="Load sample"
              icon={IconFileText}
              onClick={() => onSample(samples[0])}
            />
          ) : null}
          {many ? (
            <DropdownMenu>
              <Tooltip content="Load a sample" side="bottom">
                <DropdownMenuTrigger>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    label="Load a sample"
                    icon={IconFileText}
                    showLabel="desktop"
                  />
                </DropdownMenuTrigger>
              </Tooltip>
              <DropdownMenuContent aria-label="Samples">
                {samples!.map((s) => (
                  <DropdownMenuItem key={s.label} onClick={() => onSample(s)}>
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <ToolButton
            label="Clear"
            icon={IconEraser}
            onClick={onClear}
            disabled={!hasValue}
          />
        </>
      )}
      {onDownload ? (
        <ToolButton
          ref={downloadRef}
          label="Download"
          icon={IconDownload}
          shortcut={DOWNLOAD_SHORTCUT}
          onClick={onDownload}
          disabled={!hasValue}
        />
      ) : null}
    </div>
  );
}
