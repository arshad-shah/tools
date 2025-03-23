import React from 'react';
import { Hash, Fingerprint, Divide, Binary } from 'lucide-react';

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tooltip?: string;
  variant?: 'primary' | 'secondary' | 'neutral';
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value, tooltip, variant = 'primary' }) => {
  const variantStyles = {
    primary: "bg-orange-50 text-orange-600 ring-orange-200",
    secondary: "bg-amber-50 text-amber-600 ring-amber-200",
    neutral: "bg-gray-50 text-gray-600 ring-gray-200"
  };

  return (
    <div className="flex items-center gap-3" title={tooltip}>
      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ring-1 ${variantStyles[variant]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

interface PasswordPropertiesProps {
  length: number;
  uniqueChars: number;
  uniqueRatio: number;
  entropy: number;
}

const PasswordProperties: React.FC<PasswordPropertiesProps> = ({ 
  length, 
  uniqueChars, 
  uniqueRatio, 
  entropy 
}) => {
  const formatEntropy = (value: number): string => {
    const formatted = value.toFixed(1);
    if (value < 30) return formatted;
    if (value < 60) return formatted;
    if (value < 90) return formatted;
    return formatted;
  };

  const getRatioQuality = (ratio: number): string => {
    if (ratio < 0.4) return 'Low diversity';
    if (ratio < 0.7) return 'Good diversity';
    return 'Excellent diversity';
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-orange-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Password Properties</h3>
        <div className="h-px flex-1 bg-gradient-to-r from-orange-200 to-transparent"></div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatItem 
          icon={<Hash className="w-5 h-5" />}
          label="Length"
          value={length}
          tooltip="Total number of characters"
          variant="primary"
        />
        
        <StatItem 
          icon={<Fingerprint className="w-5 h-5" />}
          label="Unique Characters"
          value={uniqueChars}
          tooltip="Number of different characters used"
          variant="secondary"
        />
        
        <StatItem 
          icon={<Divide className="w-5 h-5" />}
          label={getRatioQuality(uniqueRatio)}
          value={`${(uniqueRatio * 100).toFixed(0)}%`}
          tooltip="Percentage of unique characters (higher is better)"
          variant={uniqueRatio < 0.4 ? "neutral" : uniqueRatio < 0.7 ? "secondary" : "primary"}
        />
        
        <StatItem 
          icon={<Binary className="w-5 h-5" />}
          label="Entropy"
          value={`${formatEntropy(entropy)} bits`}
          tooltip="Measure of randomness (higher is better)"
          variant={entropy < 60 ? "neutral" : entropy < 90 ? "secondary" : "primary"}
        />
      </div>
      
      <div className="mt-4 pt-3 border-t border-orange-100">
        <div className="flex items-start">
          <div className="mr-2 mt-0.5 text-orange-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-xs text-gray-600">
            <span className="font-medium">Entropy</span> is a measure of password randomness. 
            Passwords with at least 70 bits of entropy are considered strong for most applications. 
            Government and high-security systems typically require 90+ bits.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordProperties;