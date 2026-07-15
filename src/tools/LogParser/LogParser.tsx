import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Download,
  FileText,
  Filter,
  Info,
  LayoutGrid,
  PanelLeft,
  PanelRight,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  Container,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Grid,
  Heading,
  IconButton,
  Inline,
  Input,
  Label,
  SearchInput,
  Select,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from '@/components/ui';
import { useCopyToClipboard, useLogParser } from './hooks/useLogParser';
import { LogEntry, LogLevel, LogType } from '../../types/LogParserTypes';

const LOG_TYPE_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'spring', label: 'Spring Boot' },
  { value: 'django', label: 'Django' },
  { value: 'node', label: 'Node.js' },
  { value: 'log4j', label: 'Log4j' },
  { value: 'sql', label: 'SQL' },
  { value: 'webpack', label: 'Webpack' },
  { value: 'generic', label: 'Generic' },
];

const LEVEL_INFO: Record<
  LogLevel,
  {
    label: string;
    tone: 'danger' | 'warning' | 'accent' | 'neutral' | 'success';
    icon: React.ReactNode;
  }
> = {
  error: {
    label: 'Error',
    tone: 'danger',
    icon: <AlertCircle size={14} aria-hidden />,
  },
  warn: {
    label: 'Warn',
    tone: 'warning',
    icon: <AlertTriangle size={14} aria-hidden />,
  },
  info: {
    label: 'Info',
    tone: 'accent',
    icon: <Info size={14} aria-hidden />,
  },
  debug: {
    label: 'Debug',
    tone: 'neutral',
    icon: <Cpu size={14} aria-hidden />,
  },
  success: {
    label: 'Success',
    tone: 'success',
    icon: <CheckCircle size={14} aria-hidden />,
  },
};

interface LogRowProps {
  log: LogEntry;
  copied: boolean;
  onCopy: (text: string) => void;
}

