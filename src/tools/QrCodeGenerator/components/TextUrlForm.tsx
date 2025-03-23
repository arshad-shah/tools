// components/TextUrlForm.tsx
import React from 'react';
import { FileText, Link, AlertCircle, BarChart2 } from 'lucide-react';

interface TextUrlFormProps {
  text: string;
  setText: (text: string) => void;
  isUrl: boolean;
}

const TextUrlForm: React.FC<TextUrlFormProps> = ({ text, setText, isUrl }) => {
  // Check if URL is valid
  const isValidUrl = () => {
    if (!isUrl || !text) return true;
    try {
      new URL(text);
      return true;
    } catch (_) {
      return false;
    }
  };

  const validationError = isUrl && text && !isValidUrl();
  
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="text-content" className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
            {isUrl ? (
              <>
                <Link size={16} className="text-emerald-500" />
                URL Address
              </>
            ) : (
              <>
                <FileText size={16} className="text-emerald-500" />
                Text Content
              </>
            )}
          </label>
          <div className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            isUrl ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {isUrl ? 'URL' : 'TEXT'}
          </div>
        </div>
        
        <div className="relative">
          <textarea
            id="text-content"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className={`w-full p-3 border-2 rounded-lg shadow-sm transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
              validationError 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : isUrl 
                  ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500' 
                  : 'border-blue-200 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder={isUrl ? 'https://example.com' : 'Enter text here...'}
          />
          
          {/* Character count for text mode */}
          {!isUrl && text.length > 0 && (
            <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-gray-100 rounded-md text-xs text-gray-500 flex items-center gap-1">
              <BarChart2 size={12} />
              {text.length} {text.length === 1 ? 'character' : 'characters'}
            </div>
          )}
        </div>
        
        {/* Helper text */}
        <p className="mt-1 text-xs text-gray-500">
          {isUrl 
            ? 'Enter the complete URL including https:// or http://' 
            : 'Enter the text content you want to encode in the QR code'}
        </p>
      </div>

      {/* URL validation message */}
      {validationError && (
        <div className="flex items-center p-3 bg-red-50 border border-red-100 rounded-lg text-red-800">
          <AlertCircle size={16} className="text-red-500 mr-2 flex-shrink-0" />
          <div className="text-sm">
            Please enter a valid URL (e.g., https://example.com)
          </div>
        </div>
      )}

      {/* URL format guidance */}
      {isUrl && text && isValidUrl() && (
        <div className="flex items-start p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
          <Link size={16} className="text-emerald-500 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-emerald-800">URL Format</div>
            <div className="text-xs text-emerald-700 mt-0.5">
              When scanned, this QR code will take users directly to your website.
              {!text.startsWith('https://') && text.startsWith('http://') && (
                <div className="mt-1 text-amber-600">
                  Consider using HTTPS for better security.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Text content statistics */}
      {!isUrl && text.length > 0 && (
        <div className="flex items-start p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <FileText size={16} className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-blue-800">Text Content</div>
            <div className="text-xs text-blue-700 mt-0.5">
              {text.length > 100 
                ? 'Your text is quite long, which will create a denser QR code. Consider using a higher error correction level.' 
                : 'Your text content will be directly encoded in the QR code.'}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-800">
                {text.length} characters
              </div>
              <div className="text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-800">
                {text.split(/\s+/).filter(word => word.length > 0).length} words
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextUrlForm;