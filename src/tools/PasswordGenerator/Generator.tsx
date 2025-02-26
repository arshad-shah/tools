import { useEffect, useState } from 'react';
import { Slider } from '../../components/Slider';
import { Button } from '../../components/Button';
import { Switch } from '../../components/Switch';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { Copy, RefreshCw, Shield, Key } from 'lucide-react';
import { charSets, getSecureRandom, secureShuffle } from './utils/utils';
import PasswordDisplay from './PasswordDisplay';
import PasswordProperties from './PasswordProperties';
import CrackTimeDisplay from './CrackTimeDisplay';
import SecurityInfo from './SecurityInfo';
import { calculateMetrics, getStrengthColor, getStrengthDescription } from './utils/passwordMetrics';
import { PasswordMetrics } from '../../types/PasswordGeneratorTypes';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Shield className="w-12 h-12 text-blue-600 animate-spin" />
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="w-full mx-auto">
        <div className="flex items-center justify-center mb-8">
          <Shield className="w-12 h-12 text-blue-600 mr-4" />
          <h1 className="text-4xl font-bold text-gray-900">Secure Password Generator</h1>
        </div>

        <div className="max-w-full">
          <Card className="bg-white shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <Key className="w-6 h-6 mr-2 text-blue-600" />
                Generator Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-gray-600">Password Length: {length[0]}</label>
                    <Slider
                      value={length}
                      onValueChange={setLength}
                      min={8}
                      max={64}
                      step={1}
                      className="mt-2"
                      variant='violet'
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600">Uppercase Letters</label>
                      <Switch checked={includeUppercase} onCheckedChange={setIncludeUppercase} />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600">Lowercase Letters</label>
                      <Switch checked={includeLowercase} onCheckedChange={setIncludeLowercase} />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600">Numbers</label>
                      <Switch checked={includeNumbers} onCheckedChange={setIncludeNumbers} />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600">Special Characters</label>
                      <Switch checked={includeSpecial} onCheckedChange={setIncludeSpecial} />
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button 
                      onClick={generatePassword}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Generate
                    </Button>
                    
                    <Button
                      onClick={copyToClipboard}
                      disabled={!password}
                      variant="outline"
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>

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
                    <div className="space-y-6">
                      <div className="relative w-full">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">Password Strength</span>
                          <span className="text-gray-600">{Math.round(metrics.strength * 100)}%</span>
                        </div>
                        <div className="relative w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`absolute left-0 top-0 h-2 rounded-full transition-all duration-300 ${getStrengthColor(metrics.strength)}`}
                            style={{ width: `${Math.min(metrics.strength * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
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
    </div>
  );
}

export default SecurePasswordGenerator;