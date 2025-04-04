/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from 'react';
import { ScrollArea } from "../../../components/scroll-area";
import { useTheme } from 'next-themes';
import { cn } from '../../../lib/utils';
import TreeView from './TreeView';
import Toolbar from './Toolbar';
import CodeEditor from '@uiw/react-textarea-code-editor';
import rehypePrism from "rehype-prism-plus";
import rehypeRewrite from "rehype-rewrite";
import DataFlow from './treeview/DataFlow';
import { TooltipProvider } from '../../../components/tooltip';

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
  const [parsedData, setParsedData] = useState<{ [key: string]: any } | null>(null);
  const [error, setError] = useState('');
  const [format, setFormat] = useState<FormatType>('json');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [layout, setLayout] = useState<LayoutType>('split');
  const [activePane, setActivePane] = useState<PaneType>('editor');

  // Line highlighting for search results
  const getHighlightStyles = (lineNumber: number) => {
    if (highlightedLines.includes(lineNumber)) {
      return theme === 'dark' 
        ? { backgroundColor: 'rgba(6, 182, 212, 0.2)' } // cyan highlight for dark mode
        : { backgroundColor: 'rgba(6, 182, 212, 0.1)' }; // cyan highlight for light mode
    }
    return {};
  };

  // Editor styles with cyan theme integration
  const getEditorStyles = () => {
    const baseStyles = {
      fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
      fontSize: '14px',
      minHeight: '24rem',
      borderRadius: '0.75rem',
      paddingBottom: '2rem',
    };

    if (theme === 'dark') {
      return {
        ...baseStyles,
        backgroundColor: '#0c4a6e', // dark cyan background
        color: '#ecfeff', // very light cyan text
      };
    }

    return {
      ...baseStyles,
      backgroundColor: '#f0fdfa', // very light cyan background
      color: '#164e63', // dark cyan text
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

  // XML parsing utility
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

  // Format code handler
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

  // XML formatting utility
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

  // Parse content handler
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

  // Download handler
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

  // Syntax highlighting configuration
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

  // Editor component renderer
  const renderEditor = () => (
    <CodeEditor
      value={inputText}
      language={format}
      placeholder={`Please enter ${format.toUpperCase()} code here...`}
      onChange={(evn) => setInputText(evn.target.value)}
      padding={15}
      style={getEditorStyles()}
      data-color-mode={theme === 'dark' ? 'dark' : 'light'}
      className="w-full focus:outline-none focus:ring-0"
      rehypePlugins={rehypePlugins}
    />
  );

  // Main content renderer based on layout
  const renderContent = () => {
    if (layout === 'split') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-12rem)]">
          {/* Editor Panel */}
          <div className={cn(
            "border border-cyan-100 rounded-xl overflow-hidden",
            "bg-gradient-to-br from-white to-cyan-50",
            "shadow-md hover:shadow-lg transition-all duration-200",
            "h-full flex flex-col"
          )}>
            <div className="bg-cyan-600 text-white py-2 px-4 font-medium text-sm flex items-center justify-between">
              <span>{format.toUpperCase()} Editor</span>
              {highlightedLines.length > 0 && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {highlightedLines.length} match{highlightedLines.length !== 1 ? 'es' : ''}
                </span>
              )}
            </div>
            <ScrollArea className="flex-grow">
              {renderEditor()}
            </ScrollArea>
          </div>

          {/* Viewer Panel */}
          {parsedData ? (
            <div className={cn(
              "border border-cyan-100 rounded-xl overflow-hidden",
              "bg-gradient-to-br from-white to-cyan-50",
              "shadow-md hover:shadow-lg transition-all duration-200",
              "h-full flex flex-col"
            )}>
              <div className="bg-cyan-600 text-white py-2 px-4 font-medium text-sm flex items-center justify-between">
                <span>{viewMode === 'tree' ? 'Tree View' : 'Network View'}</span>
                {searchTerm && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    Filtering: {searchTerm}
                  </span>
                )}
              </div>
              <ScrollArea className="flex-grow p-4">
                {viewMode === 'tree' ? (
                  <TreeView data={parsedData} searchTerm={searchTerm} />
                ) : (
                  <DataFlow initialData={parsedData} />
                )}
              </ScrollArea>
            </div>
          ) : (
            <div className={cn(
              "border border-cyan-100 rounded-xl overflow-hidden",
              "bg-gradient-to-br from-white to-cyan-50",
              "shadow-md flex items-center justify-center",
              "h-full"
            )}>
              <div className="text-center p-8">
                <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-cyan-600 text-2xl">?</span>
                </div>
                <h3 className="text-lg font-medium text-cyan-800">No Data to Display</h3>
                <p className="text-cyan-600 mt-2 max-w-xs">
                  Enter some {format.toUpperCase()} in the editor and click "Parse" to visualize your data
                </p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Single pane layout
    return (
      <div className={cn(
        "border border-cyan-100 rounded-xl overflow-hidden",
        "bg-gradient-to-br from-white to-cyan-50",
        "shadow-md hover:shadow-lg transition-all duration-200",
        "h-[calc(100vh-12rem)] flex flex-col"
      )}>
        <div className="bg-cyan-600 text-white py-2 px-4 font-medium text-sm flex items-center justify-between">
          <span>
            {activePane === 'editor' 
              ? `${format.toUpperCase()} Editor` 
              : viewMode === 'tree' ? 'Tree View' : 'Network View'
            }
          </span>
          {activePane === 'editor' && highlightedLines.length > 0 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {highlightedLines.length} match{highlightedLines.length !== 1 ? 'es' : ''}
            </span>
          )}
          {activePane === 'view' && searchTerm && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              Filtering: {searchTerm}
            </span>
          )}
        </div>
        <ScrollArea className="flex-grow">
          {activePane === 'editor' ? (
            renderEditor()
          ) : parsedData ? (
            <div className="p-4">
              {viewMode === 'tree' ? (
                <TreeView data={parsedData} searchTerm={searchTerm} />
              ) : (
                <DataFlow initialData={parsedData} />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-cyan-600 text-2xl">?</span>
                </div>
                <h3 className="text-lg font-medium text-cyan-800">No Data to Display</h3>
                <p className="text-cyan-600 mt-2 max-w-xs">
                  Enter some {format.toUpperCase()} in the editor and click "Parse" to visualize your data
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
        
        {/* Toolbar section */}
        <div className="w-full">
          <Toolbar
            format={format}
            setFormat={setFormat}
            handleParse={handleParse}
            formatCode={formatCode}
            handleDownload={handleDownload}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            layout={layout}
            setLayout={setLayout}
            viewMode={viewMode}
            setViewMode={setViewMode}
            activePane={activePane}
            setActivePane={setActivePane}
          />
        </div>
        
        {/* Main content area */}
        <div className="w-full">
          {renderContent()}
        </div>

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 flex items-center space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-600 font-bold">!</span>
            </div>
            <div className="flex-1">
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}
      
      </div>
    </TooltipProvider>
  );
};

export default DataViewer;