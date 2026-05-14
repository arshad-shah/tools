import React, { useMemo, useState } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Table as TableIcon,
  TrendingUp,
  Upload,
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
  Container,
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  FileUpload,
  Grid,
  Heading,
  Inline,
  Input,
  Label,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@arshad-shah/cynosure-react';
import {
  ColumnStatistics,
  ParsedData,
  SortDirection,
  Statistics,
} from '../../types/CsvTsvTypes';

const ROWS_PER_PAGE_OPTIONS = [
  { value: '5', label: '5 rows' },
  { value: '10', label: '10 rows' },
  { value: '25', label: '25 rows' },
  { value: '50', label: '50 rows' },
  { value: '100', label: '100 rows' },
];

const formatNumber = (value: number, decimals = 2): string =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

interface DataState {
  data: ParsedData[];
  columns: string[];
  fileName: string;
}

const CSVTSVViewer: React.FC = () => {
  const [dataState, setDataState] = useState<DataState | null>(null);
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // viewer state
  const [activeTab, setActiveTab] = useState<'data' | 'stats' | 'chart'>('data');
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [chartColumn, setChartColumn] = useState('');

  const parseFile = (content: string, delimiter: string, fileName: string) => {
    Papa.parse<ParsedData>(content, {
      delimiter,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseError(`Parsing error: ${results.errors[0].message}`);
        } else {
          const cols = results.meta.fields || [];
          setDataState({
            data: results.data as ParsedData[],
            columns: cols,
            fileName,
          });
          setSelectedColumns(cols);
          setParseError(null);
        }
        setLoading(false);
      },
      error: (err: Error) => {
        setParseError(`Parsing error: ${err.message}`);
        setLoading(false);
      },
    });
  };

  const processFile = (file: File) => {
    setLoading(true);
    setParseError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const delimiter = ext === 'tsv' ? '\t' : ',';
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) parseFile(content, delimiter, file.name);
    };
    reader.onerror = () => {
      setParseError('Failed to read the file. Please try again.');
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const loadSample = () => {
    const sample =
      'Name,Age,City,Salary\nJohn,28,New York,75000\nSarah,32,San Francisco,92000\nMike,45,Chicago,68000\nEmma,37,Boston,83000\nDavid,29,Seattle,79000';
    setLoading(true);
    parseFile(sample, ',', 'Sample Data');
  };

  const reset = () => {
    setDataState(null);
    setLoading(false);
    setParseError(null);
    setFilterColumn('');
    setFilterValue('');
    setSortColumn('');
    setSortDirection('asc');
    setPage(1);
    setRowsPerPage(10);
    setSelectedColumns([]);
    setChartColumn('');
  };

  const statistics = useMemo<Statistics>(() => {
    if (!dataState) return {};
    const stats: Statistics = {};
    dataState.columns.forEach((col) => {
      const numericValues = dataState.data
        .map((row) => row[col])
        .filter(
          (v): v is number => typeof v === 'number' && !Number.isNaN(v),
        );
      if (numericValues.length > 0) {
        stats[col] = {
          min: _.min(numericValues) || 0,
          max: _.max(numericValues) || 0,
          avg: _.sum(numericValues) / numericValues.length,
          count: numericValues.length,
          sum: _.sum(numericValues),
        };
      }
    });
    return stats;
  }, [dataState]);

  const numericColumns = useMemo(
    () => Object.keys(statistics),
    [statistics],
  );

  React.useEffect(() => {
    if (numericColumns.length > 0 && !chartColumn) {
      setChartColumn(numericColumns[0]);
    }
  }, [numericColumns, chartColumn]);

  const filteredData = useMemo(() => {
    if (!dataState) return [];
    let filtered = dataState.data;
    if (filterColumn && filterValue) {
      filtered = filtered.filter((row) => {
        const v = row[filterColumn];
        if (v === null || v === undefined) return false;
        return String(v).toLowerCase().includes(filterValue.toLowerCase());
      });
    }
    if (sortColumn) {
      filtered = _.orderBy(filtered, [sortColumn], [sortDirection]);
    }
    return filtered;
  }, [dataState, filterColumn, filterValue, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

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
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `exported_${dataState.fileName.replace(/\.[^/.]+$/, '')}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const chartData = useMemo(() => {
    if (!filteredData.length || !chartColumn) return [];
    return filteredData.slice(0, 50).map((row, i) => ({
      index: i + 1,
      value: row[chartColumn] as number,
    }));
  }, [filteredData, chartColumn]);

  const yDomain = useMemo<[number, number]>(() => {
    if (!chartData.length) return [0, 100];
    const values = chartData.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [chartData]);

  const renderStatCard = (column: string, stats: ColumnStatistics) => (
    <Card key={column} variant="outlined" size="sm">
      <CardHeader>
        <CardTitle as="h4">{column}</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack gap="2">
          <Inline justify="between" align="center">
            <Text size="sm" variant="caption">Minimum</Text>
            <Text size="sm" weight="medium">{formatNumber(stats.min)}</Text>
          </Inline>
          <Inline justify="between" align="center">
            <Text size="sm" variant="caption">Maximum</Text>
            <Text size="sm" weight="medium">{formatNumber(stats.max)}</Text>
          </Inline>
          <Inline justify="between" align="center">
            <Text size="sm" variant="caption">Average</Text>
            <Text size="sm" weight="medium">{formatNumber(stats.avg)}</Text>
          </Inline>
          <Inline justify="between" align="center">
            <Text size="sm" variant="caption">Sum</Text>
            <Text size="sm" weight="medium">{formatNumber(stats.sum)}</Text>
          </Inline>
          <Inline justify="between" align="center">
            <Text size="sm" variant="caption">Count</Text>
            <Text size="sm" weight="medium">{stats.count.toLocaleString()}</Text>
          </Inline>
        </Stack>
      </CardBody>
    </Card>
  );

  if (!dataState) {
    return (
      <Container size="lg">
        <Stack gap="4">
          <FileUpload
            accept=".csv,.tsv"
            maxCount={1}
            onFilesChange={(files) => files[0] && processFile(files[0])}
            onError={(err) => setParseError(err.message)}
          />
          <Inline gap="2" wrap justify="center">
            <Button
              variant="soft"
              colorScheme="accent"
              leftIcon={<Upload size={16} />}
              onClick={loadSample}
              disabled={loading}
            >
              Load sample data
            </Button>
          </Inline>
          {parseError && (
            <Alert status="danger" variant="soft">
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}
          {loading && (
            <Alert status="info" variant="soft">
              <AlertDescription>Processing your file…</AlertDescription>
            </Alert>
          )}
        </Stack>
      </Container>
    );
  }

  const filterColumnItems = [
    { value: '', label: 'Select column' },
    ...dataState.columns.map((c) => ({ value: c, label: c })),
  ];

  return (
    <Stack gap="4">
      <Inline justify="between" align="center" wrap gap="3">
        <Inline align="center" gap="2" wrap>
          <Heading level={2} size="lg" weight="semibold">
            {dataState.fileName}
          </Heading>
          <Badge variant="soft" colorScheme="accent" size="sm">
            {dataState.data.length} rows
          </Badge>
          <Badge variant="soft" colorScheme="accent" size="sm">
            {dataState.columns.length} columns
          </Badge>
        </Inline>
        <Button
          variant="soft"
          colorScheme="danger"
          size="sm"
          leftIcon={<RefreshCw size={14} />}
          onClick={reset}
        >
          New file
        </Button>
      </Inline>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        variant="line"
        colorScheme="accent"
      >
        <TabsList aria-label="Viewer tabs">
          <TabsTrigger value="data">
            <Inline gap="2" align="center" wrap={false}>
              <TableIcon size={14} aria-hidden />
              <span>Data table</span>
            </Inline>
          </TabsTrigger>
          <TabsTrigger value="stats">
            <Inline gap="2" align="center" wrap={false}>
              <BarChart3 size={14} aria-hidden />
              <span>Statistics</span>
            </Inline>
          </TabsTrigger>
          <TabsTrigger value="chart" disabled={numericColumns.length === 0}>
            <Inline gap="2" align="center" wrap={false}>
              <TrendingUp size={14} aria-hidden />
              <span>Chart</span>
            </Inline>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          <Stack gap="4" paddingTop="4">
            <Card variant="filled" size="sm">
              <CardBody>
                <Stack gap="3">
                  <Grid columns={{ base: 1, md: 3 }} gap="3">
                    <Stack gap="2">
                      <Label>Filter column</Label>
                      <Select
                        value={filterColumn}
                        onValueChange={(v) => {
                          setFilterColumn(v);
                          setPage(1);
                        }}
                        items={filterColumnItems}
                        aria-label="Filter column"
                      />
                    </Stack>
                    <Stack gap="2">
                      <Label htmlFor="filter-value">Filter value</Label>
                      <Input
                        id="filter-value"
                        value={filterValue}
                        onChange={(v) => {
                          setFilterValue(v);
                          setPage(1);
                        }}
                        placeholder="Enter filter value"
                        disabled={!filterColumn}
                      />
                    </Stack>
                    <Stack gap="2">
                      <Label>Rows per page</Label>
                      <Select
                        value={String(rowsPerPage)}
                        onValueChange={(v) => setRowsPerPage(Number(v))}
                        items={ROWS_PER_PAGE_OPTIONS}
                        aria-label="Rows per page"
                      />
                    </Stack>
                  </Grid>
                  <Inline justify="between" align="center" wrap gap="3">
                    <Text size="sm" variant="caption">
                      {filteredData.length === dataState.data.length
                        ? `Showing all ${dataState.data.length} rows`
                        : `Showing ${filteredData.length} of ${dataState.data.length} rows`}
                    </Text>
                    <Inline gap="2" wrap>
                      <Button
                        variant="soft"
                        colorScheme="neutral"
                        size="sm"
                        onClick={toggleAllColumns}
                      >
                        {selectedColumns.length === dataState.columns.length
                          ? 'Hide all columns'
                          : 'Show all columns'}
                      </Button>
                      <Button
                        variant="solid"
                        colorScheme="accent"
                        size="sm"
                        leftIcon={<Download size={14} />}
                        disabled={filteredData.length === 0}
                        onClick={exportData}
                      >
                        Export
                      </Button>
                    </Inline>
                  </Inline>
                </Stack>
              </CardBody>
            </Card>

            <Card variant="outlined" size="sm">
              <CardHeader>
                <CardTitle as="h4">Column visibility</CardTitle>
              </CardHeader>
              <CardBody>
                <Inline gap="2" wrap>
                  {dataState.columns.map((col) => {
                    const selected = selectedColumns.includes(col);
                    return (
                      <Button
                        key={col}
                        variant={selected ? 'solid' : 'soft'}
                        colorScheme={selected ? 'accent' : 'neutral'}
                        size="xs"
                        shape="pill"
                        onClick={() => toggleColumn(col)}
                      >
                        {col}
                      </Button>
                    );
                  })}
                </Inline>
              </CardBody>
            </Card>

            <Card variant="outlined" size="sm">
              <CardBody>
                <Box overflow="auto">
                  <Table variant="striped" size="sm">
                    <TableHead>
                      <TableRow>
                        {selectedColumns.map((col) => (
                          <TableHeader
                            key={col}
                            onClick={() => handleSort(col)}
                            style={{ cursor: 'pointer' }}
                          >
                            <Inline gap="1" align="center" wrap={false}>
                              <span>{col}</span>
                              {sortColumn === col && (
                                <span>
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </Inline>
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedData.length > 0 ? (
                        paginatedData.map((row, idx) => (
                          <TableRow key={idx}>
                            {selectedColumns.map((col) => {
                              const v = row[col];
                              const display =
                                v === null || v === undefined ? '' : String(v);
                              return (
                                <TableCell key={`${idx}-${col}`}>
                                  {display}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={selectedColumns.length}>
                            <Text size="sm" variant="caption" align="center">
                              No matching data found
                            </Text>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
                <Inline
                  justify="between"
                  align="center"
                  paddingTop="3"
                  wrap
                  gap="2"
                >
                  <Text size="sm" variant="caption">
                    Page {page} of {totalPages}
                  </Text>
                  <Inline gap="2">
                    <Button
                      variant="soft"
                      colorScheme="neutral"
                      size="sm"
                      leftIcon={<ChevronLeft size={14} />}
                      disabled={page === 1}
                      onClick={() => setPage(Math.max(1, page - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="soft"
                      colorScheme="neutral"
                      size="sm"
                      rightIcon={<ChevronRight size={14} />}
                      disabled={page >= totalPages}
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                    >
                      Next
                    </Button>
                  </Inline>
                </Inline>
              </CardBody>
            </Card>
          </Stack>
        </TabsContent>

        <TabsContent value="stats">
          <Stack gap="4" paddingTop="4">
            {Object.keys(statistics).length > 0 ? (
              <Grid columns={{ base: 1, md: 2, lg: 3 }} gap="3">
                {Object.entries(statistics).map(([col, stats]) =>
                  renderStatCard(col, stats),
                )}
              </Grid>
            ) : (
              <EmptyState size="md" variant="subtle">
                <EmptyStateIcon>
                  <BarChart3 size={36} aria-hidden />
                </EmptyStateIcon>
                <EmptyStateTitle>No numeric columns found</EmptyStateTitle>
                <EmptyStateDescription>
                  Statistics can only be calculated for columns with numeric
                  values.
                </EmptyStateDescription>
              </EmptyState>
            )}
          </Stack>
        </TabsContent>

        <TabsContent value="chart">
          <Stack gap="4" paddingTop="4">
            {numericColumns.length > 0 ? (
              <Card variant="outlined" size="md">
                <CardHeader>
                  <Inline justify="between" align="center" wrap gap="3">
                    <CardTitle as="h4">Data visualisation</CardTitle>
                    <Inline align="center" gap="2">
                      <Label>Column:</Label>
                      <Select
                        value={chartColumn}
                        onValueChange={setChartColumn}
                        items={numericColumns.map((c) => ({
                          value: c,
                          label: c,
                        }))}
                        aria-label="Chart column"
                      />
                    </Inline>
                  </Inline>
                </CardHeader>
                <CardBody>
                  <Box style={{ height: 360, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="index" />
                        <YAxis domain={yDomain} />
                        <RechartsTooltip
                          formatter={(value: number) => [
                            value.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }),
                            chartColumn,
                          ]}
                          labelFormatter={(idx) => `Row ${idx}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name={chartColumn}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                  <Text size="xs" variant="caption" align="center">
                    {filteredData.length > 50
                      ? `Showing first 50 of ${filteredData.length} rows`
                      : `Showing all ${filteredData.length} rows`}
                  </Text>
                </CardBody>
              </Card>
            ) : (
              <EmptyState size="md" variant="subtle">
                <EmptyStateIcon>
                  <TrendingUp size={36} aria-hidden />
                </EmptyStateIcon>
                <EmptyStateTitle>No numeric columns available</EmptyStateTitle>
                <EmptyStateDescription>
                  Charts require at least one column with numeric data.
                </EmptyStateDescription>
              </EmptyState>
            )}
          </Stack>
        </TabsContent>
      </Tabs>

      {parseError && (
        <Alert status="danger" variant="soft">
          <AlertTitle>Parse error</AlertTitle>
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}
    </Stack>
  );
};

export default CSVTSVViewer;
