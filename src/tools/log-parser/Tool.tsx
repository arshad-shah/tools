import React from 'react';
import {
  IconActivity,
  IconDownload,
  IconFileText,
  IconFilter,
  IconInfo,
  IconLayoutGrid,
  IconPanelLeft,
  IconPanelRight,
  IconRefreshCw,
  IconSearch,
} from '@/shared/ui/icons';

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
  Container,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Grid,
  Heading,
  Inline,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
  StatusDot,
} from '@/shared/ui';
import { useClipboard } from '@/shared/lib/clipboard';
import { saveBlob } from '@/shared/lib/download';
import { FilterBar } from './components/FilterBar';
import { InputPanel } from './components/InputPanel';
import { LogRow } from './components/LogRow';
import { useLogParser } from './hooks/useLogParser';
import { LEVEL_INFO } from './lib/level-info';
import type { LogLevel } from './types';

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

  // Keyed so only the row whose button was pressed shows "Copied" (B10).
  const { copiedKey, copy } = useClipboard();

  const downloadFiltered = () => {
    saveBlob(
      new Blob([filteredLogs.map((l) => l.raw).join('\n')], {
        type: 'text/plain',
      }),
      `logs_filtered_${Date.now()}.txt`,
    );
  };

  const inputPanel = (
    <InputPanel
      logText={logText}
      setLogText={setLogText}
      logType={logType}
      setLogType={setLogType}
      loadSampleLogs={loadSampleLogs}
      clearLogs={clearLogs}
    />
  );

  const outputPanel = (
    <Card>
      <CardHeader>
        <Inline justify="between" align="center" wrap gap="2">
          <Inline align="center" gap="2">
            <IconActivity size="md" />
            <CardTitle as="h3">Parsed logs</CardTitle>
            <Badge variant="soft" tone="neutral" size="sm">
              {filteredLogs.length} of {parsedLogs.length}
            </Badge>
          </Inline>
          {filteredLogs.length > 0 && (
            <Button
              variant="soft"
              size="sm"
              leftIcon={<IconDownload size="sm" />}
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
              <IconFileText size="2xl" />
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
                leftIcon={<IconRefreshCw size="sm" />}
                onClick={loadSampleLogs}
              >
                Load sample
              </Button>
            </EmptyStateActions>
          </EmptyState>
        ) : filteredLogs.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>
              <IconSearch size="2xl" />
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
                copied={copiedKey === String(log.id)}
                onCopy={(text) => void copy(text, String(log.id))}
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
              leftIcon={<IconFilter size="sm" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
              {hasActiveFilters && (
                <StatusDot tone="accent" label="Filters active" />
              )}
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
                  <IconPanelLeft size="sm" />
                </TabsTrigger>
                <TabsTrigger value="split">
                  <IconLayoutGrid size="sm" />
                </TabsTrigger>
                <TabsTrigger value="output">
                  <IconPanelRight size="sm" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </Inline>
        </Inline>

        {parsedLogs.length > 0 && (
          <Grid cols={{ base: 2, sm: 3, md: 5 }} gap="2">
            {(Object.keys(LEVEL_INFO) as LogLevel[]).map((level) => {
              const info = LEVEL_INFO[level];
              const LevelIcon = info.icon;
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
                        <LevelIcon size="sm" />
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
          <FilterBar
            hasActiveFilters={hasActiveFilters}
            resetFilters={resetFilters}
            filter={filter}
            setFilter={setFilter}
            searchComponent={searchComponent}
            setSearchComponent={setSearchComponent}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
          />
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
          <Alert status="info" icon={<IconInfo size="md" />}>
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