const LogRow: React.FC<LogRowProps> = ({ log, copied, onCopy }) => {
  const [expanded, setExpanded] = useState(false);
  const info = LEVEL_INFO[log.level];
  return (
    <Card>
      <CardBody>
        <Stack gap="2">
          <Inline justify="between" align="center" gap="2" wrap>
            <Inline align="center" gap="2" wrap>
              <Badge variant="soft" tone={info.tone} size="sm" icon={info.icon}>
                {info.label}
              </Badge>
              {log.timestamp && (
                <Badge variant="soft" tone="neutral" size="xs">
                  {log.timestamp}
                </Badge>
              )}
              {log.component && (
                <Badge variant="outline" tone="accent" size="xs">
                  {log.component}
                </Badge>
              )}
              {log.executionTime && (
                <Badge variant="soft" tone="warning" size="xs">
                  {log.executionTime}
                </Badge>
              )}
            </Inline>
            <Inline gap="1">
              <IconButton
                variant="ghost"
                size="sm"
                label="Copy raw line"
                icon={<Copy size={14} />}
                onClick={() => onCopy(log.raw)}
              />
              {(log.details || log.raw !== log.message) && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  label={expanded ? 'Collapse' : 'Expand'}
                  icon={
                    <ChevronRight
                      size={14}
                      style={{
                        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 150ms',
                      }}
                    />
                  }
                  onClick={() => setExpanded((e) => !e)}
                />
              )}
            </Inline>
          </Inline>
          <Text size="sm">{log.message}</Text>
          {copied && (
            <Text size="xs" tone="subtle">
              Copied
            </Text>
          )}
          {expanded && (
            <Stack gap="2">
              {log.details && <Code block>{log.details}</Code>}
              <Code block>{log.raw}</Code>
            </Stack>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};

const LogParserTool: React.FC = () => {
  const {
    logText,
    setLogText,
    parsedLogs,
    filteredLogs,
    logType,
    setLogType,
    showFilters,
    setShowFilters,
    viewMode,
    setViewMode,

    filter,
    setFilter,
    searchComponent,
    setSearchComponent,
    activeFilters,
    timeRange,
    setTimeRange,

    logCounts,
    hasActiveFilters,

    toggleLevelFilter,
    clearLogs,
    resetFilters,
    loadSampleLogs,
  } = useLogParser();

  const { copied, copyToClipboard } = useCopyToClipboard();

  const downloadFiltered = () => {
    const blob = new Blob([filteredLogs.map((l) => l.raw).join('\n')], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs_filtered_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const inputPanel = (
    <Card>
      <CardHeader>
        <Inline justify="between" align="center" wrap gap="2">
          <Inline align="center" gap="2">
            <FileText size={18} aria-hidden />
            <CardTitle as="h3">Log input</CardTitle>
          </Inline>
          <Inline gap="2" wrap>
            <Button
              variant="soft"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              onClick={loadSampleLogs}
            >
              Load sample
            </Button>
            <Button
              variant="soft"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              disabled={!logText}
              onClick={clearLogs}
            >
              Clear
            </Button>
          </Inline>
        </Inline>
      </CardHeader>
      <CardBody>
        <Stack gap="3">
          <Stack gap="2">
            <Label>Log type</Label>
            <Select
              value={logType}
              onValueChange={(v) => setLogType(v as LogType)}
              items={LOG_TYPE_OPTIONS}
              aria-label="Log type"
            />
          </Stack>
          <Textarea
            value={logText}
            onChange={setLogText}
            placeholder="Paste log lines here…"
            rows={12}
            aria-label="Log text"
          />
        </Stack>
      </CardBody>
    </Card>
  );

  const outputPanel = (
    <Card>
      <CardHeader>
        <Inline justify="between" align="center" wrap gap="2">
          <Inline align="center" gap="2">
            <Activity size={18} aria-hidden />
            <CardTitle as="h3">Parsed logs</CardTitle>
            <Badge variant="soft" tone="neutral" size="sm">
              {filteredLogs.length} of {parsedLogs.length}
            </Badge>
          </Inline>
          {filteredLogs.length > 0 && (
            <Button
              variant="soft"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={downloadFiltered}
            >
              Download
            </Button>
          )}
        </Inline>
      </CardHeader>
      <CardBody>
        {parsedLogs.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>
              <FileText size={36} aria-hidden />
            </EmptyStateIcon>
            <EmptyStateTitle>No logs yet</EmptyStateTitle>
            <EmptyStateDescription>
              Paste log lines on the input panel or load a sample to get
              started.
            </EmptyStateDescription>
            <EmptyStateActions>
              <Button
                variant="solid"
                size="sm"
                leftIcon={<RefreshCw size={14} />}
                onClick={loadSampleLogs}
              >
                Load sample
              </Button>
            </EmptyStateActions>
          </EmptyState>
        ) : filteredLogs.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>
              <Search size={36} aria-hidden />
            </EmptyStateIcon>
            <EmptyStateTitle>No matches</EmptyStateTitle>
            <EmptyStateDescription>
              No log lines match the active filters.
            </EmptyStateDescription>
            <EmptyStateActions>
              <Button variant="soft" size="sm" onClick={resetFilters}>
                Reset filters
              </Button>
            </EmptyStateActions>
          </EmptyState>
        ) : (
          <Stack gap="2">
            {filteredLogs.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                copied={copied}
                onCopy={copyToClipboard}
              />
            ))}
          </Stack>
        )}
      </CardBody>
    </Card>
  );

  return (
    <Container size="full">
      <Stack gap="4">
        <Inline justify="between" align="center" wrap gap="2">
          <Inline align="center" gap="2" wrap>
            <Heading level={2} size="lg">
              Log Parser
            </Heading>
            {parsedLogs.length > 0 && (
              <Badge variant="soft" tone="accent" size="sm">
                {parsedLogs.length} parsed
              </Badge>
            )}
          </Inline>
          <Inline gap="2" wrap>
            <Button
              variant={showFilters ? 'solid' : 'soft'}
              size="sm"
              leftIcon={<Filter size={14} />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters{hasActiveFilters && ' •'}
            </Button>
            <Tabs
              value={viewMode}
              onValueChange={(v) =>
                setViewMode(v as 'split' | 'input' | 'output')
              }
              variant="soft"
            >
              <TabsList aria-label="View mode">
                <TabsTrigger value="input">
                  <PanelLeft size={14} aria-hidden />
                </TabsTrigger>
                <TabsTrigger value="split">
                  <LayoutGrid size={14} aria-hidden />
                </TabsTrigger>
                <TabsTrigger value="output">
                  <PanelRight size={14} aria-hidden />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </Inline>
        </Inline>

        {parsedLogs.length > 0 && (
          <Grid cols={{ base: 2, sm: 3, md: 5 }} gap="2">
            {(Object.keys(LEVEL_INFO) as LogLevel[]).map((level) => {
              const info = LEVEL_INFO[level];
              const isActive = activeFilters[level];
              const count = logCounts[level];
              return (
                <Card
                  key={level}
                  interactive
                  className={
                    isActive ? 'border-accent bg-surface-subtle' : undefined
                  }
                  onClick={() => toggleLevelFilter(level)}
                >
                  <CardBody>
                    <Inline justify="between" align="center">
                      <Inline gap="2" align="center">
                        {info.icon}
                        <Text size="sm" weight="medium">
                          {info.label}
                        </Text>
                      </Inline>
                      <Badge variant="soft" tone={info.tone} size="sm">
                        {count}
                      </Badge>
                    </Inline>
                  </CardBody>
                </Card>
              );
            })}
          </Grid>
        )}

        {showFilters && (
          <Card>
            <CardHeader>
              <Inline justify="between" align="center" wrap>
                <Inline align="center" gap="2">
                  <Filter size={18} aria-hidden />
                  <CardTitle as="h3">Filters</CardTitle>
                </Inline>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!hasActiveFilters}
                  onClick={resetFilters}
                >
                  Reset
                </Button>
              </Inline>
            </CardHeader>
            <CardBody>
              <Grid max={2} gap="3">
                <Stack gap="2">
                  <Label htmlFor="filter-search">Message search</Label>
                  <SearchInput
                    value={filter}
                    onChange={setFilter}
                    placeholder="Search in messages…"
                  />
                </Stack>
                <Stack gap="2">
                  <Label htmlFor="filter-component">Component</Label>
                  <Input
                    id="filter-component"
                    value={searchComponent}
                    onChange={setSearchComponent}
                    placeholder="Filter by component…"
                    leadingSlot={<Cpu size={16} aria-hidden />}
                  />
                </Stack>
                <Stack gap="2">
                  <Label htmlFor="filter-from">Time range start</Label>
                  <Input
                    id="filter-from"
                    value={timeRange.start ?? ''}
                    onChange={(v) =>
                      setTimeRange({ ...timeRange, start: v || undefined })
                    }
                    placeholder="e.g. 12:00:00"
                    leadingSlot={<Clock size={16} aria-hidden />}
                  />
                </Stack>
                <Stack gap="2">
                  <Label htmlFor="filter-to">Time range end</Label>
                  <Input
                    id="filter-to"
                    value={timeRange.end ?? ''}
                    onChange={(v) =>
                      setTimeRange({ ...timeRange, end: v || undefined })
                    }
                    placeholder="e.g. 13:00:00"
                    leadingSlot={<Clock size={16} aria-hidden />}
                  />
                </Stack>
              </Grid>
            </CardBody>
          </Card>
        )}

        {viewMode === 'split' ? (
          <Grid cols={{ base: 1, lg: 2 }} gap="4">
            <Box>{inputPanel}</Box>
            <Box>{outputPanel}</Box>
          </Grid>
        ) : viewMode === 'input' ? (
          inputPanel
        ) : (
          outputPanel
        )}

        {parsedLogs.length === 0 && !logText && (
          <Alert status="info" icon={<Info size={18} aria-hidden />}>
            <AlertTitle>How to use</AlertTitle>
            <AlertDescription>
              Paste your application logs into the input panel, pick a log type
              (or leave on Auto-detect), then use the filter chips above each
              log level to drill down.
            </AlertDescription>
          </Alert>
        )}
      </Stack>
    </Container>
  );
};

export default LogParserTool;
