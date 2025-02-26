import React, { useState, useEffect } from 'react';
import { Sun, Moon, Copy, Check, AlertCircle, Award, Info, Hash, Clock, Zap } from 'lucide-react';
import { NumberType, Results, ThemeOptions } from '../../types/NumberConverterTypes';

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
      icon: <span className="text-green-500">01</span>,
      color: 'from-green-500 to-emerald-600'
    },
    { 
      value: 'decimal', 
      label: 'Decimal', 
      base: 10, 
      regex: /^[0-9]+$/, 
      icon: <Hash size={16} className="text-blue-500" />,
      color: 'from-blue-500 to-indigo-600'
    },
    { 
      value: 'hexadecimal', 
      label: 'Hexadecimal', 
      base: 16, 
      regex: /^[0-9A-Fa-f]+$/, 
      icon: <span className="text-purple-500">0x</span>,
      color: 'from-purple-500 to-pink-600'
    },
    { 
      value: 'octal', 
      label: 'Octal', 
      base: 8, 
      regex: /^[0-7]+$/, 
      icon: <span className="text-amber-500">0o</span>,
      color: 'from-amber-500 to-orange-600'
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
    } catch (err) {
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
      background: 'bg-gray-900',
      card: 'bg-gray-800',
      text: 'text-white',
      input: 'bg-gray-700 text-white border-gray-600',
      button: 'bg-blue-600 hover:bg-blue-700',
      select: 'bg-gray-700 text-white border-gray-600',
      resultCard: 'bg-gray-700',
      badge: 'bg-gray-700'
    },
    light: {
      background: 'bg-gray-100',
      card: 'bg-white',
      text: 'text-gray-800',
      input: 'bg-gray-50 text-gray-800 border-gray-300',
      button: 'bg-blue-500 hover:bg-blue-600',
      select: 'bg-gray-50 text-gray-800 border-gray-300',
      resultCard: 'bg-gray-50',
      badge: 'bg-gray-200'
    }
  };

  const currentTheme = themeStyles[theme];

  return (
    <div className={`min-h-screen ${currentTheme.background} ${currentTheme.text} p-4 transition-colors duration-300`}>
      <div className={`max-w-5xl mx-auto ${currentTheme.card} rounded-xl shadow-xl overflow-hidden`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Number System Converter
              </h1>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded-full bg-white/20 text-white text-xs flex items-center gap-1">
                  <Zap size={12} />
                  Fast Conversion
                </span>
                <span className="px-2 py-1 rounded-full bg-white/20 text-white text-xs flex items-center gap-1">
                  <Award size={12} />
                  Multi-Base
                </span>
              </div>
            </div>
            <button 
              onClick={toggleTheme}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} className="text-yellow-300" /> : <Moon size={20} className="text-indigo-300" />}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 flex">
          <button 
            className={`px-6 py-4 font-medium flex items-center gap-2 transition-all ${activeTab === 'converter' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveTab('converter')}
          >
            <Hash size={18} />
            Converter
          </button>
          <button 
            className={`px-6 py-4 font-medium flex items-center gap-2 transition-all ${activeTab === 'info' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveTab('info')}
          >
            <Info size={18} />
            Number Systems
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {activeTab === 'converter' ? (
            <>
              {/* Input Section */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block mb-2 text-sm font-medium">Number Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {numberTypes.map(type => (
                        <button
                          key={type.value}
                          onClick={() => setInputType(type.value)}
                          className={`p-3 rounded-lg border ${inputType === type.value 
                            ? `bg-gradient-to-r ${type.color} text-white border-transparent` 
                            : `${currentTheme.badge} border-gray-600 hover:border-gray-500`} 
                            transition-all flex items-center gap-2`}
                        >
                          <span className="p-1 rounded-md bg-white/20 flex items-center justify-center">
                            {type.icon}
                          </span>
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium">Enter {numberTypes.find(t => t.value === inputType)?.label} Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={`Type your number here...`}
                        className={`w-full p-4 pl-10 rounded-lg ${currentTheme.input} focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200`}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        {numberTypes.find(t => t.value === inputType)?.icon}
                      </div>
                    </div>

                    {error && (
                      <div className="mt-2 p-3 text-red-500 rounded-lg bg-red-900/30 flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Results Section */}
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Award size={20} className="text-blue-500" />
                  Conversion Results
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {numberTypes.map(type => {
                    const isCurrentType = inputType === type.value;
                    return (
                      <div 
                        key={type.value}
                        className={`p-4 rounded-lg ${
                          isCurrentType 
                            ? `bg-gradient-to-r ${type.color} text-white` 
                            : currentTheme.resultCard
                        } shadow transition-all duration-200 hover:shadow-lg`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`p-1 rounded-full ${isCurrentType ? 'bg-white/20' : 'bg-gray-600'}`}>
                              {type.icon}
                            </span>
                            <span className="font-medium">{type.label}</span>
                          </div>
                          {results[type.value as keyof Results] && (
                            <button
                              onClick={() => handleCopy(results[type.value as keyof Results], type.value)}
                              className={`flex items-center gap-1 ${
                                isCurrentType 
                                  ? 'text-white/80 hover:text-white' 
                                  : 'text-blue-500 hover:text-blue-400'
                              } transition-colors`}
                            >
                              {copied === type.value ? (
                                <>
                                  <Check size={14} />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={14} />
                                  Copy
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <div className={`font-mono text-lg p-2 rounded ${
                          isCurrentType ? 'bg-black/20' : theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                        } overflow-x-auto whitespace-nowrap`}>
                          {results[type.value as keyof Results] || '-'}
                        </div>
                        {type.value === 'binary' && (
                          <div className="mt-1 text-xs opacity-70">
                            {results.binary ? `${results.binary.length} bits` : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Visualization */}
              {inputValue && !error && results.binary && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Zap size={20} className="text-yellow-500" />
                    Binary Visualization
                  </h2>
                  <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {results.binary.split('').map((bit, index) => (
                        <div
                          key={index}
                          className={`
                            w-10 h-10 flex items-center justify-center rounded-lg shadow-lg
                            ${bit === '1' 
                              ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white transform hover:scale-110' 
                              : 'bg-gray-800 border border-gray-700 text-gray-400'}
                            font-mono text-lg transition-all duration-300
                          `}
                          title={`Bit position: ${results.binary.length - index - 1}`}
                        >
                          {bit}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-center text-xs text-gray-400">
                      Hover over each bit to see its position
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Info Tab Content */
            <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Info size={20} className="text-blue-500" />
                Understanding Number Systems
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {numberTypes.map(type => (
                  <div key={type.value} className={`p-5 rounded-lg border border-gray-700 hover:border-${type.color.split(' ')[0]} transition-all`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${type.color} text-white`}>
                        {type.icon}
                      </div>
                      <h3 className="font-medium text-lg">{type.label} (Base {type.base})</h3>
                    </div>
                    
                    <p className="text-sm opacity-80 mb-3">
                      {type.value === 'binary' && 'Uses only 0 and 1. The foundation of all computing systems.'}
                      {type.value === 'decimal' && 'Our standard numbering system, using digits 0-9.'}
                      {type.value === 'hexadecimal' && 'Uses digits 0-9 and letters A-F. Common in programming and color codes.'}
                      {type.value === 'octal' && 'Uses digits 0-7. Historically used in computing for file permissions.'}
                    </p>
                    
                    <div className="text-xs font-medium flex flex-wrap gap-2">
                      {type.value === 'binary' && (
                        <>
                          <span className="px-2 py-1 rounded-full bg-green-900/30 text-green-500">Computer Circuits</span>
                          <span className="px-2 py-1 rounded-full bg-blue-900/30 text-blue-500">Digital Logic</span>
                        </>
                      )}
                      {type.value === 'decimal' && (
                        <>
                          <span className="px-2 py-1 rounded-full bg-blue-900/30 text-blue-500">Daily Use</span>
                          <span className="px-2 py-1 rounded-full bg-purple-900/30 text-purple-500">Mathematics</span>
                        </>
                      )}
                      {type.value === 'hexadecimal' && (
                        <>
                          <span className="px-2 py-1 rounded-full bg-purple-900/30 text-purple-500">Memory Addresses</span>
                          <span className="px-2 py-1 rounded-full bg-pink-900/30 text-pink-500">Color Codes</span>
                        </>
                      )}
                      {type.value === 'octal' && (
                        <>
                          <span className="px-2 py-1 rounded-full bg-amber-900/30 text-amber-500">UNIX Permissions</span>
                          <span className="px-2 py-1 rounded-full bg-orange-900/30 text-orange-500">Legacy Systems</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-4 rounded-lg bg-blue-900/20 border border-blue-800/30 flex items-start gap-4">
                <div className="mt-1">
                  <Clock size={24} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-400 mb-2">Historical Context</h3>
                  <p className="text-sm opacity-80">
                    Different number systems evolved based on practical needs. While decimal became our standard counting system (likely due to our ten fingers), 
                    binary emerged as the foundation for computing because electronic circuits have two states: on and off. 
                    Hexadecimal and octal developed as more human-readable representations of binary data, making it easier for programmers to work with low-level computing concepts.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
          
        {/* Footer */}
        <div className="border-t border-gray-700 p-4 text-center text-sm opacity-60 flex justify-center items-center gap-2">
          <div>Number System Converter</div>
          <div className="w-1 h-1 rounded-full bg-gray-500"></div>
          <div>Made with precision</div>
        </div>
      </div>
    </div>
  );
};

export default NumberConverter;