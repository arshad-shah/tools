import React, { useId } from 'react';
import {
  Badge,
  Card,
  CopyButton,
  Inline,
  Notice,
  Stack,
  Text,
} from '@arshad-shah/cynosure';

import type { SyntaxCheck } from '../lib/syntax';
import { FlagToggles } from './FlagToggles';
import {
  CodeEditor,
  type CodeRange,
  type EditorDiagnostic,
} from '@/shared/editor';

interface PatternBarProps {
  pattern: string;
  onPatternChange(pattern: string): void;
  flags: string;
  onToggleFlag(letter: string): void;
  syntax: SyntaxCheck;
  /** Span picked in Explain, highlighted in the pattern. */
  highlight: { start: number; end: number } | null;
  /** `/pattern/flags`, for its copy button. */
  literal: string;
}

/** The pattern editor, its flags, validity and an inline syntax error. */
export const PatternBar: React.FC<PatternBarProps> = ({
  pattern,
  onPatternChange,
  flags,
  onToggleFlag,
  syntax,
  highlight,
  literal,
}) => {
  const errorId = useId();
  const markers: EditorDiagnostic[] =
    !syntax.ok && syntax.column !== null
      ? [
          {
            line: 1,
            column: syntax.column,
            // The alert below carries the full message (one copy of it).
            message: `Syntax error at column ${syntax.column}`,
            severity: 'error',
          },
        ]
      : [];
  const ranges: CodeRange[] =
    highlight && highlight.end > highlight.start
      ? [{ ...highlight, kind: 'search' }]
      : [];

  return (
    <Card as="section" title="Pattern" headingLevel={2}>
      <Stack gap="4">
        <Inline gap="3" align="center">
          <Text variant="code" aria-hidden>
            /
          </Text>
          <Stack grow minSize="0">
            <CodeEditor
              value={pattern}
              onChange={onPatternChange}
              language="regex"
              aria-label="Regex pattern"
              singleLine
              placeholder="Enter a regular expression"
              diagnostics={markers}
              ranges={ranges}
              aria-describedby={syntax.ok ? undefined : errorId}
            />
          </Stack>
          <Text variant="code" aria-hidden>
            /{flags}
          </Text>
          <CopyButton
            value={literal}
            disabled={!pattern || !syntax.ok}
            labels={{
              copy: 'Copy regex with flags',
              copied: 'Copied the regex',
            }}
          />
        </Inline>
        <Inline gap="3" align="center" justify="between" wrap>
          <Inline gap="3" align="center">
            <Text size="sm" tone="muted" aria-hidden>
              Flags
            </Text>
            <FlagToggles flags={flags} onToggle={onToggleFlag} />
          </Inline>
          {pattern ? (
            <Badge tone={syntax.ok ? 'success' : 'danger'} size="sm">
              {syntax.ok ? 'Valid' : 'Invalid'}
            </Badge>
          ) : null}
        </Inline>
        {!syntax.ok ? (
          <Notice tone="danger" size="sm">
            <Text as="span" id={errorId}>
              {syntax.message}
            </Text>
          </Notice>
        ) : null}
      </Stack>
    </Card>
  );
};
