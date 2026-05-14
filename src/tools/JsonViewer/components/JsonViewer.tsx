/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import CodeEditor from '@uiw/react-textarea-code-editor';
import rehypePrism from 'rehype-prism-plus';
import rehypeRewrite from 'rehype-rewrite';
import { useColorScheme } from '@arshad-shah/cynosure-react';
import {
  ChevronDown,
  Code2,
  Columns,
  Download,
  FileJson,
  List as ListIcon,
  MonitorIcon,
  MoreHorizontal,
  Network,
  PanelLeft,
  PanelRight,
  Wand2,
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
  Center,
  Container,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Grid,
  Heading,
  Inline,
  SearchInput,
  Select,
  Stack,
  Text,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
} from '@arshad-shah/cynosure-react';
import TreeView from './TreeView';
import DataFlow from './treeview/DataFlow';

type FormatType = 'json' | 'xml';
type ViewMode = 'tree' | 'network';
type LayoutType = 'split' | 'single';
type PaneType = 'editor' | 'view';

interface XMLNode {
  nodeName: string;
  nodeType: number;
  childNodes: NodeListOf<ChildNode>;
  attributes: NamedNodeMap;
  nodeValue: string | null;
}

const DataViewer = () => {
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState<{ [key: string]: any } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [format, setFormat] = useState<FormatType>('json');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);
  const theme = useColorScheme();
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [layout, setLayout] = useState<LayoutType>('split');
  const [activePane, setActivePane] = useState<PaneType>('editor');

  const getHighlightStyles = (lineNumber: number) =>
    highlightedLines.includes(lineNumber)
      ? theme === 'dark'
        ? { backgroundColor: 'rgba(6, 182, 212, 0.2)' }
        : { backgroundColor: 'rgba(6, 182, 212, 0.1)' }
      : {};

  const editorStyles = {
    fontFamily:
      'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
    fontSize: '14px',
    minHeight: '24rem',
    borderRadius: '0.5rem',
    paddingBottom: '2rem',
  };

  useEffect(() => {
    if (!searchTerm) {
      setHighlightedLines([]);
      return;
    }
    const lines = inputText.split('\n');
    const matched = lines.reduce((acc: number[], line, idx) => {
      if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
        acc.push(idx + 1);
      }
      return acc;
    }, []);
    setHighlightedLines(matched);
  }, [searchTerm, inputText]);

  const xmlToJson = (node: XMLNode) => {
    const obj: { [key: string]: any } = {};
    if (node.nodeType === 1) {
      if (node.attributes?.length > 0) {
        obj['@attributes'] = {};
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          obj['@attributes'][attr.nodeName] = attr.nodeValue;
        }
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === 1) {
          const childData = xmlToJson(child as unknown as XMLNode);
          if (obj[child.nodeName]) {
            if (!Array.isArray(obj[child.nodeName])) {
              obj[child.nodeName] = [obj[child.nodeName]];
            }
            obj[child.nodeName].push(childData);
          } else {
            obj[child.nodeName] = childData;
          }
        } else if (child.nodeType === 3 && child.nodeValue?.trim()) {
          obj['#text'] = child.nodeValue.trim();
        }
      }
    }
    return obj;
  };

  const formatXML = (xml: string) => {
    let formatted = '';
    let indent = '';
    const tab = '  ';
    xml.split(/>\s*</).forEach((node) => {
      if (node.match(/^\/\w/)) indent = indent.substring(tab.length);
      formatted += indent + '<' + node + '>\n';
      // eslint-disable-next-line no-useless-escape
      if (node.match(/^<?\w[^>]*[^\/]$/)) indent += tab;
    });
    return formatted.substring(1, formatted.length - 2);
  };

  const formatCode = useCallback(() => {
    try {
      if (format === 'json') {
        const formatted = JSON.stringify(JSON.parse(inputText), null, 2);
        setInputText(formatted);
        setParsedData(JSON.parse(formatted));
        setError('');
      } else {
        const parser = new DOMParser();
        const doc = parser.parseFromString(inputText, 'text/xml');
        if (doc.getElementsByTagName('parsererror').length > 0) {
          throw new Error('Invalid XML');
        }
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
        setParsedData(JSON.parse(inputText));
        setError('');
      } else {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(inputText, 'text/xml');
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
          throw new Error('Invalid XML');
        }
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

  const handleDownload = useCallback(() => {
    const blob = new Blob([inputText], {
      type: format === 'json' ? 'application/json' : 'text/xml',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [format, inputText]);

  const rehypePlugins = [
    [rehypePrism as any, { ignoreMissing: true }],
    [
      rehypeRewrite as any,
      {
        rewrite: (node: any, index: number) => {
          if (node.properties?.className?.includes('code-line')) {
            const lineNumber = index + 1;
            if (highlightedLines.includes(lineNumber)) {
              node.properties.style = {
                ...node.properties.style,
                ...getHighlightStyles(lineNumber),
              };
              node.properties.className.push('highlighted-line');
            }
          }
        },
      },
    ],
  ] as any;

  const renderEditor = () => (
    <CodeEditor
      value={inputText}
      language={format}
      placeholder={`Enter ${format.toUpperCase()} here…`}
      onChange={(evn) => setInputText(evn.target.value)}
      padding={15}
      style={editorStyles}
      data-color-mode={theme === 'dark' ? 'dark' : 'light'}
      rehypePlugins={rehypePlugins}
    />
  );

  const renderViewerBody = () => {
    if (!parsedData) {
      return (
        <Center paddingY="10">
          <Stack gap="2" align="center">
            <Heading level={3} size="md" weight="semibold">
              No data to display
            </Heading>
            <Text size="sm" variant="caption">
              Enter some {format.toUpperCase()} above and click Parse to
              visualise.
            </Text>
          </Stack>
        </Center>
      );
    }
    return viewMode === 'tree' ? (
      <TreeView data={parsedData} searchTerm={searchTerm} />
    ) : (
      <DataFlow initialData={parsedData} />
    );
  };

  const editorPanel = (
    <Card variant="elevated" size="md">
      <CardHeader>
        <Inline justify="between" align="center" wrap gap="2">
          <Inline align="center" gap="2">
            {format === 'json' ? (
              <FileJson size={16} aria-hidden />
            ) : (
              <Code2 size={16} aria-hidden />
            )}
            <Heading level={3} size="md" weight="semibold">
              {format.toUpperCase()} editor
            </Heading>
          </Inline>
          {highlightedLines.length > 0 && (
            <Badge variant="soft" colorScheme="accent" size="sm">
              {highlightedLines.length} match
              {highlightedLines.length !== 1 ? 'es' : ''}
            </Badge>
          )}
        </Inline>
      </CardHeader>
      <CardBody>
        <Box overflow="auto">{renderEditor()}</Box>
      </CardBody>
    </Card>
  );

  const viewerPanel = (
    <Card variant="elevated" size="md">
      <CardHeader>
        <Inline justify="between" align="center" wrap gap="2">
          <Inline align="center" gap="2">
            {viewMode === 'tree' ? (
              <ListIcon size={16} aria-hidden />
            ) : (
              <Network size={16} aria-hidden />
            )}
            <Heading level={3} size="md" weight="semibold">
              {viewMode === 'tree' ? 'Tree view' : 'Network view'}
            </Heading>
          </Inline>
          {searchTerm && (
            <Badge variant="soft" colorScheme="accent" size="sm">
              Filtering: {searchTerm}
            </Badge>
          )}
        </Inline>
      </CardHeader>
      <CardBody>
        <Box
          style={{
            height: '40rem',
            overflow: viewMode === 'network' ? 'hidden' : 'auto',
          }}
        >
          {renderViewerBody()}
        </Box>
      </CardBody>
    </Card>
  );

  return (
    <Container size="full">
      <Stack gap="4">
        <Card variant="filled" size="md">
          <CardBody>
            <Stack gap="3">
              <Inline justify="between" align="center" wrap gap="3">
                <Inline align="center" gap="2" wrap>
                  <Box style={{ minWidth: 110 }}>
                    <Select
                      value={format}
                      onValueChange={(v) => setFormat(v as FormatType)}
                      items={[
                        { value: 'json', label: 'JSON' },
                        { value: 'xml', label: 'XML' },
                      ]}
                      aria-label="Format"
                      size="sm"
                    />
                  </Box>

                  <ToggleGroup
                    type="single"
                    value={viewMode}
                    onValueChange={(v) => v && setViewMode(v as ViewMode)}
                    size="sm"
                    variant="outline"
                    attached
                    aria-label="View mode"
                  >
                    <Tooltip content="Tree view">
                      <ToggleGroupItem value="tree" aria-label="Tree view">
                        <ListIcon size={14} />
                      </ToggleGroupItem>
                    </Tooltip>
                    <Tooltip content="Network graph">
                      <ToggleGroupItem value="network" aria-label="Network view">
                        <Network size={14} />
                      </ToggleGroupItem>
                    </Tooltip>
                  </ToggleGroup>

                  <ToggleGroup
                    type="single"
                    value={layout}
                    onValueChange={(v) => v && setLayout(v as LayoutType)}
                    size="sm"
                    variant="outline"
                    attached
                    aria-label="Layout"
                  >
                    <Tooltip content="Split panels">
                      <ToggleGroupItem value="split" aria-label="Split layout">
                        <Columns size={14} />
                      </ToggleGroupItem>
                    </Tooltip>
                    <Tooltip content="Single panel">
                      <ToggleGroupItem value="single" aria-label="Single layout">
                        <MonitorIcon size={14} />
                      </ToggleGroupItem>
                    </Tooltip>
                  </ToggleGroup>

                  {layout === 'single' && (
                    <ToggleGroup
                      type="single"
                      value={activePane}
                      onValueChange={(v) => v && setActivePane(v as PaneType)}
                      size="sm"
                      variant="outline"
                      attached
                      aria-label="Active pane"
                    >
                      <Tooltip content="Editor">
                        <ToggleGroupItem value="editor" aria-label="Editor pane">
                          <PanelLeft size={14} />
                        </ToggleGroupItem>
                      </Tooltip>
                      <Tooltip content="Viewer">
                        <ToggleGroupItem value="view" aria-label="Viewer pane">
                          <PanelRight size={14} />
                        </ToggleGroupItem>
                      </Tooltip>
                    </ToggleGroup>
                  )}
                </Inline>

                <Inline gap="2" align="center">
                  <Button
                    variant="solid"
                    colorScheme="accent"
                    size="sm"
                    leftIcon={<Wand2 size={14} />}
                    onClick={handleParse}
                  >
                    Parse
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="soft"
                        colorScheme="neutral"
                        size="sm"
                        rightIcon={<ChevronDown size={12} />}
                        leftIcon={<MoreHorizontal size={14} />}
                        aria-label="More actions"
                      >
                        More
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={formatCode}>
                        <Inline align="center" gap="2">
                          <Code2 size={14} aria-hidden />
                          <span>Format code</span>
                        </Inline>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDownload}>
                        <Inline align="center" gap="2">
                          <Download size={14} aria-hidden />
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
                onSearch={setSearchTerm}
                placeholder="Search lines…"
              />
            </Stack>
          </CardBody>
        </Card>

        {layout === 'split' ? (
          <Grid columns={{ base: 1, lg: 2 }} gap="4">
            {editorPanel}
            {viewerPanel}
          </Grid>
        ) : activePane === 'editor' ? (
          editorPanel
        ) : (
          viewerPanel
        )}

        {error && (
          <Alert status="danger" variant="soft">
            <AlertTitle>Parse error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </Stack>
    </Container>
  );
};

export default DataViewer;
