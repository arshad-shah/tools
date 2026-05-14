import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart2,
  Check,
  Code as CodeIcon,
  Copy,
  Download,
  FileUp,
  MoveRight,
  Play,
  RotateCcw,
  Sparkles,
  Split,
  Trash,
} from 'lucide-react';
import * as Diff from 'diff';
import {
  Alert,
  AlertDescription,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Center,
  Grid,
  Heading,
  IconButton,
  Inline,
  Spinner,
  Stack,
  Text,
  Textarea,
} from '@arshad-shah/cynosure-react';
import { DiffSegment, DiffViewMode } from '../../types/TextDiffCheckerTypes';
import useNotification from './hooks/useNotification';
import useDiffSettings from './hooks/useDiffSettings';
import useIntelligentDiff from './hooks/useIntelligentDiff';

const VIEW_MODES: DiffViewMode[] = [
  { id: 'split', name: 'Split', icon: <Split size={14} aria-hidden /> },
  { id: 'unified', name: 'Unified', icon: <MoveRight size={14} aria-hidden /> },
  { id: 'inline', name: 'Inline', icon: <CodeIcon size={14} aria-hidden /> },
];

interface DiffTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  disabled?: boolean;
  onFileUpload?: () => void;
  onCopy?: () => void;
  onClear?: () => void;
}

const DiffTextArea: React.FC<DiffTextAreaProps> = ({
  value,
  onChange,
  placeholder,
  label,
  disabled,
  onFileUpload,
  onCopy,
  onClear,
}) => (
  <Card variant="elevated" size="md">
    <CardHeader>
      <Inline justify="between" align="center" wrap gap="2">
        <Inline align="center" gap="2">
          <Sparkles size={16} aria-hidden />
          <CardTitle as="h3">{label}</CardTitle>
        </Inline>
        <Inline gap="1">
          {onFileUpload && (
            <IconButton
              variant="ghost"
              colorScheme="neutral"
              size="sm"
              label="Upload file"
              disabled={disabled}
              icon={<FileUp size={14} />}
              onClick={onFileUpload}
            />
          )}
          {onCopy && (
            <IconButton
              variant="ghost"
              colorScheme="neutral"
              size="sm"
              label="Copy"
              disabled={!value || disabled}
              icon={<Copy size={14} />}
              onClick={onCopy}
            />
          )}
          {onClear && (
            <IconButton
              variant="ghost"
              colorScheme="neutral"
              size="sm"
              label="Clear"
              disabled={!value || disabled}
              icon={<RotateCcw size={14} />}
              onClick={onClear}
            />
          )}
        </Inline>
      </Inline>
    </CardHeader>
    <CardBody>
      <Textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={12}
        spellCheck={false}
        aria-label={label}
      />
    </CardBody>
  </Card>
);

