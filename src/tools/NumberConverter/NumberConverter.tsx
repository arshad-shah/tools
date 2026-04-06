import React, { useState, useEffect } from 'react';
import { Sun, Moon, Copy, Check, AlertCircle, Award, Info, Hash } from 'lucide-react';

// TypeScript interfaces
interface NumberType {
  value: string;
  label: string;
  base: number;
  regex: RegExp;
  icon: React.ReactNode;
  color: string;
}

interface Results {
  binary: string;
  decimal: string;
  hexadecimal: string;
  octal: string;
}

interface ThemeStyles {
  background: string;
  card: string;
  text: string;
  input: string;
  button: string;
  select: string;
  resultCard: string;
  badge: string;
  accent: string;
  accentBg: string;
  muted: string;
}

interface ThemeOptions {
  dark: ThemeStyles;
  light: ThemeStyles;
}

const NumberConverter: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('');
  const [inputType, setInputType] = useState<string>('decimal');
  const [results, setResults] = useState<Results>({
    binary: '',
    decimal: '',
    hexadecimal: '',
    octal: ''
  });
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<string>('converter');

  const numberTypes: NumberType[] = [
    { 
      value: 'binary', 
      label: 'Binary', 
      base: 2, 
      regex: /^[01]+$/, 
      icon: <span className="text-amber-600 dark:text-amber-500 group-[.active]:text-white">01</span>,
      color: 'bg-amber-600 dark:bg-amber-500'
    },
    { 
      value: 'decimal', 
      label: 'Decimal', 
      base: 10, 
      regex: /^[0-9]+$/, 
      icon: <Hash size={16} className="text-amber-600 dark:text-amber-500 group-[.active]:text-white" />,
      color: 'bg-amber-600 dark:bg-amber-500'
    },
    { 
      value: 'hexadecimal', 
      label: 'Hexadecimal', 
      base: 16, 
      regex: /^[0-9A-Fa-f]+$/, 
      icon: <span className="text-amber-600 dark:text-amber-500 group-[.active]:text-white">0x</span>,
      color: 'bg-amber-600 dark:bg-amber-500'
    },
    { 
      value: 'octal', 
      label: 'Octal', 
      base: 8, 
      regex: /^[0-7]+$/, 
      icon: <span className="text-amber-600 dark:text-amber-500 group-[.active]:text-white">0o</span>,
      color: 'bg-amber-600 dark:bg-amber-500'
    }
  ];

  useEffect(() => {
    if (!inputValue) {
      setResults({
        binary: '',
        decimal: '',
        hexadecimal: '',
        octal: ''
      });
      setError('');
      return;
    }

    const selectedType = numberTypes.find(type => type.value === inputType);
    
    if (!selectedType || !selectedType.regex.test(inputValue)) {
      setError(`Invalid ${selectedType?.label || inputType} format`);
      return;
    }

    try {
      // Convert to decimal first
      const decimal = parseInt(inputValue, selectedType.base);
      
      if (isNaN(decimal)) {
        setError('Invalid number');
        return;
      }

      setResults({
        binary: decimal.toString(2),
        decimal: decimal.toString(10),
        hexadecimal: decimal.toString(16).toUpperCase(),
        octal: decimal.toString(8)
      });
      
      setError('');
    } catch {
      setError('Conversion error');
    }
  }, [inputValue, inputType]);

  const handleCopy = (value: string, type: string): void => {
    navigator.clipboard.writeText(value);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  const toggleTheme = (): void => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Dynamic styles based on theme
  const themeStyles: ThemeOptions = {
    dark: {
      background: 'bg-gray-950',
      card: 'bg-gray-900',
      text: 'text-gray-100',
      input: 'bg-gray-900 text-gray-100 border-gray-800',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
      select: 'bg-gray-900 text-gray-100 border-gray-800',
      resultCard: 'bg-gray-900 border-gray-800',
      badge: 'bg-gray-800 text-gray-300',
      accent: 'text-amber-500',
      accentBg: 'bg-amber-500',
      muted: 'text-gray-400'
    },
    light: {
      background: 'bg-gray-50',
      card: 'bg-white',
      text: 'text-gray-900',
      input: 'bg-white text-gray-900 border-gray-300',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
      select: 'bg-white text-gray-900 border-gray-300',
      resultCard: 'bg-white border-gray-200',
      badge: 'bg-gray-100 text-gray-700',
      accent: 'text-amber-600',
      accentBg: 'bg-amber-600',
      muted: 'text-gray-500'
    }
  };

  const currentTheme = themeStyles[theme];
  const darkMode = theme === 'dark';

  return (
    <div className={`w-full ${currentTheme.background} ${currentTheme.text} min-h-screen transition-colors duration-300 rounded-xl overflow-hidden shadow-xl`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} px-6 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} transition-all`}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-amber-600" />}
          </button>
        </div>
      </div>
      
      {/* Main Container */}
      <div className="px-6 py-6">
        {/* Tab Navigation */}
        <div className={`inline-flex rounded-lg p-1 mb-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
          <button 
            className={`py-2 px-4 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'converter' 
                ? `${currentTheme.accentBg} text-white shadow-md` 
                : `${darkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:text-gray-700 hover:bg-gray-200'}`
            }`}
            onClick={() => setActiveTab('converter')}
          >
            <Hash size={16} />
            Converter
          </button>
          <button 
            className={`py-2 px-4 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'info' 
                ? `${currentTheme.accentBg} text-white shadow-md` 
                : `${darkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:text-gray-700 hover:bg-gray-200'}`
            }`}
            onClick={() => setActiveTab('info')}
          >
            <Info size={16} />
            Number Systems
          </button>
        </div>

        {/* Main Content */}
        {activeTab === 'converter' ? (
          <div className="space-y-8">
            {/* Input Section */}
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-white'} border ${darkMode ? 'border-gray-800' : 'border-gray-200'} shadow-sm`}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className={`inline-block w-2 h-6 rounded-full ${currentTheme.accentBg}`}></span>
                Input Number
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className={`block mb-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Select Number Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {numberTypes.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setInputType(type.value)}
                        className={`p-3 rounded-lg flex items-center gap-2 justify-center transition-all group ${
                          inputType === type.value 
                            ? `${currentTheme.accentBg} text-white shadow-sm active` 
                            : `${darkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'} border`
                        }`}
                      >
                        <span className={`p-1 rounded-md ${
                          inputType === type.value ? 'bg-white/20' : darkMode ? 'bg-gray-700' : 'bg-white'
                        }`}>
                          {type.icon}
                        </span>
                        <span className="font-medium">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className={`block mb-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Enter {numberTypes.find(t => t.value === inputType)?.label} Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={`Type your ${numberTypes.find(t => t.value === inputType)?.label.toLowerCase()} number...`}
                      className={`w-full p-4 pl-12 rounded-lg border ${currentTheme.input} focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all duration-200`}
                    />
                    <div className={`absolute left-4 top-1/2 transform -translate-y-1/2 p-1 rounded-md ${
                      darkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      {numberTypes.find(t => t.value === inputType)?.icon}
                    </div>
                  </div>

                  {error && (
                    <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                      darkMode 
                        ? 'bg-red-900/20 border border-red-800/50 text-red-400' 
                        : 'bg-red-50 border border-red-200 text-red-600'
                    }`}>
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-white'} border ${darkMode ? 'border-gray-800' : 'border-gray-200'} shadow-sm`}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className={`inline-block w-2 h-6 rounded-full ${currentTheme.accentBg}`}></span>
                Conversion Results
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {numberTypes.map(type => {
                  const isCurrentType = inputType === type.value;
                  return (
                    <div 
                      key={type.value}
                      className={`p-4 rounded-lg transition-all group ${
                        isCurrentType 
                          ? `${currentTheme.accentBg} text-white shadow-sm active` 
                          : `${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} border`
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`p-1 rounded-md ${
                            isCurrentType ? 'bg-white/20' : darkMode ? 'bg-gray-700' : 'bg-white'
                          }`}>
                            {type.icon}
                          </span>
                          <span className="font-medium">{type.label}</span>
                        </div>
                        {results[type.value as keyof Results] && (
                          <button
                            onClick={() => handleCopy(results[type.value as keyof Results], type.value)}
                            className={`flex items-center gap-1 text-sm py-1 px-2 rounded-md transition-colors ${
                              isCurrentType 
                                ? 'bg-white/20 hover:bg-white/30' 
                                : darkMode 
                                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                                  : 'bg-white hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            {copied === type.value ? (
                              <>
                                <Check size={14} />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={14} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <div className={`font-mono text-lg p-3 rounded-md overflow-x-auto whitespace-nowrap ${
                        isCurrentType 
                          ? 'bg-amber-700' 
                          : darkMode 
                            ? 'bg-gray-950 text-gray-300' 
                            : 'bg-white text-gray-700 border border-gray-200'
                      }`}>
                        {results[type.value as keyof Results] || '-'}
                      </div>
                      {type.value === 'binary' && results.binary && (
                        <div className="mt-2 text-xs flex items-center gap-1">
                          <span className={`px-2 py-1 rounded-full ${
                            isCurrentType 
                              ? 'bg-white/20' 
                              : darkMode 
                                ? 'bg-gray-700 text-gray-300' 
                                : 'bg-gray-200 text-gray-700'
                          }`}>
                            {results.binary.length} bits
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visualization */}
            {inputValue && !error && results.binary && (
              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-white'} border ${darkMode ? 'border-gray-800' : 'border-gray-200'} shadow-sm`}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className={`inline-block w-2 h-6 rounded-full ${currentTheme.accentBg}`}></span>
                  Binary Visualization
                </h2>
                
                <div className="flex flex-wrap gap-2 justify-center p-4">
                  {results.binary.split('').map((bit, index) => (
                    <div
                      key={index}
                      className={`
                        w-10 h-10 flex items-center justify-center rounded-lg shadow-sm
                        ${bit === '1' 
                          ? `${currentTheme.accentBg} text-white transform hover:scale-110` 
                          : darkMode 
                            ? 'bg-gray-800 border-gray-700 text-gray-400 border' 
                            : 'bg-gray-100 border-gray-300 text-gray-500 border'}
                        font-mono text-lg font-bold transition-all duration-200
                      `}
                      title={`Bit position: ${results.binary.length - index - 1}`}
                    >
                      {bit}
                    </div>
                  ))}
                </div>
                <div className={`mt-4 text-center text-xs ${currentTheme.muted}`}>
                  Each square represents one bit in the binary number
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Info Tab Content */
          <div className="space-y-8">
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-white'} border ${darkMode ? 'border-gray-800' : 'border-gray-200'} shadow-sm`}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className={`inline-block w-2 h-6 rounded-full ${currentTheme.accentBg}`}></span>
                Number Systems Overview
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {numberTypes.map(type => (
                  <div 
                    key={type.value} 
                    className={`p-5 rounded-lg border transition-all ${
                      darkMode 
                        ? 'bg-gray-800/80 border-gray-700 hover:border-amber-500/70' 
                        : 'bg-gray-50 border-gray-200 hover:border-amber-600/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${currentTheme.accentBg} text-white`}>
                        {type.icon}
                      </div>
                      <h3 className={`font-medium text-lg ${currentTheme.text}`}>{type.label} (Base {type.base})</h3>
                    </div>
                    
                    <p className={`text-sm ${currentTheme.muted} mb-4`}>
                      {type.value === 'binary' && 'Uses only 0 and 1. The foundation of all computing systems.'}
                      {type.value === 'decimal' && 'Our standard numbering system, using digits 0-9.'}
                      {type.value === 'hexadecimal' && 'Uses digits 0-9 and letters A-F. Common in programming and color codes.'}
                      {type.value === 'octal' && 'Uses digits 0-7. Historically used in computing for file permissions.'}
                    </p>
                    
                    <div className="text-xs font-medium flex flex-wrap gap-2">
                      {type.value === 'binary' && (
                        <>
                          <span className={`px-2 py-1 rounded-full ${darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'}`}>Computer Circuits</span>
                          <span className={`px-2 py-1 rounded-full ${darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'}`}>Digital Logic</span>
                        </>
                      )}
                      {type.value === 'decimal' && (
                        <>
                          <span className={`px-2 py-1 rounded-full ${darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'}`}>Daily Use</span>
                          <span className={`px-2 py-1 rounded-full ${darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'}`}>Mathematics</span>
                        </>
                      )}
                      {type.value === 'hexadecimal' && (
                        <>
                          <span className={`px-2 py-1 rounded-full ${darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'}`}>Memory Addresses</span>
                          <span className={`px-2 py-1 rounded-full ${darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'}`}>Color Codes</span>
                        </>
                      )}
                      {type.value === 'octal' && (
                        <>
                          <span className={`px-2 py-1 rounded-full ${darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'}`}>UNIX Permissions</span>
                          <span className={`px-2 py-1 rounded-full ${darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'}`}>Legacy Systems</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-amber-900/20 border-amber-800/30' : 'bg-amber-50 border-amber-200'} border shadow-sm`}>
              <div className="flex items-start gap-4">
                <div className={`mt-1 p-2 rounded-full ${currentTheme.accentBg} text-white`}>
                  <Award size={18} />
                </div>
                <div>
                  <h3 className={`font-medium ${darkMode ? 'text-amber-400' : 'text-amber-800'} mb-2`}>Why Multiple Number Systems?</h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Different number systems evolved based on practical needs. Binary is fundamental to computing because electronic circuits have two states: on and off. 
                    Hexadecimal and octal developed as more human-readable representations of binary data, making it easier for programmers to work with low-level computing concepts.
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-white'} border ${darkMode ? 'border-gray-800' : 'border-gray-200'} shadow-sm`}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className={`inline-block w-2 h-6 rounded-full ${currentTheme.accentBg}`}></span>
                Number System Conversions
              </h2>
              
              <table className={`w-full border-collapse ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <thead>
                  <tr className={darkMode ? 'border-gray-800' : 'border-gray-200'}>
                    <th className="text-left py-2 px-3 border-b">Decimal</th>
                    <th className="text-left py-2 px-3 border-b">Binary</th>
                    <th className="text-left py-2 px-3 border-b">Octal</th>
                    <th className="text-left py-2 px-3 border-b">Hexadecimal</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 5, 10, 15, 16, 31, 64, 128, 255].map(num => (
                    <tr key={num} className={`${darkMode ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'} border-b`}>
                      <td className="py-2 px-3">{num}</td>
                      <td className="py-2 px-3 font-mono">{num.toString(2)}</td>
                      <td className="py-2 px-3 font-mono">{num.toString(8)}</td>
                      <td className="py-2 px-3 font-mono">{num.toString(16).toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} px-6 py-3 border-t text-center text-xs ${currentTheme.muted}`}>
        <p>Convert between Binary, Decimal, Hexadecimal and Octal number systems</p>
      </div>
    </div>
  );
};

export default NumberConverter;