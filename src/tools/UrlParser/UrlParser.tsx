import React, { useState, useEffect, JSX } from 'react';
import { Split, Copy, CheckCheck, Clipboard, ExternalLink } from 'lucide-react';

/*
Definition:
Description: "Break down and analyze URL components"
Icon: Split
Color: "bg-cyan-600"
Category: "development"
*/

interface ParsedUrl {
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  host: string;
  searchParams: [string, string][];
}

interface ComponentItem {
  label: string;
  value: string;
  color?: string;
}

const URLParser: React.FC = () => {
  const [url, setUrl] = useState<string>('https://user:pass@www.example.com:8080/path/to/page.html?query=string&foo=bar#hash');
  const [parsedUrl, setParsedUrl] = useState<ParsedUrl | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('visualization');
  const [isValid, setIsValid] = useState<boolean>(true);
  
  useEffect(() => {
    parseUrl(url);
  }, [url]);
  
  const parseUrl = (inputUrl: string): void => {
    try {
      const urlObj = new URL(inputUrl);
      
      const result: ParsedUrl = {
        protocol: urlObj.protocol,
        username: urlObj.username,
        password: urlObj.password,
        hostname: urlObj.hostname,
        port: urlObj.port,
        pathname: urlObj.pathname,
        search: urlObj.search,
        hash: urlObj.hash,
        origin: urlObj.origin,
        host: urlObj.host,
        searchParams: Array.from(urlObj.searchParams.entries()),
      };
      
      setParsedUrl(result);
      setIsValid(true);
    } catch {
      setParsedUrl(null);
      setIsValid(false);
    }
  };
  
  const handleCopy = (text: string, label: string): void => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };
  
  const handlePaste = async (): Promise<void> => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setUrl(clipboardText);
    } catch (error) {
      console.error("Failed to read clipboard:", error);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setUrl(e.target.value);
  };

  const handleClearUrl = (): void => {
    setUrl('');
  };
  
  const renderUrlInput = (): JSX.Element => (
    <div className="relative mb-6">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <ExternalLink size={20} className="text-gray-400" />
      </div>
      <input
        type="text"
        value={url}
        onChange={handleUrlChange}
        placeholder="Enter a URL to parse..."
        className={`w-full pl-10 pr-24 py-4 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-cyan-500 transition-all duration-200 ${
          isValid ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'
        }`}
      />
      <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
        {url && (
          <button 
            onClick={handleClearUrl}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
            title="Clear"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <button 
          onClick={handlePaste}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center gap-1"
          title="Paste from clipboard"
        >
          <Clipboard size={16} />
          <span>Paste</span>
        </button>
      </div>
    </div>
  );

  const renderHeader = (): JSX.Element => (
    <div className="flex items-center mb-8">
      <div className="bg-cyan-600 p-3 rounded-2xl mr-4 shadow-lg shadow-cyan-100">
        <Split size={28} className="text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">URL Parser</h1>
        <p className="text-gray-500 text-sm">Break down and analyze URL components</p>
      </div>
    </div>
  );

  const renderTabs = (): JSX.Element => (
    <div className="mb-6 border-b border-gray-200">
      <div className="flex overflow-x-auto hide-scrollbar">
        {[
          { id: 'visualization', label: 'Visual Breakdown' },
          { id: 'components', label: 'URL Components' },
          { id: 'queryParams', label: 'Query Parameters' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-5 text-sm font-medium whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-b-2 border-cyan-600 text-cyan-700' 
                : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
            } transition-colors duration-200`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderVisualization = (): JSX.Element => {
    if (!parsedUrl) return <></>;
    return (
      <div className="space-y-6">
        <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl overflow-x-auto">
          <div className="text-base font-mono leading-relaxed min-w-max">
            <div className="space-y-1">
              <div className="flex items-center">
                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded mr-2 text-xs font-semibold">Protocol</span>
                <span className="text-purple-600">{parsedUrl.protocol}</span>
              </div>
              
              {(parsedUrl.username || parsedUrl.password) && (
                <div className="flex items-center">
                  <span className="bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded mr-2 text-xs font-semibold">Auth</span>
                  <span className="text-cyan-600">
                    {parsedUrl.username}
                    {parsedUrl.password && (
                      <>
                        <span className="text-gray-400">:</span>
                        <span>{parsedUrl.password}</span>
                      </>
                    )}
                    <span className="text-gray-400">@</span>
                  </span>
                </div>
              )}
              
              <div className="flex items-center">
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded mr-2 text-xs font-semibold">Hostname</span>
                <span className="text-green-600">{parsedUrl.hostname}</span>
              </div>
              
              {parsedUrl.port && (
                <div className="flex items-center">
                  <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded mr-2 text-xs font-semibold">Port</span>
                  <span className="text-gray-400">:</span>
                  <span className="text-red-600">{parsedUrl.port}</span>
                </div>
              )}
              
              <div className="flex items-center">
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2 text-xs font-semibold">Path</span>
                <span className="text-blue-600">{parsedUrl.pathname}</span>
              </div>
              
              {parsedUrl.search && (
                <div className="flex items-center">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded mr-2 text-xs font-semibold">Query</span>
                  <span className="text-yellow-600">{parsedUrl.search}</span>
                </div>
              )}
              
              {parsedUrl.hash && (
                <div className="flex items-center">
                  <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded mr-2 text-xs font-semibold">Fragment</span>
                  <span className="text-orange-600">{parsedUrl.hash}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl overflow-hidden shadow border border-gray-100">
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <h3 className="font-medium text-gray-700">URL Components</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {[
              { label: 'Protocol', value: parsedUrl.protocol, color: 'purple' },
              { label: 'Username', value: parsedUrl.username, color: 'cyan' },
              { label: 'Password', value: parsedUrl.password, color: 'cyan' },
              { label: 'Hostname', value: parsedUrl.hostname, color: 'green' },
              { label: 'Port', value: parsedUrl.port, color: 'red' },
              { label: 'Path', value: parsedUrl.pathname, color: 'blue' },
              { label: 'Query', value: parsedUrl.search, color: 'yellow' },
              { label: 'Fragment', value: parsedUrl.hash, color: 'orange' },
            ].filter(item => item.value).map(item => (
              <div 
                key={item.label} 
                className={`flex items-center justify-between p-3 rounded-lg bg-${item.color}-50 border border-${item.color}-100`}
              >
                <div>
                  <div className={`text-xs font-medium text-${item.color}-700 mb-1`}>{item.label}</div>
                  <div className={`font-mono text-sm text-${item.color}-600 break-all`}>{item.value}</div>
                </div>
                <button
                  onClick={() => handleCopy(item.value, item.label)}
                  className={`ml-2 p-1.5 text-${item.color}-700 hover:bg-${item.color}-100 rounded-full transition-colors`}
                  title="Copy to clipboard"
                >
                  {copied === item.label ? <CheckCheck size={16} /> : <Copy size={16} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderComponents = (): JSX.Element => {
    if (!parsedUrl) return <></>;
    
    const components: ComponentItem[] = [
      { label: 'Full URL', value: url },
      { label: 'Origin', value: parsedUrl.origin },
      { label: 'Protocol', value: parsedUrl.protocol },
      { label: 'Username', value: parsedUrl.username },
      { label: 'Password', value: parsedUrl.password },
      { label: 'Host', value: parsedUrl.host },
      { label: 'Hostname', value: parsedUrl.hostname },
      { label: 'Port', value: parsedUrl.port },
      { label: 'Pathname', value: parsedUrl.pathname },
      { label: 'Search', value: parsedUrl.search },
      { label: 'Hash', value: parsedUrl.hash },
    ];
    
    return (
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Component</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {components.map((item) => (
                <tr key={item.label} className={!item.value ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.label}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono break-all">{item.value || '(empty)'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {item.value && (
                      <button
                        onClick={() => handleCopy(item.value, `table-${item.label}`)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full text-cyan-700 bg-cyan-50 hover:bg-cyan-100 transition-colors"
                      >
                        {copied === `table-${item.label}` ? (
                          <>
                            <CheckCheck size={14} className="mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={14} className="mr-1" />
                            Copy
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderQueryParams = (): JSX.Element => {
    if (!parsedUrl) return <></>;
    
    return (
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        {parsedUrl.searchParams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parsedUrl.searchParams.map(([key, value], index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{key}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono break-all">{value}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      <button
                        onClick={() => handleCopy(value, `param-${key}`)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full text-cyan-700 bg-cyan-50 hover:bg-cyan-100 transition-colors"
                      >
                        {copied === `param-${key}` ? (
                          <>
                            <CheckCheck size={14} className="mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={14} className="mr-1" />
                            Copy
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-gray-500 text-lg font-medium mb-1">No Query Parameters</h3>
            <p className="text-gray-400 text-sm">This URL doesn't contain any query parameters.</p>
          </div>
        )}
      </div>
    );
  };
  
  if (!parsedUrl) {
    return (
      <div className="flex flex-col p-6 max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100">
        {renderHeader()}
        
        <div className="w-full">
          {renderUrlInput()}
          
          <div className="p-6 bg-red-50 rounded-xl border border-red-100">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Invalid URL</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Please enter a valid URL including protocol (e.g., https://example.com)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col p-6 max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100">
      {renderHeader()}
      
      <div className="w-full">
        {renderUrlInput()}
        {renderTabs()}
        
        {activeTab === 'visualization' && renderVisualization()}
        {activeTab === 'components' && renderComponents()}
        {activeTab === 'queryParams' && renderQueryParams()}
      </div>
    </div>
  );
};

export default URLParser;