const TextDiffChecker: React.FC = () => {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [diffViewMode, setDiffViewMode] = useState<'split' | 'unified' | 'inline'>('split');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [highlightMode, setHighlightMode] = useState<
    'character' | 'word' | 'line'
  >('word');

  const { notification, showNotification } = useNotification();
  const { diffSettings, updateDiffSetting, resetSettings } = useDiffSettings();
  const {
    diffSegments,
    diffStats,
    isDiffing,
    performanceWarning,
    calculateDiff,
    debouncedCalculateDiff,
    clearDiff,
  } = useIntelligentDiff();

  const leftFileInputRef = useRef<HTMLInputElement>(null);
  const rightFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoRefresh && (leftText || rightText)) {
      debouncedCalculateDiff(leftText, rightText, diffSettings, highlightMode);
    }
  }, [
    leftText,
    rightText,
    autoRefresh,
    diffSettings,
    highlightMode,
    debouncedCalculateDiff,
  ]);

  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard
        .writeText(text)
        .then(() => showNotification('Copied to clipboard!', 'success'))
        .catch(() => showNotification('Failed to copy', 'error'));
    },
    [showNotification],
  );

  const handleFileUpload = useCallback(
    (side: 'left' | 'right', e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        showNotification('File too large. Maximum size is 10MB.', 'error');
        return;
      }
      const allowedTypes = [
        'text/plain',
        'text/csv',
        'application/json',
        'text/html',
        'text/css',
        'text/javascript',
      ];
      const isTextFile =
        allowedTypes.includes(file.type) ||
        file.name.match(/\.(txt|md|json|html|css|js|ts|jsx|tsx|xml|yaml|yml|log)$/i);
      if (!isTextFile) {
        showNotification('Please select a text file', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (side === 'left') setLeftText(content);
        else setRightText(content);
        showNotification(`${file.name} loaded successfully`, 'success');
      };
      reader.onerror = () => showNotification('Failed to read file', 'error');
      reader.readAsText(file);
      e.target.value = '';
    },
    [showNotification],
  );

  const swapTexts = useCallback(() => {
    setLeftText(rightText);
    setRightText(leftText);
    showNotification('Texts swapped', 'info');
  }, [leftText, rightText, showNotification]);

  const clearAll = useCallback(() => {
    if (leftText || rightText) {
      setLeftText('');
      setRightText('');
      clearDiff();
      showNotification('All cleared', 'info');
    }
  }, [leftText, rightText, clearDiff, showNotification]);

  const exportResults = useCallback(() => {
    if (!diffSegments.length) {
      showNotification('No diff results to export', 'error');
      return;
    }
    const exportData = {
      timestamp: new Date().toISOString(),
      statistics: diffStats,
      settings: diffSettings,
      results: diffSegments.map((s) => ({
        text: s.text,
        type: s.type || (s.added ? 'added' : s.removed ? 'removed' : 'unchanged'),
        lineNumber: s.lineNumber,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diff-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Results exported successfully', 'success');
  }, [diffSegments, diffStats, diffSettings, showNotification]);

  const manualRefresh = useCallback(() => {
    if (!autoRefresh) {
      try {
        calculateDiff(leftText, rightText, diffSettings, highlightMode);
        showNotification('Diff recalculated', 'info');
      } catch {
        showNotification('Error calculating differences', 'error');
      }
    }
  }, [
    autoRefresh,
    calculateDiff,
    leftText,
    rightText,
    diffSettings,
    highlightMode,
    showNotification,
  ]);

  const renderInlineDifferences = useCallback(
    (text1: string, text2: string, isLeftSide = true) => {
      if (!text1 && !text2)
        return (
          <Text as="span" size="sm" variant="caption" italic>
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
                <Badge key={idx} variant="soft" colorScheme="danger" size="xs">
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
              <Badge key={idx} variant="soft" colorScheme="success" size="xs">
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
            <Badge variant="soft" colorScheme="success" size="xs">
              {segment.text}
            </Badge>
          );
        }
        if (segment.removed) {
          return (
            <Badge variant="soft" colorScheme="danger" size="xs">
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
            <Text as="span" size="sm" variant="caption" italic>
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
        <Text size="xs" variant="caption">
          {(isLeftSide
            ? segment.originalLineNumber
            : segment.modifiedLineNumber) || segment.lineNumber}
        </Text>
      )}
      <Badge
        variant="soft"
        colorScheme={lineMarkerColor(segment)}
        size="xs"
        shape="square"
      >
        {lineMarker(segment)}
      </Badge>
      {renderDiffSegment(segment, isLeftSide, comparisonText)}
    </Inline>
  );

  const renderDiffContent = () => {
    if (isDiffing) {
      return (
        <Center paddingY="8">
          <Inline align="center" gap="3">
            <Spinner size="md" colorScheme="accent" />
            <Text size="sm" variant="caption">
              Calculating differences…
            </Text>
          </Inline>
        </Center>
      );
    }
    if (!diffSegments.length) {
      if (leftText && rightText) {
        return (
          <Center paddingY="8">
            <Stack gap="2" align="center">
              <Check size={32} aria-hidden />
              <Text size="md" weight="semibold">
                No differences found
              </Text>
              <Text size="sm" variant="caption">
                The texts are identical.
              </Text>
            </Stack>
          </Center>
        );
      }
      return (
        <Center paddingY="8">
          <Stack gap="2" align="center">
            <Sparkles size={32} aria-hidden />
            <Text size="md" weight="semibold">
              Ready to compare
            </Text>
            <Text size="sm" variant="caption">
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
        <Grid columns={{ base: 1, md: 2 }} gap="3">
          <Stack gap="1">
            <Text size="xs" weight="semibold" variant="overline">
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
            <Text size="xs" weight="semibold" variant="overline">
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

    return (
      <Stack gap="1">
        {diffSegments.map((segment, idx) =>
          renderSegmentRow(segment, true, undefined, `uni-${idx}`),
        )}
      </Stack>
    );
  };

  return (
    <Stack gap="4">
      <input
        type="file"
        ref={leftFileInputRef}
        onChange={(e) => handleFileUpload('left', e)}
        accept=".txt,.md,.json,.html,.css,.js,.ts,.jsx,.tsx,.xml,.yaml,.yml,.log"
        hidden
      />
      <input
        type="file"
        ref={rightFileInputRef}
        onChange={(e) => handleFileUpload('right', e)}
        accept=".txt,.md,.json,.html,.css,.js,.ts,.jsx,.tsx,.xml,.yaml,.yml,.log"
        hidden
      />

      <Card variant="elevated" size="md">
        <CardBody>
          <Stack gap="4">
            <Inline justify="between" align="center" wrap gap="3">
              <Inline align="center" gap="2">
                <Split size={20} aria-hidden />
                <Heading level={2} size="lg" weight="semibold">
                  Text Diff Checker
                </Heading>
              </Inline>
              <Inline gap="2" wrap>
                <Button
                  variant={showStats ? 'solid' : 'soft'}
                  colorScheme={showStats ? 'accent' : 'neutral'}
                  size="sm"
                  leftIcon={<BarChart2 size={14} />}
                  onClick={() => setShowStats(!showStats)}
                >
                  Stats
                </Button>
                <Button
                  variant={autoRefresh ? 'solid' : 'soft'}
                  colorScheme={autoRefresh ? 'success' : 'neutral'}
                  size="sm"
                  leftIcon={<Play size={14} />}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? 'Auto' : 'Manual'}
                </Button>
                {!autoRefresh && (
                  <Button
                    variant="soft"
                    colorScheme="neutral"
                    size="sm"
                    leftIcon={<RotateCcw size={14} />}
                    disabled={isDiffing}
                    onClick={manualRefresh}
                  >
                    Refresh
                  </Button>
                )}
                <Button
                  variant="soft"
                  colorScheme="neutral"
                  size="sm"
                  leftIcon={<ArrowRightLeft size={14} />}
                  disabled={isDiffing}
                  onClick={swapTexts}
                >
                  Swap
                </Button>
                <Button
                  variant="soft"
                  colorScheme="neutral"
                  size="sm"
                  leftIcon={<Download size={14} />}
                  disabled={!diffSegments.length}
                  onClick={exportResults}
                >
                  Export
                </Button>
                <Button
                  variant="soft"
                  colorScheme="danger"
                  size="sm"
                  leftIcon={<Trash size={14} />}
                  disabled={isDiffing}
                  onClick={clearAll}
                >
                  Clear
                </Button>
              </Inline>
            </Inline>

            <ButtonGroup>
              {VIEW_MODES.map((mode) => (
                <Button
                  key={mode.id}
                  variant={diffViewMode === mode.id ? 'solid' : 'soft'}
                  colorScheme={diffViewMode === mode.id ? 'accent' : 'neutral'}
                  size="sm"
                  leftIcon={mode.icon}
                  onClick={() => setDiffViewMode(mode.id as typeof diffViewMode)}
                >
                  {mode.name}
                </Button>
              ))}
            </ButtonGroup>
          </Stack>
        </CardBody>
      </Card>

      <Card variant="filled" size="md">
        <CardBody>
          <Stack gap="3">
            <Inline gap="2" wrap>
              <Button
                variant={diffSettings.ignoreWhitespace ? 'solid' : 'soft'}
                colorScheme={diffSettings.ignoreWhitespace ? 'accent' : 'neutral'}
                size="sm"
                onClick={() =>
                  updateDiffSetting(
                    'ignoreWhitespace',
                    !diffSettings.ignoreWhitespace,
                  )
                }
              >
                Ignore whitespace
              </Button>
              <Button
                variant={diffSettings.ignoreCase ? 'solid' : 'soft'}
                colorScheme={diffSettings.ignoreCase ? 'accent' : 'neutral'}
                size="sm"
                onClick={() =>
                  updateDiffSetting('ignoreCase', !diffSettings.ignoreCase)
                }
              >
                Ignore case
              </Button>
              <Button
                variant={diffSettings.highlightIntralineChanges ? 'solid' : 'soft'}
                colorScheme={
                  diffSettings.highlightIntralineChanges ? 'accent' : 'neutral'
                }
                size="sm"
                onClick={() =>
                  updateDiffSetting(
                    'highlightIntralineChanges',
                    !diffSettings.highlightIntralineChanges,
                  )
                }
              >
                Intraline changes
              </Button>
              <Button
                variant={diffSettings.showLineNumbers ? 'solid' : 'soft'}
                colorScheme={
                  diffSettings.showLineNumbers ? 'accent' : 'neutral'
                }
                size="sm"
                onClick={() =>
                  updateDiffSetting(
                    'showLineNumbers',
                    !diffSettings.showLineNumbers,
                  )
                }
              >
                Line numbers
              </Button>
              <Button
                variant="ghost"
                colorScheme="neutral"
                size="sm"
                leftIcon={<RotateCcw size={14} />}
                onClick={resetSettings}
              >
                Reset
              </Button>
            </Inline>

            <Inline gap="2" wrap align="center">
              <Text size="sm" variant="caption">
                Highlight level:
              </Text>
              <ButtonGroup>
                {(['character', 'word', 'line'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={highlightMode === mode ? 'solid' : 'soft'}
                    colorScheme={highlightMode === mode ? 'accent' : 'neutral'}
                    size="sm"
                    onClick={() => setHighlightMode(mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </ButtonGroup>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      {showStats && diffStats && (
        <Grid columns={{ base: 2, md: 5 }} gap="3">
          <Card variant="filled" size="sm">
            <CardBody>
              <Stack gap="1">
                <Text size="xs" variant="caption">
                  Additions
                </Text>
                <Inline gap="2" align="center">
                  <Badge variant="soft" colorScheme="success" size="md">
                    {diffStats.additions}
                  </Badge>
                </Inline>
              </Stack>
            </CardBody>
          </Card>
          <Card variant="filled" size="sm">
            <CardBody>
              <Stack gap="1">
                <Text size="xs" variant="caption">
                  Deletions
                </Text>
                <Inline gap="2" align="center">
                  <Badge variant="soft" colorScheme="danger" size="md">
                    {diffStats.deletions}
                  </Badge>
                </Inline>
              </Stack>
            </CardBody>
          </Card>
          <Card variant="filled" size="sm">
            <CardBody>
              <Stack gap="1">
                <Text size="xs" variant="caption">
                  Changes
                </Text>
                <Inline gap="2" align="center">
                  <Badge variant="soft" colorScheme="warning" size="md">
                    {diffStats.changes}
                  </Badge>
                </Inline>
              </Stack>
            </CardBody>
          </Card>
          <Card variant="filled" size="sm">
            <CardBody>
              <Stack gap="1">
                <Text size="xs" variant="caption">
                  Unchanged
                </Text>
                <Inline gap="2" align="center">
                  <Badge variant="soft" colorScheme="accent" size="md">
                    {diffStats.unchanged}
                  </Badge>
                </Inline>
              </Stack>
            </CardBody>
          </Card>
          <Card variant="filled" size="sm">
            <CardBody>
              <Stack gap="1">
                <Text size="xs" variant="caption">
                  Change rate
                </Text>
                <Inline gap="2" align="center">
                  <Badge variant="soft" colorScheme="accent" size="md">
                    {diffStats.changePercentage}%
                  </Badge>
                </Inline>
              </Stack>
            </CardBody>
          </Card>
        </Grid>
      )}

      {performanceWarning && (
        <Alert
          status="warning"
          variant="soft"
          icon={<AlertTriangle aria-hidden />}
        >
          <AlertDescription>
            Large text detected. Performance may be affected.
          </AlertDescription>
        </Alert>
      )}

      <Grid columns={{ base: 1, md: 2 }} gap="4">
        <DiffTextArea
          value={leftText}
          onChange={setLeftText}
          placeholder="Paste your original text here…"
          label="Original text"
          disabled={isDiffing}
          onFileUpload={() => leftFileInputRef.current?.click()}
          onCopy={() => copyToClipboard(leftText)}
          onClear={() => setLeftText('')}
        />
        <DiffTextArea
          value={rightText}
          onChange={setRightText}
          placeholder="Paste your modified text here…"
          label="Modified text"
          disabled={isDiffing}
          onFileUpload={() => rightFileInputRef.current?.click()}
          onCopy={() => copyToClipboard(rightText)}
          onClear={() => setRightText('')}
        />
      </Grid>

      <Card variant="elevated" size="md">
        <CardHeader>
          <Inline justify="between" align="center" wrap gap="2">
            <Inline align="center" gap="2">
              <BarChart2 size={18} aria-hidden />
              <CardTitle as="h3">Diff results</CardTitle>
            </Inline>
            {diffSegments.length > 0 && (
              <Badge variant="soft" colorScheme="accent" size="sm">
                {diffSegments.length}{' '}
                {diffSettings.highlightIntralineChanges ? 'changes' : 'lines'}
              </Badge>
            )}
          </Inline>
        </CardHeader>
        <CardBody>
          <Box overflow="auto">{renderDiffContent()}</Box>
        </CardBody>
      </Card>

      {notification && (
        <Alert
          status={
            notification.type === 'error'
              ? 'danger'
              : notification.type === 'success'
                ? 'success'
                : 'info'
          }
          variant="soft"
        >
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}
    </Stack>
  );
};

export default TextDiffChecker;
