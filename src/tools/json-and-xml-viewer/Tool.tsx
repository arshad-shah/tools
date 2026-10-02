import { useCallback, useMemo, useState } from 'react';
import {
  IconChevronDown,
  IconCodeXml,
  IconColumns,
  IconDownload,
  IconFolderOpen,
  IconList,
  IconMonitor,
  IconMoreHorizontal,
  IconNetwork,
  IconPanelLeft,
  IconPanelRight,
  IconWand2,
} from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Container,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  FilePicker,
  Grid,
  IconButton,
  Inline,
  SearchInput,
  Select,
  Stack,
  Tooltip,
} from '@/shared/ui';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { loadTextFile } from '@/shared/lib/files';
import { useHandoffFiles } from '@/shared/lib/handoff';
import { EditorPane } from './components/EditorPane';
import { ViewerPane } from './components/ViewerPane';
import { parseJson, parseXml } from './lib/parse';
import { matchingLines } from './lib/search';
import { formatXML, xmlToJson, type XMLNode } from './lib/xml';
import type {
  FormatType,
  LayoutType,
  PaneType,
  ParsedData,
  ViewMode,
} from './types';

const DataViewer = () => {
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [error, setError] = useState('');
  const [format, setFormat] = useState<FormatType>('json');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [layout, setLayout] = useState<LayoutType>('split');
  const [activePane, setActivePane] = useState<PaneType>('editor');

  const highlightedLines = useMemo(
    () => matchingLines(inputText, searchTerm),
    [inputText, searchTerm],
  );

  const formatCode = useCallback(() => {
    try {
      if (format === 'json') {
        const formatted = JSON.stringify(parseJson(inputText), null, 2);
        setInputText(formatted);
        setParsedData(JSON.parse(formatted));
        setError('');
      } else {
        const doc = parseXml(inputText);
        const formatted = formatXML(inputText);
        setInputText(formatted);
        setParsedData(xmlToJson(doc.documentElement as XMLNode));
        setError('');
      }
    } catch (err) {
      setError(
        `Format error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }, [format, inputText]);

  const handleParse = useCallback(() => {
    try {
      if (format === 'json') {
        setParsedData(parseJson(inputText) as ParsedData);
        setError('');
      } else {
        const xmlDoc = parseXml(inputText);
        setParsedData(xmlToJson(xmlDoc.documentElement as XMLNode));
        setError('');
      }
    } catch (err) {
      setError(
        `Parse error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      setParsedData(null);
    }
  }, [format, inputText]);

  // A picked file and a file dropped on a hub load the same way: the text
  // goes into the editor, the format follows the content.
  const openFile = useCallback(async (file: File) => {
    try {
      const { text } = await loadTextFile(file, { maxBytes: 20 * 1024 * 1024 });
      setFormat(text.trimStart().startsWith('<') ? 'xml' : 'json');
      setInputText(text);
      setParsedData(null);
      setError('');
    } catch (e) {
      setError(toToolError(e).message);
    }
  }, []);
  useHandoffFiles((files) => void openFile(files[0]));

  const handleDownload = useCallback(() => {
    saveBlob(
      new Blob([inputText], {
        type: format === 'json' ? 'application/json' : 'text/xml',
      }),
      `data.${format}`,
    );
  }, [format, inputText]);

  const editorPanel = (
    <EditorPane
      inputText={inputText}
      setInputText={setInputText}
      format={format}
      highlightedLines={highlightedLines}
    />
  );

  const viewerPanel = (
    <ViewerPane
      parsedData={parsedData}
      format={format}
      viewMode={viewMode}
      searchTerm={searchTerm}
    />
  );

  return (
    <Container size="full">
      <Stack gap="4">
        <Card>
          <CardBody>
            <Stack gap="3">
              <Inline justify="between" align="center" wrap gap="3">
                <Inline align="center" gap="2" wrap>
                  <Box className="min-w-[110px]">
                    <Select
                      value={format}
                      onValueChange={(v) => setFormat(v as FormatType)}
                      items={[
                        { value: 'json', label: 'JSON' },
                        { value: 'xml', label: 'XML' },
                      ]}
                      aria-label="Format"
                    />
                  </Box>

                  <ButtonGroup aria-label="View mode">
                    <Tooltip content="Tree view">
                      <IconButton
                        label="Tree view"
                        icon={<IconList size="sm" />}
                        size="sm"
                        variant={viewMode === 'tree' ? 'primary' : 'ghost'}
                        onClick={() => setViewMode('tree')}
                      />
                    </Tooltip>
                    <Tooltip content="Network graph">
                      <IconButton
                        label="Network view"
                        icon={<IconNetwork size="sm" />}
                        size="sm"
                        variant={viewMode === 'network' ? 'primary' : 'ghost'}
                        onClick={() => setViewMode('network')}
                      />
                    </Tooltip>
                  </ButtonGroup>

                  <ButtonGroup aria-label="Layout">
                    <Tooltip content="Split panels">
                      <IconButton
                        label="Split layout"
                        icon={<IconColumns size="sm" />}
                        size="sm"
                        variant={layout === 'split' ? 'primary' : 'ghost'}
                        onClick={() => setLayout('split')}
                      />
                    </Tooltip>
                    <Tooltip content="Single panel">
                      <IconButton
                        label="Single layout"
                        icon={<IconMonitor size="sm" />}
                        size="sm"
                        variant={layout === 'single' ? 'primary' : 'ghost'}
                        onClick={() => setLayout('single')}
                      />
                    </Tooltip>
                  </ButtonGroup>

                  {layout === 'single' && (
                    <ButtonGroup aria-label="Active pane">
                      <Tooltip content="Editor">
                        <IconButton
                          label="Editor pane"
                          icon={<IconPanelLeft size="sm" />}
                          size="sm"
                          variant={
                            activePane === 'editor' ? 'primary' : 'ghost'
                          }
                          onClick={() => setActivePane('editor')}
                        />
                      </Tooltip>
                      <Tooltip content="Viewer">
                        <IconButton
                          label="Viewer pane"
                          icon={<IconPanelRight size="sm" />}
                          size="sm"
                          variant={activePane === 'view' ? 'primary' : 'ghost'}
                          onClick={() => setActivePane('view')}
                        />
                      </Tooltip>
                    </ButtonGroup>
                  )}
                </Inline>

                <Inline gap="2" align="center">
                  <FilePicker
                    accept=".json,.xml,application/json,text/xml"
                    onFiles={(files) => void openFile(files[0])}
                  >
                    {(open) => (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<IconFolderOpen size="sm" />}
                        onClick={open}
                      >
                        Open file
                      </Button>
                    )}
                  </FilePicker>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<IconWand2 size="sm" />}
                    onClick={handleParse}
                  >
                    Parse
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button
                        variant="secondary"
                        size="sm"
                        rightIcon={<IconChevronDown size="sm" />}
                        leftIcon={<IconMoreHorizontal size="sm" />}
                        aria-label="More actions"
                      >
                        More
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={formatCode}>
                        <Inline align="center" gap="2">
                          <IconCodeXml size="sm" />
                          <span>Format code</span>
                        </Inline>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDownload}>
                        <Inline align="center" gap="2">
                          <IconDownload size="sm" />
                          <span>Download as .{format}</span>
                        </Inline>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Inline>
              </Inline>
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search lines…"
              />
            </Stack>
          </CardBody>
        </Card>

        {layout === 'split' ? (
          <Grid max={2} gap="4">
            {editorPanel}
            {viewerPanel}
          </Grid>
        ) : activePane === 'editor' ? (
          editorPanel
        ) : (
          viewerPanel
        )}

        {error && (
          <Alert status="danger">
            <AlertTitle>Parse error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </Stack>
    </Container>
  );
};

export default DataViewer;
