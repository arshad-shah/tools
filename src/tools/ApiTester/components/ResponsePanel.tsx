import React, { useState } from 'react';
import { 
  FileText, 
  Code, 
  Server, 
  RefreshCw, 
  Download, 
  Copy, 
  Check,
  Clock,
  Eye,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Tab } from './Tab';
import { CodeEditor } from './CodeEditor';
import { ResponseSectionProps } from '../../../types/ApiTesterTypes';
import { Button } from '../../../components/Button';

export const ResponsePanel: React.FC<ResponseSectionProps> = ({ response, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'info'>('body');
  const [copied, setCopied] = useState<boolean>(false);
  const [showRawResponse, setShowRawResponse] = useState<boolean>(false);
  
  // Function to handle copying the response
  const handleCopyResponse = () => {
    if (!response) return;
    
    let textToCopy = '';
    if (activeTab === 'body') {
      textToCopy = typeof response.data === 'object' 
        ? JSON.stringify(response.data, null, 2) 
        : String(response.data);
    } else if (activeTab === 'headers') {
      textToCopy = Object.entries(response.headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    } else if (activeTab === 'info') {
      textToCopy = JSON.stringify({
        url: window.location.href, // This would be better if we had the actual request URL
        status: response.status,
        statusText: response.statusText,
        time: response.time,
      }, null, 2);
    }
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };
  
  // Function to download response
  const handleDownloadResponse = () => {
    if (!response) return;
    
    let content = '';
    let filename = '';
    let type = '';
    
    if (activeTab === 'body') {
      if (typeof response.data === 'object') {
        content = JSON.stringify(response.data, null, 2);
        filename = 'response.json';
        type = 'application/json';
      } else {
        content = String(response.data);
        filename = 'response.txt';
        type = 'text/plain';
      }
    } else if (activeTab === 'headers') {
      content = Object.entries(response.headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      filename = 'headers.txt';
      type = 'text/plain';
    } else if (activeTab === 'info') {
      content = JSON.stringify({
        url: window.location.href,
        status: response.status,
        statusText: response.statusText,
        time: response.time,
      }, null, 2);
      filename = 'request-info.json';
      type = 'application/json';
    }
    
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Enhanced feature: View raw response vs. parsed
  const toggleRawResponse = () => {
    setShowRawResponse(!showRawResponse);
  };
  
  // Determine status badge color based on response code
  const getStatusBadgeClass = (status: number): string => {
    if (status < 300) return 'bg-green-100 text-green-800';
    if (status < 400) return 'bg-blue-100 text-blue-800';
    if (status < 500) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-md font-medium mb-4">Response</h3>
        <div className="p-8 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="ml-2 text-gray-600">Sending request...</span>
        </div>
      </div>
    );
  }
  
  if (!response) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-md font-medium mb-4">Response</h3>
        <div className="p-8 text-center text-gray-500">
          <Server className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Send a request to see the response</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center mb-4">
        <h3 className="text-md font-medium">Response</h3>
        
        <div className="ml-auto flex items-center space-x-2">
          <div className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(response.status)}`}>
            {response.status} {response.statusText}
          </div>
          {response.time !== undefined && (
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              {response.time}ms
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center mb-2 border-b border-gray-200">
        <div className="flex space-x-1">
          <Tab 
            active={activeTab === 'body'} 
            label="Body" 
            onClick={() => setActiveTab('body')} 
            icon={FileText} 
          />
          <Tab 
            active={activeTab === 'headers'} 
            label="Headers" 
            onClick={() => setActiveTab('headers')} 
            icon={Code} 
          />
          <Tab 
            active={activeTab === 'info'} 
            label="Info" 
            onClick={() => setActiveTab('info')} 
            icon={Eye} 
          />
        </div>
        <div className="ml-auto flex items-center space-x-2 mr-2">
          {activeTab === 'body' && typeof response.data === 'object' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={toggleRawResponse}
            >
                {showRawResponse ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {showRawResponse ? 'Parsed' : 'Raw'}
            </Button>
          )}
          <Button
            variant="outline" 
            size="sm" 
            onClick={handleCopyResponse}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadResponse}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
      
      {activeTab === 'body' && (
        <div className="relative">
          {typeof response.data === 'object' && !showRawResponse ? (
            <div className="border border-gray-300 rounded-md overflow-auto max-h-96">
              <pre className="p-3 font-mono text-sm">
                {JSON.stringify(response.data, null, 2)}
              </pre>
            </div>
          ) : (
            <CodeEditor 
              value={typeof response.data === 'object' ? 
                JSON.stringify(response.data, null, 2) : 
                String(response.data)} 
              onChange={() => {}} 
              language={typeof response.data === 'object' ? 'json' : 'text'} 
              readOnly
            />
          )}
        </div>
      )}
      
      {activeTab === 'headers' && (
        <div className="border border-gray-300 rounded-md p-3 font-mono text-sm overflow-auto max-h-80">
          {response.headers && Object.entries(response.headers).map(([key, value]) => (
            <div key={key} className="mb-1">
              <span className="font-semibold">{key}:</span> {value}
            </div>
          ))}
          {Object.keys(response.headers).length === 0 && (
            <div className="text-gray-500 italic">No headers received</div>
          )}
        </div>
      )}
      
      {activeTab === 'info' && (
        <div className="border border-gray-300 rounded-md p-3 overflow-auto max-h-80">
          <table className="w-full">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-2 px-3 font-medium text-gray-700">Status</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(response.status)}`}>
                    {response.status} {response.statusText}
                  </span>
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 px-3 font-medium text-gray-700">Time</td>
                <td className="py-2 px-3">{response.time ? `${response.time}ms` : 'Unknown'}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 px-3 font-medium text-gray-700">Size</td>
                <td className="py-2 px-3">
                  {typeof response.data === 'object' 
                    ? JSON.stringify(response.data).length 
                    : String(response.data).length} bytes
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};