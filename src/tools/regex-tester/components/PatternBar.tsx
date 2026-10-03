import React, { useId } from 'react';
import {
  Alert,
  Badge,
  Box,
  Card,
  CardBody,
  CodeSurface,
  CopyButton,
  Inline,
  Stack,
  Text,
  type CodeMarker,
  type CodeRange,
} from '@/shared/ui';
import type { SyntaxCheck } from '../lib/syntax';
import { FlagToggles } from './FlagToggles';

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
  const markers: CodeMarker[] =
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
    <Card>
      <CardBody>
        <Stack gap="3">
          <Inline gap="2" align="center" className="w-full">
            <Text as="span" mono weight="semibold" aria-hidden>
              /
            </Text>
            <Box className="min-w-0 flex-1">
              <CodeSurface
                value={pattern}
                onChange={onPatternChange}
                language="regex"
                label="Regex pattern"
                singleLine
                placeholder="Enter a regular expression"
                markers={markers}
                ranges={ranges}
                aria-describedby={syntax.ok ? undefined : errorId}
              />
            </Box>
            <Text as="span" mono weight="semibold" aria-hidden>
              /{flags}
            </Text>
            <CopyButton
              label="regex with flags"
              value={literal}
              size="md"
              disabled={!pattern || !syntax.ok}
            />
          </Inline>
          <Inline gap="3" align="center" justify="between" wrap>
            <Inline gap="2" align="center" wrap={false}>
              <Text as="span" size="sm" tone="muted" aria-hidden>
                Flags
              </Text>
              <FlagToggles flags={flags} onToggle={onToggleFlag} />
            </Inline>
            {pattern ? (
              <Badge
                variant="soft"
                tone={syntax.ok ? 'success' : 'danger'}
                size="sm"
              >
                {syntax.ok ? 'Valid' : 'Invalid'}
              </Badge>
            ) : null}
          </Inline>
          {!syntax.ok && (
            <Alert status="danger" size="sm" id={errorId}>
              {syntax.message}
            </Alert>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};
