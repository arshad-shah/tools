import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Copy, 
  Check, 
  AlertCircle, 
  BookOpen, 
  ChevronDown,
  Zap,
  Code2,
  Info,
  X,
  BarChart3,
  Settings,
  PlayCircle
} from 'lucide-react';

// Types
interface RegexTemplate {
  name: string;
  pattern: string;
  description: string;
  category: 'web' | 'validation' | 'format' | 'common';
}

interface Match {
  text: string;
  index: number;
  length: number;
  groups: string[] | null;
  namedGroups: Record<string, string> | null;
}

interface Flags {
  global: boolean;        // g - Global matching
  ignoreCase: boolean;    // i - Case insensitive
  multiline: boolean;     // m - Multiline mode
  dotAll: boolean;        // s - Dot matches newlines  
  unicode: boolean;       // u - Unicode mode
  sticky: boolean;        // y - Sticky matching
  hasIndices: boolean;    // d - Generate indices for matches
}

// UI Components (simplified inline versions)
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
    {children}
  </div>
);

const Button: React.FC<{ 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  title?: string;
}> = ({ children, onClick, variant = 'primary', size = 'md', disabled = false, className = "", title }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500",
    secondary: "bg-teal-100 text-teal-900 hover:bg-teal-200 focus:ring-teal-500",
    outline: "border border-teal-300 bg-white text-teal-700 hover:bg-teal-50 focus:ring-teal-500",
    ghost: "text-teal-700 hover:bg-teal-100 focus:ring-teal-500"
  };
  
  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4",
    lg: "h-12 px-6 text-lg"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input: React.FC<{ 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  placeholder?: string; 
  className?: string;
}> = ({ value, onChange, placeholder, className = "" }) => (
  <input
    type="text"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${className}`}
  />
);

const Textarea: React.FC<{ 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; 
  placeholder?: string; 
  rows?: number;
  className?: string;
}> = ({ value, onChange, placeholder, rows = 4, className = "" }) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 resize-vertical ${className}`}
  />
);

