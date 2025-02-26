// components/TextUrlForm.tsx
import React from 'react';

interface TextUrlFormProps {
  text: string;
  setText: (text: string) => void;
  isUrl: boolean;
}

const TextUrlForm: React.FC<TextUrlFormProps> = ({ text, setText, isUrl }) => {
  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          id="text-content"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className={`w-full p-3 border-2 rounded-lg shadow-sm transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
            isUrl 
              ? 'border-indigo-300 focus:border-indigo-500 focus:ring-indigo-500' 
              : 'border-amber-300 focus:border-amber-500 focus:ring-amber-500'
          }`}
          placeholder={isUrl ? 'https://example.com' : 'Enter text here...'}
        />
        <div className={`absolute top-0 right-0 mt-1 mr-1 px-2 py-1 text-xs font-medium rounded-bl-lg rounded-tr-lg ${
          isUrl ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {isUrl ? 'URL' : 'TEXT'}
        </div>
      </div>

      {isUrl && (
        <div className="flex items-center p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
          </svg>
          <div>
            <div className="text-sm font-medium text-gray-700">URL Format</div>
            <div className="text-xs text-gray-500">Make sure your URL starts with http:// or https://</div>
          </div>
        </div>
      )}

      {!isUrl && text.length > 100 && (
        <div className="text-right text-xs text-gray-500">
          {text.length} characters
        </div>
      )}
    </div>
  );
};

export default TextUrlForm;