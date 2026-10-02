import React, { useMemo, useState } from 'react';
import Papa from 'papaparse';
import {
  IconBarChart3,
  IconRefreshCw,
  IconTable,
  IconTrendingUp,
} from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Heading,
  Inline,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { ChartPanel } from './components/ChartPanel';
import { ColumnControls } from './components/ColumnControls';
import { DataTable } from './components/DataTable';
import { DelimiterControl } from './components/DelimiterControl';
import { StatisticsPanel } from './components/StatisticsPanel';
import { UploadView } from './components/UploadView';
import { WarningsAlert } from './components/WarningsAlert';
import { useCsvData } from './hooks/useCsvData';
import { columnStatistics } from './lib/stats';
import { chartPoints, filterRows, paginate, sortRows } from './lib/table';
import { ParsedData, SortDirection, Statistics } from './types';

const CSVTSVViewer: React.FC = () => {
  // viewer state
  const [activeTab, setActiveTab] = useState<'data' | 'stats' | 'chart'>(
    'data',
  );
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [chartColumn, setChartColumn] = useState('');

  const {
    dataState,
    delimiterChoice,
    loading,
    parseError,
    processFile,
    loadSample,
    changeDelimiter,
    clear,
  } = useCsvData((next) => setSelectedColumns(next.columns));

  const delimiterControl = (
    <DelimiterControl
      value={delimiterChoice}
      onChange={changeDelimiter}
      detected={dataState?.delimiter ?? null}
    />
  );

  const reset = () => {
    clear();
    setFilterColumn('');
    setFilterValue('');
    setSortColumn('');
    setSortDirection('asc');
    setPage(1);
    setRowsPerPage(10);
    setSelectedColumns([]);
    setChartColumn('');
  };

  const statistics = useMemo<Statistics>(
    () =>
      dataState ? columnStatistics(dataState.data, dataState.columns) : {},
    [dataState],
  );

  const numericColumns = useMemo(() => Object.keys(statistics), [statistics]);

  // Until the user picks one, the chart shows the first numeric column.
  const activeChartColumn = chartColumn || numericColumns[0] || '';

  const filteredData = useMemo(() => {
    if (!dataState) return [];
    return sortRows(
      filterRows(dataState.data, filterColumn, filterValue),
      sortColumn,
      sortDirection,
    );
  }, [dataState, filterColumn, filterValue, sortColumn, sortDirection]);

  const paginatedData = useMemo(
    () => paginate(filteredData, page, rowsPerPage),
    [filteredData, page, rowsPerPage],
  );

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleColumn = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column],
    );
  };

  const toggleAllColumns = () => {
    if (!dataState) return;
    setSelectedColumns(
      selectedColumns.length === dataState.columns.length
        ? []
        : [...dataState.columns],
    );
  };

  const exportData = () => {
    if (!dataState || !dataState.data.length) return;
    const dataToExport = filteredData.map((row) => {
      const newRow: ParsedData = {};
      selectedColumns.forEach((col) => {
        newRow[col] = row[col];
      });
      return newRow;
    });
    saveBlob(
      new Blob([Papa.unparse(dataToExport)], {
        type: 'text/csv;charset=utf-8',
      }),
      deriveFilename(dataState.fileName, 'exported', 'csv'),
    );
  };

  const chartData = useMemo(
    () => chartPoints(filteredData, activeChartColumn),
    [filteredData, activeChartColumn],
  );

  if (!dataState) {
    return (
      <UploadView
        delimiterControl={delimiterControl}
        onFile={(file) => void processFile(file)}
        onLoadSample={loadSample}
        loading={loading}
        parseError={parseError}
      />
    );
  }

  return (
    <Stack gap="4">
      <Inline justify="between" align="center" wrap gap="3">
        <Inline align="center" gap="2" wrap>
          <Heading level={2} size="lg">
            {dataState.fileName}
          </Heading>
          <Badge variant="soft" tone="accent" size="sm">
            {dataState.data.length} rows
          </Badge>
          <Badge variant="soft" tone="accent" size="sm">
            {dataState.columns.length} columns
          </Badge>
        </Inline>
        <Inline align="center" gap="3" wrap>
          {delimiterControl}
          <Button
            variant="danger"
            size="sm"
            leftIcon={<IconRefreshCw size="sm" />}
            onClick={reset}
          >
            New file
          </Button>
        </Inline>
      </Inline>

      {dataState.warnings.length > 0 && (
        <WarningsAlert warnings={dataState.warnings} />
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        variant="line"
      >
        <TabsList aria-label="Viewer tabs">
          <TabsTrigger value="data">
            <Inline gap="2" align="center" wrap={false}>
              <IconTable size="sm" />
              <span>Data table</span>
            </Inline>
          </TabsTrigger>
          <TabsTrigger value="stats">
            <Inline gap="2" align="center" wrap={false}>
              <IconBarChart3 size="sm" />
              <span>Statistics</span>
            </Inline>
          </TabsTrigger>
          <TabsTrigger value="chart" disabled={numericColumns.length === 0}>
            <Inline gap="2" align="center" wrap={false}>
              <IconTrendingUp size="sm" />
              <span>Chart</span>
            </Inline>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          <Stack gap="4" className="pt-4">
            <ColumnControls
              columns={dataState.columns}
              totalRows={dataState.data.length}
              filteredRows={filteredData.length}
              filterColumn={filterColumn}
              onFilterColumnChange={(v) => {
                setFilterColumn(v);
                setPage(1);
              }}
              filterValue={filterValue}
              onFilterValueChange={(v) => {
                setFilterValue(v);
                setPage(1);
              }}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
              selectedColumns={selectedColumns}
              onToggleColumn={toggleColumn}
              onToggleAllColumns={toggleAllColumns}
              onExport={exportData}
            />
            <DataTable
              columns={selectedColumns}
              rows={paginatedData}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </Stack>
        </TabsContent>

        <TabsContent value="stats">
          <StatisticsPanel statistics={statistics} />
        </TabsContent>

        <TabsContent value="chart">
          <ChartPanel
            numericColumns={numericColumns}
            column={activeChartColumn}
            onColumnChange={setChartColumn}
            data={chartData}
            rowCount={filteredData.length}
          />
        </TabsContent>
      </Tabs>

      {parseError && (
        <Alert status="danger">
          <AlertTitle>Parse error</AlertTitle>
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}
    </Stack>
  );
};

export default CSVTSVViewer;
