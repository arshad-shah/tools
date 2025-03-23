import React from 'react';
import { Zap, Copy, Check, RefreshCw, Shield } from 'lucide-react';
import { GenerateButton, CopyButton } from './OrangeButtons';

interface ButtonSectionProps {
  generatePassword: () => void;
  copyToClipboard: () => Promise<void>;
  password: string;
  copied: boolean;
}

const ButtonSection: React.FC<ButtonSectionProps> = ({
  generatePassword,
  copyToClipboard,
  password,
  copied
}) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-orange-100 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center">
          <Shield className="w-4 h-4 mr-1 text-orange-500" />
          Password Actions
        </h3>
        <p className="text-xs text-gray-500 mt-1">Generate a new password or copy the current one</p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <GenerateButton 
          onClick={generatePassword}
          fullWidth
          size="md"
          leadingIcon={<Zap className="w-4 h-4" />}
        >
          Generate New
        </GenerateButton>
        
        <CopyButton
          onClick={copyToClipboard}
          disabled={!password}
          fullWidth
          size="md"
          copied={copied}
          leadingIcon={copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        >
          {copied ? 'Copied!' : 'Copy Password'}
        </CopyButton>
      </div>
      
      <div className="mt-3 flex justify-end">
        <button 
          onClick={generatePassword}
          className="text-xs text-gray-500 hover:text-orange-500 flex items-center transition-colors"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh with same settings
        </button>
      </div>
    </div>
  );
};

export default ButtonSection;