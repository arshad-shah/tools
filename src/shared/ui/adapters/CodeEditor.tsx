import type React from 'react';
import Editor from '@uiw/react-textarea-code-editor';
import { useTheme } from '@/shared/lib/theme';
import { cn } from '@/shared/lib/cn';

type EditorProps = React.ComponentProps<typeof Editor>;

export interface CodeEditorProps {
  value: string;
  language: string;
  onChange(value: string): void;
  /** Accessible name of the text area. */
  label: string;
  placeholder?: string;
  /** CSS px. */
  minHeight?: number;
  readOnly?: boolean;
  /** Syntax-highlighting plugins (e.g. rehype-prism-plus). */
  rehypePlugins?: EditorProps['rehypePlugins'];
  className?: string;
}

/**
 * Code text area with highlighting (@uiw/react-textarea-code-editor behind
 * the kit); its colour mode follows the theme.
 */
export function CodeEditor({
  value,
  language,
  onChange,
  label,
  placeholder,
  minHeight,
  readOnly,
  rehypePlugins,
  className,
}: CodeEditorProps) {
  const { resolved } = useTheme();
  return (
    <Editor
      value={value}
      language={language}
      placeholder={placeholder}
      aria-label={label}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      padding={15}
      minHeight={minHeight}
      data-color-mode={resolved}
      rehypePlugins={rehypePlugins}
      // "!": the editor's unlayered CSS sets font and background, and its
      // inline container style sets padding: 0; plain utilities lose to both.
      className={cn(
        'rounded-lg border border-line-strong bg-surface-2! pb-8! font-mono! text-[0.875rem]! text-fg!',
        className,
      )}
    />
  );
}
CodeEditor.displayName = 'CodeEditor';
