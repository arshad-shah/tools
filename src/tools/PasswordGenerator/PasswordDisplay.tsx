
import { Check, Copy } from 'lucide-react';

interface PasswordDisplayProps {
  password: string;
  onCopy: () => void;
  copied: boolean;
}

const PasswordDisplay = ({ password, onCopy, copied }: PasswordDisplayProps) => {
  return (
    <div className="mt-6 rounded-lg overflow-hidden border border-gray-200">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-600">Generated Password</h3>
      </div>
      <div className="p-4 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex-grow font-mono text-lg bg-gray-50 p-3 rounded-md overflow-x-auto">
            {password.split('').map((char, index) => (
              <span 
                key={index}
                className={
                  char.match(/[A-Z]/) ? 'text-blue-600' :
                  char.match(/[a-z]/) ? 'text-gray-900' :
                  char.match(/[0-9]/) ? 'text-green-600' :
                  'text-purple-600'
                }
              >
                {char}
              </span>
            ))}
          </div>
          <button
            onClick={onCopy}
            className="flex items-center justify-center h-12 w-12 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </div>
        <div className="mt-2 flex gap-2 flex-wrap">
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
            {password.match(/[A-Z]/g)?.length || 0} uppercase
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {password.match(/[a-z]/g)?.length || 0} lowercase
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
            {password.match(/[0-9]/g)?.length || 0} numbers
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
            {password.match(/[^A-Za-z0-9]/g)?.length || 0} special
          </span>
        </div>
      </div>
    </div>
  );
};

export default PasswordDisplay;