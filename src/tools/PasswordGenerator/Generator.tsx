import { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Slider } from '../../components/Slider';
import { Badge } from '../../components/Badge';
import { Shield, Lock, Ruler, RefreshCw, Copy, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { charSets, getSecureRandom, secureShuffle } from './utils/utils';

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
        flex items-center p-4 rounded-xl transition-all duration-200 cursor-pointer group
        ${checked 
          ? 'bg-orange-50 border-2 border-orange-200 shadow-sm' 
          : 'bg-white border-2 border-gray-100 hover:border-orange-200 hover:bg-orange-25'
        }
      `}
      onClick={() => onChange(!checked)}
    >
      <div 
        className={`
          flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center mr-4 transition-all duration-200
          ${checked 
            ? 'bg-orange-500 text-white shadow-md' 
            : 'bg-gray-100 text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-500'
          }
        `}
      >
        {icon}
      </div>
      <div className="flex-grow">
        <div className="flex items-center mb-1">
          <label className="text-sm font-semibold text-gray-800 cursor-pointer">{label}</label>
          {recommended && (
            <Badge variant="warning" size="sm" className="ml-3">
              Recommended
            </Badge>
          )}
        </div>
        <div className="text-xs text-gray-600">{sublabel}</div>
      </div>
      <button
        className={`
          relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
          ${checked ? 'bg-orange-500' : 'bg-gray-300'}
        `}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
      >
        <span
          className={`
            inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 shadow-sm
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
};

const PasswordDisplay: React.FC<{
  password: string;
  onCopy: () => void;
  copied: boolean;
}> = ({ password, onCopy, copied }) => {
  const [hidden, setHidden] = useState(false);

  const toggleVisibility = () => {
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
    <Card className="border-orange-200 bg-gradient-to-br from-orange-25 to-amber-25 overflow-hidden">
      <div className="bg-orange-100 px-6 py-4 border-b border-orange-200 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-orange-900">Generated Password</h3>
        <button
          onClick={toggleVisibility}
          className="p-2 text-orange-600 hover:text-orange-800 transition-colors rounded-lg hover:bg-orange-200"
          title={hidden ? "Show password" : "Hide password"}
        >
          {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>
      
      <div className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex-grow font-mono text-lg bg-white p-4 rounded-xl overflow-x-auto border-2 border-orange-100 shadow-inner">
            {hidden ? (
              <div className="flex space-x-1">
                {Array.from({ length: password.length }).map((_, index) => (
                  <span key={index} className="w-2 h-5 bg-orange-300 rounded-full"></span>
                ))}
              </div>
            ) : (
              password.split('').map((char, index) => (
                <span 
                  key={index}
                  className={
                    char.match(/[A-Z]/) ? 'text-orange-600 font-bold' :
                    char.match(/[a-z]/) ? 'text-gray-900' :
                    char.match(/[0-9]/) ? 'text-green-600 font-semibold' :
                    'text-purple-600 font-bold'
                  }
                >
                  {char}
                </span>
              ))
            )}
          </div>
          
          <Button
            onClick={onCopy}
            variant={copied ? "success" : "secondary"}
            size="lg"
            leftIcon={copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            className={copied ? "bg-green-100 border-green-300 text-green-700 hover:bg-green-200" : ""}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        
        <div className="mt-4 flex gap-2 flex-wrap">
          {counts.uppercase > 0 && (
            <Badge variant="warning" size="md">
              {counts.uppercase} uppercase
            </Badge>
          )}
          {counts.lowercase > 0 && (
            <Badge variant="default" size="md">
              {counts.lowercase} lowercase
            </Badge>
          )}
          {counts.numbers > 0 && (
            <Badge variant="success" size="md">
              {counts.numbers} numbers
            </Badge>
          )}
          {counts.special > 0 && (
            <Badge variant="info" size="md">
              {counts.special} special
            </Badge>
          )}
        </div>
      </div>
    </Card>
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
    generatePassword();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSecurityLevel = (length: number): string => {
    if (length < 12) return 'Weak';
    if (length < 16) return 'Basic';
    if (length < 24) return 'Strong';
    if (length < 32) return 'Very Strong';
    return 'Maximum';
  };

  const getSecurityColor = (level: string): string => {
    switch (level) {
      case 'Weak': return 'bg-red-500';
      case 'Basic': return 'bg-amber-500';
      case 'Strong': return 'bg-orange-500';
      case 'Very Strong': return 'bg-green-500';
      case 'Maximum': return 'bg-green-600';
      default: return 'bg-orange-500';
    }
  };

  const currentValue = length[0];
  const securityLevel = getSecurityLevel(currentValue);
  const securityColor = getSecurityColor(securityLevel);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4 md:p-8">
      <div className="mx-auto">
        <div className="space-y-8">

          {/* Length Configuration */}
          <Card className="p-6 border-orange-100 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg mr-3">
                  <Ruler className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Password Length</h3>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${securityColor}`}></div>
                <Badge variant="warning" size="md">
                  {currentValue} characters
                </Badge>
              </div>
            </div>
            
            <Slider
              value={length}
              onValueChange={setLength}
              min={8}
              max={64}
              step={1}
              variant="orange"
              showTooltip={true}
              showLabels={true}
              className="mb-4"
            />
            
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center text-gray-600">
                <div className="w-2 h-2 rounded-full bg-red-400 mr-2"></div>
                <span>Weak</span>
              </div>
              <Badge variant={securityLevel === 'Weak' ? 'danger' : securityLevel === 'Basic' ? 'warning' : 'success'} size="sm">
                {securityLevel}
              </Badge>
              <div className="flex items-center text-gray-600">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span>Strong</span>
              </div>
            </div>


            <div className="flex items-center mb-6 mt-4">
              <div className="p-2 bg-orange-100 rounded-lg mr-3">
                <Lock className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Character Types</h3>
            </div>
            
            <div className="space-y-4">
              <CharacterTypeOption
                label="Uppercase Letters" 
                sublabel="A-Z (26 characters)" 
                checked={includeUppercase} 
                onChange={setIncludeUppercase}
                icon={<span className="text-base font-bold">A</span>}
                recommended={true}
              />
              
              <CharacterTypeOption
                label="Lowercase Letters" 
                sublabel="a-z (26 characters)" 
                checked={includeLowercase} 
                onChange={setIncludeLowercase}
                icon={<span className="text-base font-bold">a</span>}
                recommended={true}
              />
              
              <CharacterTypeOption
                label="Numbers" 
                sublabel="0-9 (10 characters)" 
                checked={includeNumbers} 
                onChange={setIncludeNumbers}
                icon={<span className="text-base font-bold">1</span>}
                recommended={true}
              />
              
              <CharacterTypeOption
                label="Special Characters" 
                sublabel="!@#$%^&* and more (24 characters)" 
                checked={includeSpecial} 
                onChange={setIncludeSpecial}
                icon={<span className="text-base font-bold">@</span>}
                recommended={true}
              />
            </div>
          </Card>

          <Button
            onClick={generatePassword}
            leftIcon={<RefreshCw className="w-5 h-5" />}
            size="lg"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Generate Secure Password
          </Button>

                    {/* Password Display */}
          {password && !password.includes('Please select') && (
            <PasswordDisplay
              password={password}
              onCopy={copyToClipboard}
              copied={copied}
            />
          )}

          {/* Security Notice */}
          <Card className="p-4 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-800">
                <p className="font-medium mb-1">Secure Generation</p>
                <p>All passwords are generated using cryptographically secure random numbers in your browser. No data is sent to any server.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SecurePasswordGenerator;