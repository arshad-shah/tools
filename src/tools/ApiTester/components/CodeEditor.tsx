import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Maximize2, Minimize2 } from 'lucide-react';
import { CodeEditorProps } from '../../../types/ApiTesterTypes';

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  value, 
  onChange, 
  language = "json",
  readOnly = false 
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    // Auto-resize textarea to fit content
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);
  
  // Function to handle copying the code
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };
  
  // Function to format code (JSON only)
  const formatCode = () => {
    if (language === 'json' && value.trim()) {
      try {
        const parsedJson = JSON.parse(value);
        const formattedJson = JSON.stringify(parsedJson, null, 2);
        const event = { target: { value: formattedJson } } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
      } catch {
        alert('Invalid JSON. Unable to format.');
      }
    }
  };
  
  // Function to toggle fullscreen mode
  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };
  
  return (
    <div className={`border border-gray-300 rounded-md overflow-hidden ${
      fullscreen ? 'fixed inset-0 z-50 bg-white' : ''
    }`}>
      <div className="bg-gray-100 border-b border-gray-300 px-3 py-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700 uppercase">{language}</span>
        <div className="flex space-x-2">
          {!readOnly && language === 'json' && (
            <button 
              className="text-gray-500 hover:text-gray-700 text-xs"
              onClick={formatCode}
            >
              Format
            </button>
          )}
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={handleCopy}
            aria-label="Copy code"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full p-3 font-mono text-sm focus:outline-none resize-none overflow-auto ${
          fullscreen ? 'h-[calc(100%-40px)]' : 'min-h-[120px]'
        }`}
        placeholder={
          language === "json" ? "{\n  \"key\": \"value\"\n}" : 
          language === "graphql" ? "query {\n  example {\n    field\n  }\n}" :
          ""
        }
        spellCheck={false}
        wrap="off"
      />
    </div>
  );
};