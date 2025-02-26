/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/Card';
import { Archive, Columns, List, Maximize2, MinimizeIcon, MonitorIcon, Network } from 'lucide-react';
import { ScrollArea } from "../../../components/scroll-area";
import { useTheme } from 'next-themes';
import { cn } from '../../../lib/utils';
import TreeView from './TreeView';
import Toolbar from './Toolbar';
import CodeEditor from '@uiw/react-textarea-code-editor';
import rehypePrism from "rehype-prism-plus";
import rehypeRewrite from "rehype-rewrite";
import { Toggle } from '../../../components/toggle';
import DataFlow from './treeview/DataFlow';
import { TooltipProvider } from '../../../components/tooltip';

type FormatType = 'json' | 'xml';
type ViewMode = 'tree' | 'network';
interface XMLNode {
  nodeName: string;
  nodeType: number;
  childNodes: NodeListOf<ChildNode>;
  attributes: NamedNodeMap;
  nodeValue: string | null;
}

const DataViewer = () => {
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState<{ [key: string]: any } | null>(null);
  const [error, setError] = useState('');
  const [format, setFormat] = useState<FormatType>('json');
  const [searchTerm, setSearchTerm] = useState('');
  const [fullScreen, setFullScreen] = useState(false);
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [layout, setLayout] = useState('split');
  const [activePane, setActivePane] = useState('editor');

  const getHighlightStyles = (lineNumber: number) => {
    if (highlightedLines.includes(lineNumber)) {
      return theme === 'dark' 
        ? { backgroundColor: 'rgba(99, 102, 241, 0.2)' }
        : { backgroundColor: 'rgba(99, 102, 241, 0.1)' };
    }
    return {};
  };

  const getEditorStyles = () => {
    const baseStyles = {
      fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
      fontSize: '14px',
      minHeight: fullScreen ? 'calc(100vh - 16rem)' : '24rem',
      borderRadius: '0.75rem',
    };

    if (theme === 'dark') {
      return {
        ...baseStyles,
        backgroundColor: '#0f172a',
        color: '#e2e8f0',
      };
    }

    return {
      ...baseStyles,
      backgroundColor: '#f8fafc',
      color: '#1e293b',
    };
  };

  // Update highlighted lines when search term changes
  useEffect(() => {
    if (!searchTerm) {
      setHighlightedLines([]);
      return;
    }

    const lines = inputText.split('\n');
    const matchedLines = lines.reduce((acc: number[], line, index) => {
      if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
        acc.push(index + 1);
      }
      return acc;
    }, []);

    setHighlightedLines(matchedLines);
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
      }
    } catch (err) {
      setError(`Format error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [format, inputText]);

  const formatXML = (xml: string) => {
    let formatted = '';
    let indent = '';
    const tab = '  ';
    xml.split(/>\s*</).forEach(node => {
      if (node.match(/^\/\w/)) {
        indent = indent.substring(tab.length);
      }
      formatted += indent + '<' + node + '>\n';
      if (node.match(/^<?\w[^>]*[^\/]$/)) {
        indent += tab;
      }
    });
    return formatted.substring(1, formatted.length - 2);
  };

  const handleParse = useCallback(() => {
    try {
      if (format === 'json') {
        const parsed = JSON.parse(inputText);
        setParsedData(parsed);
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
      setError(`Parse error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setParsedData(null);
    }
  }, [format, inputText]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([inputText], { 
      type: format === 'json' ? 'application/json' : 'text/xml' 
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
    [rehypeRewrite as any, {
      rewrite: (node: any, index: number) => {
        if (node.properties?.className?.includes('code-line')) {
          const lineNumber = index + 1;
          if (highlightedLines.includes(lineNumber)) {
            node.properties.style = {
              ...node.properties.style,
              ...getHighlightStyles(lineNumber)
            };
            node.properties.className.push('highlighted-line');
          }
        }
      }
    }]
  ] as any;

  const renderEditor = () => (
    <CodeEditor
      value={inputText}
      language={format}
      placeholder={`Please enter ${format.toUpperCase()} code.`}
      onChange={(evn) => setInputText(evn.target.value)}
      padding={15}
      style={getEditorStyles()}
      data-color-mode={theme === 'dark' ? 'dark' : 'light'}
      className="w-full focus:outline-none focus:ring-0"
      rehypePlugins={rehypePlugins}
    />
  );

  const renderContent = () => {
    if (layout === 'split') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={cn(
            "border border-gray-200  rounded-xl overflow-hidden bg-gray-50 ",
            "shadow-sm hover:shadow-md transition-shadow duration-200",
            fullScreen ? "h-[calc(100vh-20rem)]" : "h-96"
          )}>
            <ScrollArea className="h-full">
              {renderEditor()}
            </ScrollArea>
          </div>

          {parsedData && (
            <div className={cn(
              "border border-gray-200 rounded-xl overflow-hidden",
              "bg-white  shadow-sm hover:shadow-md transition-shadow duration-200",
              fullScreen ? "h-[calc(100vh-20rem)]" : "h-96"
            )}>
              <ScrollArea className="h-full p-4">
                {viewMode === 'tree' ? (
                  <TreeView data={parsedData} searchTerm={searchTerm} />
                ) : (
                  <DataFlow initialData={parsedData} />
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={cn(
        "border border-gray-200  rounded-xl overflow-hidden",
        "shadow-sm hover:shadow-md transition-shadow duration-200",
        fullScreen ? "h-[calc(100vh-16rem)]" : "h-96"
      )}>
        <ScrollArea className="h-full">
          {activePane === 'editor' ? (
            renderEditor()
          ) : parsedData && (
            <div className="p-4">
              {viewMode === 'tree' ? (
                <TreeView data={parsedData} searchTerm={searchTerm} />
              ) : (
                <DataFlow initialData={parsedData} />
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  };

  return (
    <TooltipProvider>
    <Card className={cn(
      "w-full transition-all duration-300 ease-in-out backdrop-blur-sm bg-white/80",
      fullScreen ? "fixed inset-0 z-50" : "max-w-4xl",
      "shadow-lg hover:shadow-xl"
    )}>
      <CardHeader className="border-b border-gray-200 ">
        <CardTitle className="flex items-center justify-between">
          <div className="flex justify-between xss:flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <Archive className="w-6 h-6 text-indigo-600 " />
              <span className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Data Viewer
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-1 rounded-lg border border-gray-200  bg-gray-50">
                <Toggle 
                  pressed={layout === 'split'} 
                  onPressedChange={() => setLayout('split')}
                  className="p-2 data-[state=on]:bg-indigo-100 "
                >
                  <Columns className="w-4 h-4 text-indigo-600 " />
                </Toggle>
                <Toggle 
                  pressed={layout === 'single'} 
                  onPressedChange={() => setLayout('single')}
                  className="p-2 data-[state=on]:bg-indigo-100 "
                >
                  <MonitorIcon className="w-4 h-4 text-indigo-600 " />
                </Toggle>
              </div>
              
              {layout === 'single' && (
                <div className="flex items-center space-x-1 rounded-lg border border-gray-200  bg-gray-50 ">
                  <Toggle 
                    pressed={activePane === 'editor'} 
                    onPressedChange={() => setActivePane('editor')}
                    className="p-2 data-[state=on]:bg-indigo-100 "
                  >
                    <span className="text-sm text-indigo-600 ">Editor</span>
                  </Toggle>
                  <Toggle 
                    pressed={activePane === 'view'} 
                    onPressedChange={() => setActivePane('view')}
                    className="p-2 data-[state=on]:bg-indigo-100 "
                  >
                    <span className="text-sm text-indigo-600 ">View</span>
                  </Toggle>
                </div>
              )}

              <div className="flex items-center space-x-1 rounded-lg border border-gray-200  bg-gray-50 ">
                <Toggle 
                  pressed={viewMode === 'tree'} 
                  onPressedChange={() => setViewMode('tree')}
                  className="p-2 data-[state=on]:bg-indigo-100 "
                >
                  <List className="w-4 h-4 text-indigo-600 " />
                </Toggle>
                <Toggle 
                  pressed={viewMode === 'network'} 
                  onPressedChange={() => setViewMode('network')}
                  className="p-2 data-[state=on]:bg-indigo-100 "
                >
                  <Network className="w-4 h-4 text-indigo-600 " />
                </Toggle>
              </div>

              <button
                onClick={() => setFullScreen(!fullScreen)}
                className="p-2 hover:bg-indigo-100  rounded-lg transition-colors"
              >
                {fullScreen ? (
                  <MinimizeIcon className="w-4 h-4 text-indigo-600 " />
                ) : (
                  <Maximize2 className="w-4 h-4 text-indigo-600 " />
                )}
              </button>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-6">
          <Toolbar
            format={format}
            setFormat={setFormat}
            handleParse={handleParse}
            formatCode={formatCode}
            handleDownload={handleDownload}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />

          {renderContent()}

          {error && (
            <div className="p-4 bg-red-50  text-red-600  rounded-xl border border-red-200 ">
              {error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
        </TooltipProvider>
  );
};

export default DataViewer;