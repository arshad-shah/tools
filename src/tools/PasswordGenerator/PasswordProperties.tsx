import React from 'react';
import { Hash, Fingerprint, Divide, Binary } from 'lucide-react';

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tooltip?: string;
}

const StatItem = ({ icon, label, value, tooltip }: StatItemProps) => (
  <div className="flex items-center gap-3" title={tooltip}>
    <div className="flex-shrink-0 h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  </div>
);

interface PasswordPropertiesProps {
  length: number;
  uniqueChars: number;
  uniqueRatio: number;
  entropy: number;
}

const PasswordProperties = ({ length, uniqueChars, uniqueRatio, entropy }: PasswordPropertiesProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Password Properties</h3>
        <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent"></div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <StatItem 
          icon={<Hash className="w-5 h-5 text-blue-600" />}
          label="Length"
          value={length}
          tooltip="Total number of characters"
        />
        
        <StatItem 
          icon={<Fingerprint className="w-5 h-5 text-blue-600" />}
          label="Unique Characters"
          value={uniqueChars}
          tooltip="Number of different characters used"
        />
        
        <StatItem 
          icon={<Divide className="w-5 h-5 text-blue-600" />}
          label="Diversity Ratio"
          value={`${(uniqueRatio * 100).toFixed(0)}%`}
          tooltip="Percentage of unique characters (higher is better)"
        />
        
        <StatItem 
          icon={<Binary className="w-5 h-5 text-blue-600" />}
          label="Entropy"
          value={`${entropy.toFixed(1)} bits`}
          tooltip="Measure of randomness (higher is better)"
        />
      </div>
    </div>
  );
};

export default PasswordProperties;