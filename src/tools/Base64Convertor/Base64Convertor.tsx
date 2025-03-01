import React, { useState, useEffect } from 'react';
import { ArrowDownUp, Copy, Check } from 'lucide-react';

type NotificationType = {
  message: string;
  type: 'success' | 'error';
} | null;

const Base64Converter: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [notification, setNotification] = useState<NotificationType>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Handle mode toggle
  const toggleMode = (): void => {
    const currentOutput = outputText;
    
    // Switch mode
    setMode(prevMode => prevMode === 'encode' ? 'decode' : 'encode');
    
    // Swap input/output (if there's data to preserve)
    if (currentOutput) {
      setInputText(currentOutput);
      setOutputText('');
    }
  };

  // Process text conversion whenever input or mode changes
  useEffect(() => {
    if (!inputText) {
      setOutputText('');
      return;
    }
    
    if (mode === 'encode') {
      try {
        const encoded = btoa(inputText);
        setOutputText(encoded);
      } catch {
        setOutputText('Error: Could not encode text. Please ensure it contains valid characters.');
        showNotification('Error encoding text', 'error');
      }
    } else {
      try {
        const decoded = atob(inputText);
        setOutputText(decoded);
      } catch {
        setOutputText('Error: Could not decode. Please ensure you entered valid Base64.');
        showNotification('Error decoding Base64', 'error');
      }
    }
  }, [inputText, mode]);

  // Enhanced copy to clipboard
  const copyToClipboard = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(outputText);
      setIsCopied(true);
      showNotification('Copied to clipboard!', 'success');
      
      // Reset copy icon after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch {
      fallbackCopyToClipboard();
    }
  };

  // Fallback copy method for browsers with clipboard restrictions
  const fallbackCopyToClipboard = (): void => {
    try {
      // Create a temporary textarea
      const textArea = document.createElement('textarea');
      textArea.value = outputText;
      
      // Make the textarea out of viewport
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      // Select and copy
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setIsCopied(true);
        showNotification('Copied to clipboard!', 'success');
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        showNotification('Failed to copy', 'error');
      }
    } catch {
      showNotification('Failed to copy', 'error');
    }
  };

  // Show notification
  const showNotification = (message: string, type: 'success' | 'error'): void => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Clear data
  const clearData = (): void => {
    setInputText('');
    setOutputText('');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-teal-600 mb-2">Base64 Converter</h1>
        <p className="text-gray-600">Convert text to and from Base64 encoding</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-4xl mx-auto w-full">
        {/* Mode Toggle */}
        <div className="flex justify-center p-4 bg-gray-100">
          <div className="relative inline-flex bg-gray-200 rounded-full p-1">
            <button
              onClick={() => setMode('encode')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === 'encode'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-gray-700 hover:text-teal-600'
              }`}
            >
              Encode
            </button>
            <button
              onClick={() => setMode('decode')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === 'decode'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-gray-700 hover:text-teal-600'
              }`}
            >
              Decode
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {/* Text Input Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {mode === 'encode' ? 'Text to encode' : 'Base64 to decode'}
              </label>
              {inputText && (
                <button
                  onClick={clearData}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              className="w-full h-40 p-3 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={mode === 'encode' ? 'Enter text to convert to Base64...' : 'Enter Base64 to decode...'}
            />
          </div>

          {/* Direction Icon */}
          <div className="flex justify-center my-4">
            <button 
              onClick={toggleMode}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
              title="Switch mode and preserve data"
            >
              <ArrowDownUp className="h-6 w-6 text-teal-600" />
            </button>
          </div>

          {/* Output Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {mode === 'encode' ? 'Base64 Result' : 'Decoded Result'}
              </label>
              {outputText && (
                <button
                  onClick={copyToClipboard}
                  className="flex items-center text-xs text-teal-600 hover:text-teal-800"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      <span>Copy to clipboard</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                className="w-full h-40 p-3 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                value={outputText}
                readOnly
                placeholder={mode === 'encode' ? 'Base64 output will appear here...' : 'Decoded text will appear here...'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div 
          className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg text-white ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default Base64Converter;