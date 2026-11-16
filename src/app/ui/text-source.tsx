import {
  Button,
  FileInputBase,
  IconButton,
  Inline,
  Text,
} from '@arshad-shah/cynosure';
import {
  clipboardPaste,
  close,
  folderOpen,
  sparkles,
} from '@arshad-shah/cynosure/icons';
import React, { useEffect, useEffectEvent, useRef } from 'react';
import { readClipboardText } from '@/shared/lib/clipboard';
import { toToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { useHandoff, type HandoffPayload } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import {
  codePointCount,
  decodeText,
  lineCount,
  tooLarge,
  utf8Length,
} from '@/shared/ui/text-input-lib';

const NEVER = () => false;
const plural = (n: number, word: string) =>
  `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

export interface TextSourceActionsProps {
  /** The text the actions fill and clear. */
  value: string;
  onChange(text: string): void;
  /** The field's name, for "… cleared" and errors. */
  label: string;
  /** Fills the input with an example. */
  onExample?: () => void;
  /** Open file's accept list; leave out for any text file. */
  accept?: string;
  /** Takes a picked file itself (return true); otherwise it is read as text. */
  onFile?: (file: File) => boolean | void;
  /** Larger text (in UTF-8 bytes) is refused. */
  maxBytes?: number;
  /** Accept a text hand-off (`?handoff=`) this predicate matches, once. */
  handoff?: (p: HandoffPayload) => boolean;
  /** Characters, lines and bytes after the buttons. */
  counts?: boolean;
  /** More buttons after the standard ones. */
  children?: React.ReactNode;
}

/**
 * The actions under a text input in the transform pattern: Paste, Open
 * file, Try an example and Clear (with Undo), and the text's size.
 * Cynosure has no file-picker button, so Open file presses a hidden
 * FileInputBase (docs/cynosure-gaps.md).
 */
export function TextSourceActions({
  value,
  onChange,
  label,
  onExample,
  accept,
  onFile,
  maxBytes,
  handoff,
  counts = true,
  children,
}: TextSourceActionsProps) {
  const picker = useRef<HTMLInputElement>(null);

  const take = (text: string, what: string) => {
    if (maxBytes !== undefined && utf8Length(text) > maxBytes) {
      notify.error(tooLarge(what, maxBytes));
      return;
    }
    onChange(text);
  };

  const open = async (file: File) => {
    if (onFile?.(file) === true) return;
    if (maxBytes !== undefined && file.size > maxBytes) {
      notify.error(tooLarge(file.name, maxBytes));
      return;
    }
    try {
      take(decodeText(await readBytes(file), 'utf-8', file.name), file.name);
    } catch (e) {
      notify.error(toToolError(e, `Could not read ${file.name}`));
    }
  };

  const paste = async () => {
    try {
      take(await readClipboardText(), 'The clipboard text');
    } catch (e) {
      notify.error(toToolError(e, 'Could not read the clipboard'));
    }
  };

  const clear = () => {
    const previous = value;
    onChange('');
    notify.info(`${label} cleared`, {
      action: { label: 'Undo', onClick: () => onChange(previous) },
    });
  };

  // A matching text hand-off fills the input once.
  const payload = useHandoff(handoff ?? NEVER);
  const delivered = useRef<HandoffPayload | null>(null);
  const deliver = useEffectEvent((p: HandoffPayload) => {
    if (p.kind === 'text') take(p.text, p.filename ?? 'The handed-off text');
  });
  useEffect(() => {
    if (!payload || delivered.current === payload) return;
    delivered.current = payload;
    deliver(payload);
  }, [payload]);

  return (
    <Inline gap="3" align="center" justify="between" wrap>
      <Inline gap="2" align="center" wrap>
        <Button
          size="sm"
          variant="soft"
          icon={clipboardPaste}
          onClick={() => void paste()}
        >
          Paste
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={folderOpen}
          onClick={() => picker.current?.click()}
        >
          Open file
        </Button>
        <FileInputBase
          ref={picker}
          hidden
          tabIndex={-1}
          aria-hidden
          accept={accept}
          onFiles={(files) => {
            if (files[0]) void open(files[0]);
            if (picker.current) picker.current.value = '';
          }}
        />
        {onExample ? (
          <Button size="sm" variant="ghost" icon={sparkles} onClick={onExample}>
            Try an example
          </Button>
        ) : null}
        {children}
        {value ? (
          <IconButton
            size="sm"
            variant="ghost"
            tone="neutral"
            icon={close}
            label={`Clear ${label.toLowerCase()}`}
            onClick={clear}
          />
        ) : null}
      </Inline>
      {counts && value ? (
        <Text size="sm" tone="muted" numeric>
          {`${plural(codePointCount(value), 'character')}, ${plural(lineCount(value), 'line')}, ${plural(utf8Length(value), 'byte')}`}
        </Text>
      ) : null}
    </Inline>
  );
}
