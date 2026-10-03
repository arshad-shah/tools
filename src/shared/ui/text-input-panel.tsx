import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { useClipboard, readClipboardText } from '@/shared/lib/clipboard';
import { saveBlob } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { useHandoff, type HandoffPayload } from '@/shared/lib/handoff';
import { hotkeyLabel, matchesHotkey } from '@/shared/lib/hotkeys';
import { notify } from '@/shared/lib/notify';
import { Alert } from './alert';
import { Badge } from './badge';
import {
  CodeSurface,
  type CodeMarker,
  type CodeSurfaceHandle,
} from './code-surface';
import type { LanguageId } from '@/shared/lib/syntax/tokenize';
import { MetaList } from './meta-list';
import {
  codePointCount,
  decodeText,
  lineCount,
  tooLarge,
  utf8Length,
  type TextEncodingId,
} from './text-input-lib';
import {
  DOWNLOAD_SHORTCUT,
  OPEN_SHORTCUT,
  TextInputToolbar,
  type TextSample,
} from './text-input-toolbar';
import { useThrottled } from './use-throttled';

export type { TextSample } from './text-input-toolbar';
export type { TextEncodingId } from './text-input-lib';

const MB = 1024 * 1024;
const NEVER = () => false;
const plural = (n: number, word: string) =>
  `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;

export interface TextInputPanelProps {
  value: string;
  onChange(value: string): void;
  language: LanguageId | 'plain';
  /** Visible label; names the editor (the group is "<label> panel"). */
  label: string;
  /** File input accept attribute for Open file. */
  accept?: string;
  samples?: readonly TextSample[];
  /** Adds Download, saving the text under this name. */
  downloadName?: string;
  /** Adds an encoding picker for opened and dropped files (first is default). */
  encodingOptions?: readonly TextEncodingId[];
  /** Accepts a text hand-off (`?handoff=`) this predicate matches, once. */
  handoff?: (p: HandoffPayload) => boolean;
  /** Larger input is refused with TOO_LARGE. */
  maxBytes?: number;
  /** Above this a "Large input" badge shows. Default 5 MB. */
  warnBytes?: number;
  markers?: readonly CodeMarker[];
  /** Output pane: read-only, with Copy (and Download when named). */
  readOnly?: boolean;
  extraMeta?: React.ReactNode[];
  /** Read files containing NUL bytes as text instead of refusing them. */
  acceptBinary?: boolean;
  /**
   * Raw access to an opened or dropped file. Return true when the tool
   * handled it; the panel then does not read it as text.
   */
  onFile?(file: File): boolean | void;
  /** Called with every error the panel shows (TOO_LARGE, INVALID_FILE). */
  onError?(error: ToolError): void;
  placeholder?: string;
  wrap?: boolean;
  minHeight?: number | string;
  maxHeight?: number | string;
  className?: string;
  /** The editor, for selecting a range from outside (source sync). */
  editorRef?: React.Ref<CodeSurfaceHandle>;
  /** Caret or selection moves in the editor (offsets into `value`). */
  onSelectionChange?(start: number, end: number): void;
}

/**
 * The one source panel for text tools (spec §4.1): a labelled group with a
 * toolbar (Paste, Open file, Sample, Clear, Download; Copy when read-only),
 * a CodeSurface, file drop, hand-off intake, size limits and a polite
 * status line (characters, lines, UTF-8 bytes) updated at most once a
 * second. Errors show inline as an alert and go to `onError`.
 */
export function TextInputPanel({
  value,
  onChange,
  language,
  label,
  accept,
  samples,
  downloadName,
  encodingOptions,
  handoff,
  maxBytes,
  warnBytes = 5 * MB,
  markers,
  readOnly = false,
  extraMeta,
  acceptBinary = false,
  onFile,
  onError,
  placeholder,
  wrap,
  minHeight = 160,
  maxHeight,
  className,
  editorRef,
  onSelectionChange,
}: TextInputPanelProps) {
  const [error, setError] = useState<ToolError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [encoding, setEncoding] = useState<TextEncodingId>(
    encodingOptions?.[0] ?? 'utf-8',
  );
  const [lastFile, setLastFile] = useState<{ file: File; text: string }>();
  const openRef = useRef<HTMLButtonElement>(null);
  const downloadRef = useRef<HTMLButtonElement>(null);
  const { copy } = useClipboard();

  const fail = (e: ToolError) => {
    setError(e);
    onError?.(e);
  };
  const overLimit = (text: string) =>
    maxBytes !== undefined &&
    text.length * 3 > maxBytes &&
    (text.length > maxBytes || utf8Length(text) > maxBytes);

  /** Takes new text from any source, enforcing maxBytes. */
  const accept_ = (text: string, what: string) => {
    if (overLimit(text)) {
      fail(tooLarge(what, maxBytes!));
      return false;
    }
    setError(null);
    setNotice(null);
    onChange(text);
    return true;
  };

  const readFile = async (file: File, enc = encoding) => {
    if (onFile?.(file) === true) return;
    if (maxBytes !== undefined && file.size > maxBytes) {
      fail(tooLarge(file.name, maxBytes));
      return;
    }
    try {
      const text = decodeText(
        await readBytes(file),
        enc,
        file.name,
        acceptBinary,
      );
      if (accept_(text, file.name)) setLastFile({ file, text });
    } catch (e) {
      fail(toToolError(e, `Couldn't read ${file.name}`));
    }
  };

  const onPaste = async () => {
    try {
      accept_(await readClipboardText(), 'The clipboard text');
    } catch {
      setNotice(
        `Clipboard access was blocked; press ${hotkeyLabel('Mod+V')} in the editor instead`,
      );
    }
  };

  const onClear = () => {
    const previous = value;
    accept_('', 'The text');
    notify.info(`${label} cleared`, {
      action: { label: 'Undo', onClick: () => onChange(previous) },
    });
  };

  const onEncoding = (next: TextEncodingId) => {
    setEncoding(next);
    if (lastFile && lastFile.text === value) void readFile(lastFile.file, next);
  };

  // Hand-off: fill from a matching text payload once.
  const payload = useHandoff(handoff ?? NEVER);
  const delivered = useRef<HandoffPayload | null>(null);
  const deliver = useEffectEvent((p: HandoffPayload) => {
    if (p.kind === 'text') accept_(p.text, p.filename ?? 'The handed-off text');
  });
  useEffect(() => {
    if (!payload || delivered.current === payload) return;
    delivered.current = payload;
    deliver(payload);
  }, [payload]);

  const hasFiles = (e: React.DragEvent) =>
    !readOnly && Array.from(e.dataTransfer?.types ?? []).includes('Files');
  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null))
        setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      setDragging(false);
      if (!hasFiles(e)) return;
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) void readFile(file);
    },
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!readOnly && matchesHotkey(e, OPEN_SHORTCUT)) {
      e.preventDefault();
      openRef.current?.click();
    } else if (downloadName && matchesHotkey(e, DOWNLOAD_SHORTCUT)) {
      e.preventDefault();
      downloadRef.current?.click();
    }
  };

  const shown = useThrottled(value, 1000);
  const bytes = utf8Length(shown);
  const meta = [
    plural(codePointCount(shown), 'character'),
    plural(lineCount(shown), 'line'),
    plural(bytes, 'byte'),
    ...(extraMeta ?? []),
  ];

  return (
    <div
      role="group"
      aria-label={`${label} panel`}
      className={cn('flex flex-col gap-2', className)}
      onKeyDown={onKeyDown}
      {...dropHandlers}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-fg">{label}</span>
        <TextInputToolbar
          readOnly={readOnly}
          hasValue={value.length > 0}
          accept={accept}
          samples={samples}
          encodingOptions={encodingOptions}
          encoding={encoding}
          onEncoding={onEncoding}
          onPaste={() => void onPaste()}
          onFile={(f) => void readFile(f)}
          onSample={(s) => accept_(s.value, s.label)}
          onClear={onClear}
          onCopy={() => void copy(value)}
          onDownload={
            downloadName
              ? () =>
                  saveBlob(
                    new Blob([value], { type: 'text/plain;charset=utf-8' }),
                    downloadName,
                  )
              : undefined
          }
          openRef={openRef}
          downloadRef={downloadRef}
          label={`${label} actions`}
        />
      </div>
      {notice ? (
        <Alert status="warning" className="p-3 text-sm">
          {notice}
        </Alert>
      ) : null}
      {error ? (
        <Alert
          status="danger"
          className="p-3 text-sm"
          data-error-code={error.code}
        >
          {error.message}
        </Alert>
      ) : null}
      <CodeSurface
        ref={editorRef}
        onSelectionChange={onSelectionChange}
        value={value}
        onChange={readOnly ? undefined : (v) => accept_(v, 'The text')}
        language={language}
        label={label}
        readOnly={readOnly}
        markers={markers}
        placeholder={placeholder}
        wrap={wrap}
        minHeight={minHeight}
        maxHeight={maxHeight}
        className={
          dragging
            ? 'outline-2 outline-offset-2 outline-dashed outline-accent-indicator'
            : undefined
        }
      />
      <div
        aria-live="polite"
        className="flex flex-wrap items-center gap-2"
        data-status-line=""
      >
        <MetaList items={meta} />
        {bytes > warnBytes ? (
          <Badge tone="warning" size="sm">
            Large input
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
TextInputPanel.displayName = 'TextInputPanel';