const Badge: React.FC<{ 
  children: React.ReactNode; 
  variant?: 'default' | 'secondary' | 'danger';
  className?: string;
}> = ({ children, variant = 'default', className = "" }) => {
  const variants = {
    default: "bg-teal-600 text-white",
    secondary: "bg-teal-100 text-teal-800",
    danger: "bg-red-600 text-white"
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Alert: React.FC<{ 
  children: React.ReactNode; 
  variant?: 'error' | 'warning' | 'info';
  className?: string;
}> = ({ children, variant = 'info', className = "" }) => {
  const variants = {
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800"
  };
  
  return (
    <div className={`flex items-center p-3 border rounded-md ${variants[variant]} ${className}`}>
      <AlertCircle size={16} className="mr-2 flex-shrink-0" />
      <div className="text-sm">{children}</div>
    </div>
  );
};

// Template Dropdown Component
const TemplateDropdown: React.FC<{
  templates: RegexTemplate[];
  selectedTemplate: string;
  onSelect: (template: RegexTemplate) => void;
}> = ({ templates, selectedTemplate, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const categorizedTemplates = useMemo(() => {
    const categories: Record<string, RegexTemplate[]> = {
      web: [],
      validation: [],
      format: [],
      common: []
    };
    
    templates.forEach(template => {
      categories[template.category].push(template);
    });
    
    return categories;
  }, [templates]);
  
  const categoryLabels = {
    web: 'Web & URLs',
    validation: 'Validation',
    format: 'Formats',
    common: 'Common Patterns'
  };
  
  return (
    <div className="relative">
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <span className="truncate">{selectedTemplate || 'Select a template...'}</span>
        <ChevronDown size={16} className={`ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-teal-200 rounded-md shadow-lg max-h-96 overflow-auto">
            {Object.entries(categorizedTemplates).map(([category, templateList]) => (
              templateList.length > 0 && (
                <div key={category}>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200 uppercase tracking-wide">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </div>
                  {templateList.map((template) => (
                    <button
                      key={template.name}
                      onClick={() => {
                        onSelect(template);
                        setIsOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-teal-50 focus:bg-teal-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{template.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{template.description}</div>
                    </button>
                  ))}
                </div>
              )
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Flag Toggle Component
const FlagToggle: React.FC<{
  flag: string;
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}> = ({ flag, label, description, active, onToggle }) => (
  <div className="group relative">
    <Button
      variant={active ? 'primary' : 'outline'}
      onClick={onToggle}
      size="sm"
      className="font-mono"
      title={`${label}: ${description}`}
    >
      {flag}
    </Button>
  </div>
);

// Match Item Component
const MatchItem: React.FC<{
  match: Match;
  index: number;
  onCopy: () => void;
}> = ({ match, index, onCopy }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="border border-teal-200 rounded-lg p-3 hover:border-teal-300 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Badge variant="default">#{index + 1}</Badge>
          <Badge variant="secondary">
            {match.index}-{match.index + match.length}
          </Badge>
          {match.length === 0 && (
            <Badge variant="secondary">Empty</Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            title="Copy match"
          >
            <Copy size={14} />
          </Button>
          {(match.groups?.length || Object.keys(match.namedGroups || {}).length) > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Collapse details" : "Show details"}
            >
              {isExpanded ? <X size={14} /> : <Info size={14} />}
            </Button>
          )}
        </div>
      </div>
      
      <div className="font-mono text-sm bg-teal-50 p-2 rounded border border-teal-200 break-all">
        {match.text || <span className="text-gray-500 italic">(empty match)</span>}
      </div>
      
      {isExpanded && (match.groups?.length || Object.keys(match.namedGroups || {}).length) > 0 && (
        <div className="mt-3 pt-3 border-t border-teal-200 space-y-2">
          {match.groups && match.groups.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">Capture Groups</div>
              <div className="space-y-1">
                {match.groups.map((group, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Group {i + 1}:</span>
                    <span className="font-mono bg-white px-2 py-1 rounded border border-teal-300">
                      {group || <span className="text-gray-400">(empty)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {match.namedGroups && Object.keys(match.namedGroups).length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">Named Groups</div>
              <div className="space-y-1">
                {Object.entries(match.namedGroups).map(([name, value]) => (
                  <div key={name} className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">{name}:</span>
                    <span className="font-mono bg-white px-2 py-1 rounded border border-teal-300">
                      {value || <span className="text-gray-400">(empty)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main Regex Tester Component
const RegexTester: React.FC = () => {
  const [pattern, setPattern] = useState<string>('');
  const [testString, setTestString] = useState<string>('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isValid, setIsValid] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [flags, setFlags] = useState<Flags>({ 
    global: true, 
    ignoreCase: false, 
    multiline: false,
    dotAll: false,
    unicode: false,
    sticky: false,
    hasIndices: false
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Templates
  const templates: RegexTemplate[] = useMemo(() => [
    { 
      name: 'Email Address', 
      pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', 
      description: 'Standard email address format',
      category: 'web'
    },
    { 
      name: 'HTTP/HTTPS URL', 
      pattern: 'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)', 
      description: 'Web URLs with HTTP or HTTPS protocol',
      category: 'web'
    },
    { 
      name: 'Phone Number (International)', 
      pattern: '\\+?[1-9]\\d{1,14}', 
      description: 'International phone number format (E.164)',
      category: 'common'
    },
    { 
      name: 'Date (ISO 8601)', 
      pattern: '\\d{4}-\\d{2}-\\d{2}',
      description: 'ISO date format (YYYY-MM-DD)',
      category: 'format'
    },
    { 
      name: 'Time (24-hour)', 
      pattern: '([01]?[0-9]|2[0-3]):[0-5][0-9]',
      description: '24-hour time format (HH:MM)',
      category: 'format'
    },
    { 
      name: 'IPv4 Address', 
      pattern: '(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)',
      description: 'IPv4 network address',
      category: 'web'
    },
    { 
      name: 'Strong Password', 
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
      description: 'Password with mixed case, numbers, and special chars (8+ chars)',
      category: 'validation'
    },
    { 
      name: 'Credit Card Number', 
      pattern: '^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})$',
      description: 'Major credit card number formats',
      category: 'validation'
    },
    { 
      name: 'Hex Color Code', 
      pattern: '#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})',
      description: 'Hexadecimal color codes (#RGB or #RRGGBB)',
      category: 'format'
    },
    { 
      name: 'UUID', 
      pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
      description: 'Universally Unique Identifier format',
      category: 'format'
    }
  ], []);

  // Process regex matches
  useEffect(() => {
    if (pattern === '') {
      setMatches([]);
      setIsValid(true);
      setErrorMessage('');
      return;
    }

    try {
      const flagsStr = 
        (flags.global ? 'g' : '') + 
        (flags.ignoreCase ? 'i' : '') + 
        (flags.multiline ? 'm' : '') +
        (flags.dotAll ? 's' : '') +
        (flags.unicode ? 'u' : '') +
        (flags.sticky ? 'y' : '') +
        (flags.hasIndices ? 'd' : '');
      
      const regex = new RegExp(pattern, flagsStr);
      setIsValid(true);
      setErrorMessage('');
      
      if (testString) {
        const allMatches: Match[] = [];
        
        if (flags.global) {
          let match: RegExpExecArray | null;
          regex.lastIndex = 0;
          
          while ((match = regex.exec(testString)) !== null) {
            const groups = match.slice(1);
            
            allMatches.push({
              text: match[0],
              index: match.index,
              length: match[0].length,
              groups: groups.length > 0 ? groups : null,
              namedGroups: match.groups || null
            });
            
            // Prevent infinite loops
            if (match.index === regex.lastIndex) {
              regex.lastIndex++;
            }
            
            // Safety limit
            if (allMatches.length >= 1000) break;
          }
        } else {
          const match = regex.exec(testString);
          if (match) {
            const groups = match.slice(1);
            
            allMatches.push({
              text: match[0],
              index: match.index,
              length: match[0].length,
              groups: groups.length > 0 ? groups : null,
              namedGroups: match.groups || null
            });
          }
        }
        
        setMatches(allMatches);
      } else {
        setMatches([]);
      }
    } catch (error) {
      setIsValid(false);
      setMatches([]);
      setErrorMessage(error instanceof Error ? error.message : 'Invalid regular expression');
    }
  }, [pattern, testString, flags]);

  // Handle template selection
  const handleTemplateSelect = useCallback((template: RegexTemplate) => {
    setPattern(template.pattern);
    setSelectedTemplate(template.name);
  }, []);

  // Toggle flag
  const toggleFlag = useCallback((flagName: keyof Flags) => {
    setFlags(prev => ({
      ...prev,
      [flagName]: !prev[flagName]
    }));
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // Copy regex pattern
  const copyPattern = useCallback(() => {
    const flagsStr = 
      (flags.global ? 'g' : '') + 
      (flags.ignoreCase ? 'i' : '') + 
      (flags.multiline ? 'm' : '') +
      (flags.dotAll ? 's' : '') +
      (flags.unicode ? 'u' : '') +
      (flags.sticky ? 'y' : '') +
      (flags.hasIndices ? 'd' : '');
    copyToClipboard(`/${pattern}/${flagsStr}`);
  }, [pattern, flags, copyToClipboard]);

  // Generate sample text
  const generateSample = useCallback(() => {
    let sample = '';
    const templateName = selectedTemplate.toLowerCase();
    
    if (templateName.includes('email')) {
      sample = 'Contact us at info@example.com or support@company.org\nJohn Doe: john.doe123@gmail.com\nInvalid: not-an-email@';
    } else if (templateName.includes('url') || templateName.includes('http')) {
      sample = 'Visit https://www.example.com or http://test.org\nAlso check https://sub.domain.co.uk/path?param=value\nInvalid: not-a-url';
    } else if (templateName.includes('phone')) {
      sample = '+1234567890\n+44123456789\n555-0123\nInvalid: abc123';
    } else if (templateName.includes('date')) {
      sample = 'Meeting: 2023-05-15\nDeadline: 2024-01-31\nInvalid: 2023/05/15';
    } else if (templateName.includes('time')) {
      sample = 'Meeting at 09:30\nLunch break: 12:45\nInvalid: 25:61';
    } else if (templateName.includes('ipv4')) {
      sample = '192.168.1.1\n10.0.0.1\n203.0.113.42\nInvalid: 256.1.1.1';
    } else if (templateName.includes('password')) {
      sample = 'Weak: password123\nStrong: P@ssw0rd!2023\nVery weak: 123';
    } else if (templateName.includes('hex')) {
      sample = '#FF5733\n#abc\n#123456\nInvalid: #zz5533';
    } else {
      sample = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.\nSample text with numbers: 123, 456\nSpecial chars: @#$%&*\nEmail: user@example.com\nPhone: +1234567890\nDate: 2023-05-15\nURL: https://example.com';
    }
    
    setTestString(sample);
  }, [selectedTemplate]);

  // Render highlighted text
  const renderHighlightedText = useCallback(() => {
    if (!testString || matches.length === 0) return testString;
    
    let lastIndex = 0;
    const elements: React.ReactNode[] = [];
    
    matches.forEach((match, i) => {
      if (match.index > lastIndex) {
        elements.push(
          <span key={`text-${i}`}>
            {testString.substring(lastIndex, match.index)}
          </span>
        );
      }
      
      elements.push(
        <span 
          key={`match-${i}`} 
          className="bg-teal-200 text-teal-900 px-1 rounded border border-teal-400 cursor-default"
          title={`Match #${i + 1}: "${match.text}" at position ${match.index}`}
        >
          {testString.substring(match.index, match.index + match.length)}
        </span>
      );
      
      lastIndex = match.index + match.length;
    });
    
    if (lastIndex < testString.length) {
      elements.push(
        <span key="text-last">
          {testString.substring(lastIndex)}
        </span>
      );
    }
    
    return <>{elements}</>;
  }, [testString, matches]);

  // Calculate coverage percentage
  const coveragePercentage = useMemo(() => {
    if (!testString || matches.length === 0) return 0;
    const totalMatchedChars = matches.reduce((sum, match) => sum + match.length, 0);
    return Math.round((totalMatchedChars / testString.length) * 100);
  }, [testString, matches]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Input and Configuration */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Pattern Input Section */}
            <Card className="border-teal-200">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <Code2 className="text-teal-600 mr-2" size={20} />
                  <h2 className="text-xl font-semibold text-gray-900">Regular Expression</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pattern
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-mono text-teal-600 flex-shrink-0">/</span>
                      <div className="flex-1">
                        <Input
                          value={pattern}
                          onChange={(e) => setPattern(e.target.value)}
                          placeholder="Enter your regex pattern..."
                          className={!isValid 
                            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200' 
                            : 'border-teal-300 focus:border-teal-500 focus:ring-teal-200'}
                        />
                      </div>
                      <span className="text-xl font-mono text-teal-600 flex-shrink-0">/</span>
                      <Button
                        variant="outline"
                        onClick={copyPattern}
                        disabled={!pattern || !isValid}
                        title="Copy regex with flags"
                      >
                        {copied ? <Check size={16} className="text-teal-600" /> : <Copy size={16} />}
                      </Button>
                    </div>
                    
                    {!isValid && errorMessage && (
                      <Alert variant="error" className="mt-3">
                        {errorMessage}
                      </Alert>
                    )}
                  </div>
                  
                  {/* Flags Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Settings className="inline mr-1" size={16} />
                      Flags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <FlagToggle
                        flag="g"
                        label="Global"
                        description="Find all matches rather than stopping after first"
                        active={flags.global}
                        onToggle={() => toggleFlag('global')}
                      />
                      <FlagToggle
                        flag="i"
                        label="Ignore Case"
                        description="Case insensitive matching"
                        active={flags.ignoreCase}
                        onToggle={() => toggleFlag('ignoreCase')}
                      />
                      <FlagToggle
                        flag="m"
                        label="Multiline"
                        description="^ and $ match line breaks"
                        active={flags.multiline}
                        onToggle={() => toggleFlag('multiline')}
                      />
                      <FlagToggle
                        flag="s"
                        label="Dot All"
                        description=". matches newline characters"
                        active={flags.dotAll}
                        onToggle={() => toggleFlag('dotAll')}
                      />
                      <FlagToggle
                        flag="u"
                        label="Unicode"
                        description="Full Unicode matching"
                        active={flags.unicode}
                        onToggle={() => toggleFlag('unicode')}
                      />
                      <FlagToggle
                        flag="y"
                        label="Sticky"
                        description="Match only from lastIndex position"
                        active={flags.sticky}
                        onToggle={() => toggleFlag('sticky')}
                      />
                      <FlagToggle
                        flag="d"
                        label="Indices"
                        description="Generate start/end indices for matches"
                        active={flags.hasIndices}
                        onToggle={() => toggleFlag('hasIndices')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Test String Section */}
            <Card className="border-teal-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <BookOpen className="text-teal-600 mr-2" size={20} />
                    <h2 className="text-xl font-semibold text-gray-900">Test String</h2>
                  </div>
                  {selectedTemplate && (!testString || testString.length === 0) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateSample}
                    >
                      <Zap size={14} className="mr-1" />
                      Generate Sample
                    </Button>
                  )}
                </div>
                
                <Textarea
                  value={testString}
                  onChange={(e) => setTestString(e.target.value)}
                  placeholder="Enter text to test against your regex..."
                  rows={8}
                  className="border-teal-300 focus:border-teal-500 focus:ring-teal-200"
                />
              </div>
            </Card>

            {/* Preview Section */}
            {pattern && testString && (
              <Card className="border-teal-200">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <PlayCircle className="text-teal-600 mr-2" size={20} />
                      <h2 className="text-xl font-semibold text-gray-900">Live Preview</h2>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default" className="bg-teal-600">
                        {matches.length} match{matches.length !== 1 ? 'es' : ''}
                      </Badge>
                      {matches.length > 0 && (
                        <Badge variant="secondary">
                          {coveragePercentage}% coverage
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md font-mono text-sm whitespace-pre-wrap border border-teal-200 max-h-80 overflow-auto">
                    {renderHighlightedText()}
                  </div>
                  
                  {matches.length === 0 && testString && pattern && isValid && (
                    <div className="mt-3 flex items-center text-amber-600 text-sm bg-amber-50 p-3 rounded-md border border-amber-200">
                      <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                      <span>No matches found - try adjusting your pattern or test string</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            
            {/* Templates */}
            <Card className="border-teal-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BookOpen className="mr-2 text-teal-600" size={18} />
                  Templates
                </h2>
                <TemplateDropdown
                  templates={templates}
                  selectedTemplate={selectedTemplate}
                  onSelect={handleTemplateSelect}
                />
                
                {selectedTemplate && (
                  <div className="mt-4 p-4 bg-teal-50 rounded-md border border-teal-200">
                    <div className="text-sm text-gray-700 mb-2 font-medium">
                      {templates.find(t => t.name === selectedTemplate)?.description}
                    </div>
                    <div className="text-xs font-mono bg-white p-2 rounded border border-teal-300 break-all">
                      {templates.find(t => t.name === selectedTemplate)?.pattern}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Statistics */}
            <Card className="border-teal-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart3 className="mr-2 text-teal-600" size={18} />
                  Statistics
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pattern Status:</span>
                    <Badge variant={isValid ? 'default' : 'danger'}>
                      {isValid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Matches:</span>
                    <Badge variant="secondary">{matches.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pattern Length:</span>
                    <span className="font-medium">{pattern.length} chars</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Test String Length:</span>
                    <span className="font-medium">{testString.length} chars</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Flags:</span>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {Object.entries(flags)
                        .filter(([, active]) => active)
                        .map(([flag]) => flag[0])
                        .join('') || 'none'}
                    </span>
                  </div>
                  {matches.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Coverage:</span>
                      <span className="font-medium">{coveragePercentage}%</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="border-teal-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (pattern && isValid) {
                        const flagsStr = 
                          (flags.global ? 'g' : '') + 
                          (flags.ignoreCase ? 'i' : '') + 
                          (flags.multiline ? 'm' : '') +
                          (flags.dotAll ? 's' : '') +
                          (flags.unicode ? 'u' : '') +
                          (flags.sticky ? 'y' : '') +
                          (flags.hasIndices ? 'd' : '');
                        const code = `const regex = /${pattern}/${flagsStr};\nconst matches = '${testString.replace(/'/g, "\\'")}'.match(regex);`;
                        copyToClipboard(code);
                      }
                    }}
                    disabled={!pattern || !isValid}
                    className="w-full justify-start"
                  >
                    <Code2 size={16} className="mr-2" />
                    Copy as JavaScript
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPattern('');
                      setTestString('');
                      setSelectedTemplate('');
                    }}
                    className="w-full justify-start"
                  >
                    <X size={16} className="mr-2" />
                    Clear All
                  </Button>
                </div>
              </div>
            </Card>

            {/* Matches Display */}
            {matches.length > 0 && (
              <Card className="border-teal-200">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Matches ({matches.length})
                  </h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {matches.slice(0, 100).map((match, index) => (
                      <MatchItem
                        key={index}
                        match={match}
                        index={index}
                        onCopy={() => copyToClipboard(match.text)}
                      />
                    ))}
                    {matches.length > 100 && (
                      <div className="text-center text-sm text-gray-500 py-3 bg-teal-50 rounded-md border border-teal-200">
                        Showing first 100 of {matches.length} matches
                        <br />
                        <span className="text-xs">Consider refining your pattern for better performance</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegexTester;