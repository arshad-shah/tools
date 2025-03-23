import React from 'react';
import { Check, Copy, EyeOff, Eye } from 'lucide-react';

interface PasswordDisplayProps {
  password: string;
  onCopy: () => void;
  copied: boolean;
}

const PasswordDisplay: React.FC<PasswordDisplayProps> = ({ password, onCopy, copied }) => {
  const [hidden, setHidden] = React.useState<boolean>(false);

  const toggleVisibility = (): void => {
    setHidden(!hidden);
  };

  // Count character types
  const counts = {
    uppercase: password.match(/[A-Z]/g)?.length || 0,
    lowercase: password.match(/[a-z]/g)?.length || 0,
    numbers: password.match(/[0-9]/g)?.length || 0,
    special: password.match(/[^A-Za-z0-9]/g)?.length || 0,
  };

  return (
    <div className="rounded-lg overflow-hidden border border-orange-200 bg-white shadow-sm">
      <div className="bg-orange-50 px-4 py-2 border-b border-orange-200 flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Generated Password</h3>
        <button
          onClick={toggleVisibility}
          className="p-1 text-gray-500 hover:text-orange-500 transition-colors"
          title={hidden ? "Show password" : "Hide password"}
        >
          {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>
      
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-grow font-mono text-base md:text-lg bg-gray-50 p-3 rounded-md overflow-x-auto border border-gray-100 relative">
            {hidden ? (
              <div className="flex space-x-1">
                {Array.from({ length: password.length }).map((_, index) => (
                  <span key={index} className="w-1.5 h-4 bg-gray-400 rounded-full"></span>
                ))}
              </div>
            ) : (
              password.split('').map((char, index) => (
                <span 
                  key={index}
                  className={
                    char.match(/[A-Z]/) ? 'text-orange-600' :
                    char.match(/[a-z]/) ? 'text-gray-900' :
                    char.match(/[0-9]/) ? 'text-green-600' :
                    'text-purple-600'
                  }
                >
                  {char}
                </span>
              ))
            )}
          </div>
          
          <button
            onClick={onCopy}
            className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-100 hover:bg-orange-200 transition-colors"
            title="Copy to clipboard"
            aria-label="Copy password to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-orange-600" />
            )}
          </button>
        </div>
        
        <div className="mt-3 flex gap-2 flex-wrap">
          <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
            {counts.uppercase} uppercase
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {counts.lowercase} lowercase
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
            {counts.numbers} numbers
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
            {counts.special} special
          </span>
        </div>
        
        {!hidden && password.length >= 10 && (
          <div className="mt-3 text-xs text-gray-500 flex items-center">
            <div className="w-1 h-1 bg-orange-500 rounded-full mr-1.5"></div>
            Tip: Use a password manager to store this securely
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordDisplay;