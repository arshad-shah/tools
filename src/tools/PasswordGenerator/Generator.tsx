import { useEffect, useState } from 'react';
import OrangeSlider from './OrangeSlider';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import {  Shield, Key, Lock, RulerIcon } from 'lucide-react';
import { charSets, getSecureRandom, secureShuffle } from './utils/utils';
import PasswordDisplay from './PasswordDisplay';
import PasswordProperties from './PasswordProperties';
import CrackTimeDisplay from './CrackTimeDisplay';
import SecurityInfo from './SecurityInfo';
import { calculateMetrics, getStrengthColor, getStrengthDescription } from './utils/passwordMetrics';
import { PasswordMetrics } from '../../types/PasswordGeneratorTypes';
import OrangeSwitch from './OrangeSwitch';
import ButtonSection from './ButtonSection';

interface CharacterTypeOptionProps {
  label: string;
  sublabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
  recommended?: boolean;
}

const CharacterTypeOption: React.FC<CharacterTypeOptionProps> = ({ 
  label, 
  sublabel, 
  checked, 
  onChange,
  icon,
  recommended = false 
}) => {
  return (
    <div 
      className={`
        flex items-center p-3 rounded-lg transition-all duration-200 
        ${checked 
          ? 'bg-orange-100 border border-orange-200' 
          : 'bg-white border border-gray-200 hover:border-orange-200'
        }
      `}
      onClick={() => onChange(!checked)}
    >
      <div 
        className={`
          flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mr-3
          ${checked 
            ? 'bg-orange-500 text-white shadow-sm' 
            : 'bg-gray-100 text-gray-500'
          }
          transition-colors duration-200
        `}
      >
        {icon}
      </div>
      <div className="flex-grow">
        <div className="flex items-center">
          <label className="text-sm font-medium text-gray-700 cursor-pointer">{label}</label>
          {recommended && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
              Recommended
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">{sublabel}</div>
      </div>
      <OrangeSwitch 
        checked={checked} 
        onCheckedChange={onChange} 
      />
    </div>
  );
};

interface LengthSelectorProps {
  value: number[];
  onChange: (value: number[]) => void;
}

const LengthSelector: React.FC<LengthSelectorProps> = ({ value, onChange }) => {
  const presets = [
    { value: 12, label: 'Basic', security: 'Low' },
    { value: 16, label: 'Good', security: 'Medium' },
    { value: 24, label: 'Strong', security: 'High' },
    { value: 32, label: 'Very Strong', security: 'Very High' }
  ];

  const currentValue = value[0];
  
  // Determine which security level the current value corresponds to
  const getSecurityLevel = (length: number): string => {
    if (length < 12) return 'Weak';
    if (length < 16) return 'Basic';
    if (length < 24) return 'Good';
    if (length < 32) return 'Strong';
    return 'Very Strong';
  };

  const securityLevel = getSecurityLevel(currentValue);
  
  // Get a color class based on the security level
  const getSecurityColorClass = (level: string): string => {
    switch (level) {
      case 'Weak': return 'bg-red-500';
      case 'Basic': return 'bg-amber-500';
      case 'Good': return 'bg-orange-500';
      case 'Strong': return 'bg-green-500';
      case 'Very Strong': return 'bg-green-600';
      default: return 'bg-orange-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <RulerIcon className="w-4 h-4 text-orange-500 mr-1.5" />
          <label className="text-sm font-medium text-gray-700">Password Length</label>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getSecurityColorClass(securityLevel)}`}></div>
          <div className="bg-orange-50 px-3 py-1 rounded-full border border-orange-100 flex items-center">
            <span className="text-sm font-bold text-orange-600">{currentValue}</span>
            <span className="text-xs text-gray-500 ml-1">chars</span>
          </div>
        </div>
      </div>
      
      <OrangeSlider
        value={value}
        onValueChange={onChange}
        min={8}
        max={64}
        step={1}
      />
      
      <div className="flex flex-wrap md:flex-nowrap gap-2 mt-4">
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onChange([preset.value])}
            className={`
              relative flex-1 px-3 py-2 rounded-md border transition-all duration-200
              ${value[0] === preset.value 
                ? 'bg-orange-500 text-white border-orange-600 shadow-sm' 
                : 'bg-white text-gray-700 border-orange-100 hover:bg-orange-50'}
            `}
          >
            <div className="text-xs font-semibold">{preset.label}</div>
            <div className={`text-[10px] ${value[0] === preset.value ? 'text-orange-100' : 'text-gray-500'}`}>
              {preset.value} chars
            </div>
            {value[0] === preset.value && (
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            )}
          </button>
        ))}
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 px-0.5 mt-1">
        <div className="flex items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1"></div>
          <span>Low Security</span>
        </div>
        <div className="flex items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></div>
          <span>High Security</span>
        </div>
      </div>
    </div>
  );
};

const SecurePasswordGenerator: React.FC = () => {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState([16]);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSpecial, setIncludeSpecial] = useState(true);
  const [copied, setCopied] = useState(false);
  const [metrics, setMetrics] = useState<PasswordMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLoading(true);
      setError(null);
      const newMetrics = calculateMetrics(password);
      setMetrics(newMetrics);
      setLoading(false);
    }
    catch (err) {
      setLoading(false);
      console.error('Failed to calculate password metrics:', err);
      setError('Failed to calculate password metrics');
    }
  }, [password]);

  const generatePassword = (): void => {
    let charset = '';
    const mandatoryChars: string[] = [];

    if (includeUppercase) {
      charset += charSets.uppercase;
      mandatoryChars.push(charSets.uppercase[Math.floor(getSecureRandom() * charSets.uppercase.length)]);
    }
    if (includeLowercase) {
      charset += charSets.lowercase;
      mandatoryChars.push(charSets.lowercase[Math.floor(getSecureRandom() * charSets.lowercase.length)]);
    }
    if (includeNumbers) {
      charset += charSets.numbers;
      mandatoryChars.push(charSets.numbers[Math.floor(getSecureRandom() * charSets.numbers.length)]);
    }
    if (includeSpecial) {
      charset += charSets.special;
      mandatoryChars.push(charSets.special[Math.floor(getSecureRandom() * charSets.special.length)]);
    }

    if (!charset) {
      setPassword('Please select at least one character type');
      return;
    }

    const remainingLength = length[0] - mandatoryChars.length;
    const randomChars = Array.from({ length: remainingLength }, () => {
      return charset[Math.floor(getSecureRandom() * charset.length)];
    });

    const allChars = [...mandatoryChars, ...randomChars];
    const shuffledPassword = secureShuffle(allChars).join('');
    
    setPassword(shuffledPassword);
    setCopied(false);
  };

  const copyToClipboard = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  useEffect(() => {
    // Generate a password on initial load
    generatePassword();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Shield className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-6 bg-white shadow-xl rounded-lg">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="text-gray-800">{error}</p>
        </div>
      </div>
    );
  }

  const getPasswordStrength = (strength: number): string => {
    if (strength < 0.3) return 'Weak';
    if (strength < 0.6) return 'Moderate';
    if (strength < 0.8) return 'Strong';
    return 'Very Strong';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-3 md:p-5">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-orange-100">
          <CardHeader className="border-b border-orange-100 py-3">
            <CardTitle className="flex items-center text-gray-900">
              <Key className="w-5 h-5 mr-2 text-orange-500" />
              Generator Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4 lg:gap-6">
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-orange-100 shadow-sm">
                  <LengthSelector value={length} onChange={setLength} />
                </div>

                <div className="bg-white p-4 rounded-lg border border-orange-100 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <Lock className="w-4 h-4 mr-1 text-orange-500" />
                    Character Types
                  </h3>
                  
                  <div className="space-y-2">
                    <CharacterTypeOption
                      label="Uppercase Letters" 
                      sublabel="A-Z" 
                      checked={includeUppercase} 
                      onChange={setIncludeUppercase}
                      icon={<span className="text-sm font-bold">A</span>}
                      recommended={true}
                    />
                    
                    <CharacterTypeOption
                      label="Lowercase Letters" 
                      sublabel="a-z" 
                      checked={includeLowercase} 
                      onChange={setIncludeLowercase}
                      icon={<span className="text-sm font-bold">a</span>}
                      recommended={true}
                    />
                    
                    <CharacterTypeOption
                      label="Numbers" 
                      sublabel="0-9" 
                      checked={includeNumbers} 
                      onChange={setIncludeNumbers}
                      icon={<span className="text-sm font-bold">1</span>}
                      recommended={true}
                    />
                    
                    <CharacterTypeOption
                      label="Special Characters" 
                      sublabel="!@#$%^&*()_+-=[]{}|;:,." 
                      checked={includeSpecial} 
                      onChange={setIncludeSpecial}
                      icon={<span className="text-sm font-bold">$</span>}
                      recommended={true}
                    />
                  </div>
                </div>
                <ButtonSection
                  generatePassword={generatePassword}
                  copyToClipboard={copyToClipboard}
                  password={password}
                  copied={copied}
                />

                {password && (
                  <PasswordDisplay
                    password={password}
                    onCopy={copyToClipboard}
                    copied={copied}
                  />
                )}
              </div>

              {password && (() => {
                if (!metrics) return null;
                
                return (
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-orange-100 shadow-sm">
                      <div className="flex items-center mb-2">
                        <Shield className="w-5 h-5 text-orange-500 mr-2" />
                        <h3 className="text-base font-semibold text-gray-800">Password Strength</h3>
                      </div>
                      
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center">
                          <span className={`inline-block w-3 h-3 rounded-full mr-2 ${getStrengthColor(metrics.strength)}`}></span>
                          <span className="text-sm font-medium text-gray-700">{getPasswordStrength(metrics.strength)}</span>
                        </div>
                        <span className="text-lg font-bold text-orange-500">{Math.round(metrics.strength * 100)}%</span>
                      </div>
                      
                      <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div 
                          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${getStrengthColor(metrics.strength)}`}
                          style={{ width: `${Math.min(metrics.strength * 100, 100)}%` }}
                        />
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-2">
                        {getStrengthDescription(metrics.strength)}
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <PasswordProperties
                        length={password.length}
                        uniqueChars={metrics.uniqueChars}
                        uniqueRatio={metrics.uniqueRatio} 
                        entropy={metrics.entropy}
                      />
                      
                      <CrackTimeDisplay
                        crackTimes={metrics.crackTimes}
                        strength={metrics.strength}
                      />

                      <SecurityInfo />
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurePasswordGenerator;