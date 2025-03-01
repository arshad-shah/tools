import React, { useState, useEffect } from 'react';
import { Copy } from 'lucide-react';

const URLEncoderDecoder: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    try {
      if (inputText) {
        if (mode === 'encode') {
          setOutputText(encodeURIComponent(inputText));
        } else {
          setOutputText(decodeURIComponent(inputText));
        }
        setError('');
      } else {
        setOutputText('');
      }
    } catch (err) {
      setError(`Error: ${(err as Error).message}`);
      setOutputText('');
    }
  }, [inputText, mode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setInputText(e.target.value);
  };

  const handleClear = (): void => {
    setInputText('');
    setOutputText('');
    setError('');
  };

  const handleCopy = (): void => {
    if (outputText) {
      navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleModeChange = (newMode: 'encode' | 'decode'): void => {
    setMode(newMode);
  };

  const handleSwap = (): void => {
    setInputText(outputText);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="py-6 bg-amber-600 text-white">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-center">URL Encoder/Decoder</h1>
          <p className="text-center mt-2 text-amber-100">Easily encode or decode URL components with a clean interface</p>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-4xl mx-auto">
          <div className="flex border-b">
            <button
              className={`flex-1 py-3 px-4 text-center font-medium ${mode === 'encode' ? 'bg-amber-50 text-amber-600 border-b-2 border-amber-600' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => handleModeChange('encode')}
            >
              Encode
            </button>
            <button
              className={`flex-1 py-3 px-4 text-center font-medium ${mode === 'decode' ? 'bg-amber-50 text-amber-600 border-b-2 border-amber-600' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => handleModeChange('decode')}
            >
              Decode
            </button>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <label htmlFor="input" className="block text-sm font-medium text-gray-700 mb-2">
                {mode === 'encode' ? 'Text to encode:' : 'Text to decode:'}
              </label>
              <textarea
                id="input"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                rows={5}
                value={inputText}
                onChange={handleInputChange}
                placeholder={mode === 'encode' ? 'Enter text to encode' : 'Enter text to decode'}
              />
            </div>

            <div className="flex justify-between mb-6">
              <button
                onClick={handleClear}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear
              </button>
              <button
                onClick={handleSwap}
                className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-md hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                disabled={!outputText}
              >
                Use Output as Input
              </button>
            </div>

            <div className="mb-4">
              <label htmlFor="output" className="block text-sm font-medium text-gray-700 mb-2">
                {mode === 'encode' ? 'Encoded result:' : 'Decoded result:'}
              </label>
              <div className="relative">
                <textarea
                  id="output"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm bg-gray-50 ${error ? 'border-red-300' : 'border-gray-300'}`}
                  rows={5}
                  value={error || outputText}
                  readOnly
                />
                {outputText && !error && (
                  <button
                    onClick={handleCopy}
                    className="absolute right-2 top-2 p-2 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    title="Copy to clipboard"
                  >
                    <Copy size={16} />
                  </button>
                )}
              </div>
              {copied && (
                <p className="text-green-600 text-sm mt-1">Copied to clipboard!</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-3">About URL Encoding/Decoding</h2>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-700 mb-3">
              URL encoding converts characters into a format that can be transmitted over the Internet. URLs can only be sent over the Internet using the ASCII character set, so URL encoding replaces unsafe ASCII characters with a "%" followed by two hexadecimal digits.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Common URL encodings:</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Space: %20</li>
                  <li>!: %21</li>
                  <li>#: %23</li>
                  <li>$: %24</li>
                  <li>&: %26</li>
                  <li>+: %2B</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-800 mb-2">When to use URL encoding:</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>When creating URLs with query parameters</li>
                  <li>When sending data in HTTP requests</li>
                  <li>When working with special characters in URLs</li>
                  <li>When creating links with non-ASCII characters</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 bg-gray-100 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-600 text-sm">
            URL Encoder/Decoder Tool • Made with React, TypeScript and TailwindCSS
          </p>
        </div>
      </footer>
    </div>
  );
};

export default URLEncoderDecoder;