import React, { useCallback } from 'react';
import { IconBarChart2, IconCheck, IconSparkles } from '@/shared/ui/icons';

import * as Diff from 'diff';
import {
  Badge,
  Box,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Center,
  Grid,
  Inline,
  Spinner,
  Stack,
  Text,
} from '@/shared/ui';
import type {
  DiffSegment,
  DiffSettings,
  DiffViewModeId,
  HighlightMode,
} from '../types';
import { pairInlineRows } from '../lib/inline';

interface DiffResultsProps {
  diffSegments: DiffSegment[];
  isDiffing: boolean;
  /** Both panes have text: an empty result then means "identical". */
  bothFilled: boolean;
  diffViewMode: DiffViewModeId;
  highlightMode: HighlightMode;
  diffSettings: DiffSettings;
}

/** The "Diff results" card: split, unified or inline rows. */
export const DiffResults: React.FC<DiffResultsProps> = ({
  diffSegments,
  isDiffing,
  bothFilled,
  diffViewMode,
  highlightMode,
  diffSettings,
}) => {
  const renderInlineDifferences = useCallback(
    (text1: string, text2: string, isLeftSide = true) => {
      if (!text1 && !text2)
        return (
          <Text as="span" size="sm" tone="subtle" className="italic">
            (empty line)
          </Text>
        );
      if (text1 === text2)
        return (
          <Text as="span" size="sm">
            {text1}
          </Text>
        );
      const diffResult =
        highlightMode === 'character'
          ? Diff.diffChars(text1, text2)
          : Diff.diffWordsWithSpace(text1, text2);
      return (
        <>
          {diffResult.map((part, idx) => {
            if (isLeftSide) {
              if (part.added) return null;
              return part.removed ? (
                <Badge key={idx} variant="soft" tone="danger" size="xs">
                  {part.value}
                </Badge>
              ) : (
                <Text key={idx} as="span" size="sm">
                  {part.value}
                </Text>
              );
            }
            if (part.removed) return null;
            return part.added ? (
              <Badge key={idx} variant="soft" tone="success" size="xs">
                {part.value}
              </Badge>
            ) : (
              <Text key={idx} as="span" size="sm">
                {part.value}
              </Text>
            );
          })}
        </>
      );
    },
    [highlightMode],
  );

  const renderDiffSegment = useCallback(
    (segment: DiffSegment, isLeftSide = true, comparisonText?: string) => {
      if (segment.isIntraline) {
        if (segment.added) {
          return (
            <Badge variant="soft" tone="success" size="xs">
              {segment.text}
            </Badge>
          );
        }
        if (segment.removed) {
          return (
            <Badge variant="soft" tone="danger" size="xs">
              {segment.text}
            </Badge>
          );
        }
        return (
          <Text as="span" size="sm">
            {segment.text}
          </Text>
        );
      }
      if (
        diffSettings.highlightIntralineChanges &&
        comparisonText &&
        segment.text !== comparisonText
      ) {
        return renderInlineDifferences(
          isLeftSide ? segment.text : comparisonText,
          isLeftSide ? comparisonText : segment.text,
          isLeftSide,
        );
      }
      return (
        <Text as="span" size="sm">
          {segment.text || (
            <Text as="span" size="sm" tone="subtle" className="italic">
              (empty line)
            </Text>
          )}
        </Text>
      );
    },
    [diffSettings.highlightIntralineChanges, renderInlineDifferences],
  );

  const lineMarkerColor = (
    segment: DiffSegment,
  ): 'success' | 'danger' | 'neutral' => {
    if (segment.added) return 'success';
    if (segment.removed) return 'danger';
    return 'neutral';
  };

  const lineMarker = (segment: DiffSegment): string => {
    if (segment.added) return '+';
    if (segment.removed) return '-';
    return ' ';
  };

  const renderSegmentRow = (
    segment: DiffSegment,
    isLeftSide: boolean,
    comparisonText: string | undefined,
    keyPrefix: string,
  ) => (
    <Inline key={keyPrefix} gap="2" align="center" wrap={false}>
      {diffSettings.showLineNumbers && (
        <Text size="xs" tone="subtle">
          {(isLeftSide
            ? segment.originalLineNumber
            : segment.modifiedLineNumber) || segment.lineNumber}
        </Text>
      )}
      <Badge variant="soft" tone={lineMarkerColor(segment)} size="xs">
        {lineMarker(segment)}
      </Badge>
      {renderDiffSegment(segment, isLeftSide, comparisonText)}
    </Inline>
  );

  const renderDiffContent = () => {
    if (isDiffing) {
      return (
        <Center className="py-8">
          <Inline align="center" gap="3">
            <Spinner size="md" />
            <Text size="sm" tone="subtle">
              Calculating differences…
            </Text>
          </Inline>
        </Center>
      );
    }
    if (!diffSegments.length) {
      if (bothFilled) {
        return (
          <Center className="py-8">
            <Stack gap="2" align="center">
              <IconCheck size="2xl" />
              <Text size="md" weight="semibold">
                No differences found
              </Text>
              <Text size="sm" tone="subtle">
                The texts are identical.
              </Text>
            </Stack>
          </Center>
        );
      }
      return (
        <Center className="py-8">
          <Stack gap="2" align="center">
            <IconSparkles size="2xl" />
            <Text size="md" weight="semibold">
              Ready to compare
            </Text>
            <Text size="sm" tone="subtle">
              Enter text in both panels to see differences.
            </Text>
          </Stack>
        </Center>
      );
    }

    if (diffViewMode === 'split') {
      const leftSegments = diffSegments.filter((s) => !s.added);
      const rightSegments = diffSegments.filter((s) => !s.removed);
      return (
        <Grid max={2} gap="3">
          <Stack gap="1">
            <Text
              size="xs"
              weight="semibold"
              tone="subtle"
              className="uppercase tracking-wider"
            >
              Original
            </Text>
            {leftSegments.map((segment, idx) => {
              const correspondingRight = rightSegments.find(
                (rs) =>
                  rs.lineNumber === segment.lineNumber ||
                  rs.originalLineNumber === segment.originalLineNumber,
              );
              return renderSegmentRow(
                segment,
                true,
                correspondingRight?.text,
                `left-${idx}`,
              );
            })}
          </Stack>
          <Stack gap="1">
            <Text
              size="xs"
              weight="semibold"
              tone="subtle"
              className="uppercase tracking-wider"
            >
              Modified
            </Text>
            {rightSegments.map((segment, idx) => {
              const correspondingLeft = leftSegments.find(
                (ls) =>
                  ls.lineNumber === segment.lineNumber ||
                  ls.modifiedLineNumber === segment.modifiedLineNumber,
              );
              return renderSegmentRow(
                segment,
                false,
                correspondingLeft?.text,
                `right-${idx}`,
              );
            })}
          </Stack>
        </Grid>
      );
    }

    if (diffViewMode === 'inline') {
      // Word and character modes diff the whole text into tokens: flow them
      // as running text with the removed and added parts highlighted in place.
      if (diffSegments.some((s) => s.isIntraline)) {
        return (
          <Box className="whitespace-pre-wrap">
            {diffSegments.map((segment, idx) => (
              <React.Fragment key={`inl-${idx}`}>
                {renderDiffSegment(segment)}
              </React.Fragment>
            ))}
          </Box>
        );
      }
      // Line mode: each modified line sits right under the original it
      // replaced, each highlighting its own changed parts.
      return (
        <Stack gap="1">
          {pairInlineRows(diffSegments).map((row, idx) =>
            row.kind === 'pair' ? (
              <Stack
                key={`inl-${idx}`}
                gap="1"
                className="border-b border-line pb-2"
              >
                {renderSegmentRow(
                  row.original,
                  true,
                  row.modified.text,
                  'orig',
                )}
                <Box className="pl-8">
                  {renderSegmentRow(
                    row.modified,
                    false,
                    row.original.text,
                    'mod',
                  )}
                </Box>
              </Stack>
            ) : (
              renderSegmentRow(
                row.segment,
                !row.segment.added,
                undefined,
                `inl-${idx}`,
              )
            ),
          )}
        </Stack>
      );
    }

    return (
      <Stack gap="1">
        {diffSegments.map((segment, idx) =>
          renderSegmentRow(segment, true, undefined, `uni-${idx}`),
        )}
      </Stack>
    );
  };

  return (
    <Card>
      <CardHeader>
        <Inline justify="between" align="center" wrap gap="2">
          <Inline align="center" gap="2">
            <IconBarChart2 size="md" />
            <CardTitle as="h3">Diff results</CardTitle>
          </Inline>
          {diffSegments.length > 0 && (
            <Badge variant="soft" tone="accent" size="sm">
              {diffSegments.length}{' '}
              {diffSettings.highlightIntralineChanges ? 'changes' : 'lines'}
            </Badge>
          )}
        </Inline>
      </CardHeader>
      <CardBody>
        <Box className="overflow-auto">{renderDiffContent()}</Box>
      </CardBody>
    </Card>
  );
};
