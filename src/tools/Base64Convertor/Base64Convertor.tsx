import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Copy, Check } from 'lucide-react';
import useClipboard from '../../hooks/useClipboard';

type NotificationType = {
  message: string;
  type: 'success' | 'error';
} | null;

const Base64Converter: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [notification, setNotification] = useState<NotificationType>(null);

  const { copied, copy } = useClipboard();

  // Handle mode toggle
  const toggleMode = (): void => {
    const currentOutput = outputText;
    setMode(prevMode => prevMode === 'encode' ? 'decode' : 'encode');
    
    if (currentOutput) {
      setInputText(currentOutput);
      setOutputText('');
    }
  };

  // Process text conversion
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

  // Copy to clipboard
  const copyToClipboard = async (): Promise<void> => {
    await copy(outputText);
    showNotification('Copied to clipboard!', 'success');
  };


  const showNotification = (message: string, type: 'success' | 'error'): void => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">


        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Mode Toggle */}
          <div className="flex justify-center p-6 bg-slate-50 border-b border-slate-200">
            <div className="inline-flex bg-slate-200 rounded-xl p-1">
              <button
                onClick={() => setMode('encode')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'encode'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-700 hover:text-teal-700'
                }`}
              >
                Encode
              </button>
              <button
                onClick={() => setMode('decode')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'decode'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-700 hover:text-teal-700'
                }`}
              >
                Decode
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {mode === 'encode' ? 'Text to encode' : 'Base64 to decode'}
              </label>
              <textarea
                className="w-full h-32 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-700 focus:border-teal-700 transition-all resize-none"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={mode === 'encode' ? 'Enter your text...' : 'Enter Base64 text...'}
              />
            </div>

            {/* Toggle Button */}
            <div className="flex justify-center mb-6">
              <button 
                onClick={toggleMode}
                className="p-3 bg-teal-700 hover:bg-teal-800 text-white rounded-full transition-all hover:scale-105 shadow-lg"
              >
                <ArrowRightLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Output */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  {mode === 'encode' ? 'Base64 result' : 'Decoded result'}
                </label>
                {outputText && !outputText.startsWith('Error:') && (
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded-lg transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <textarea
                className={`w-full h-32 p-4 rounded-xl resize-none ${
                  outputText.startsWith('Error:')
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-slate-300 bg-slate-50 text-slate-700'
                }`}
                value={outputText}
                readOnly
                placeholder={mode === 'encode' ? 'Base64 result will appear here...' : 'Decoded text will appear here...'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div 
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-white font-medium ${
            notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default Base64Converter;