import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Copy, 
  Check, 
  AlertCircle, 
  BookOpen, 
  ChevronDown,
  Zap,
  Code2,
  Info,
  X
} from 'lucide-react';

// Import your UI components
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import Alert from '../../components/Alert';
import { Input } from '../../components/input';
import { Textarea } from '../../components/textarea';
import { Badge } from '../../components/Badge';
import { Dropdown } from '../../components/DropDown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/tooltip';

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

// Template Dropdown Component
const TemplateDropdown: React.FC<{
  templates: RegexTemplate[];
  selectedTemplate: string;
  onSelect: (template: RegexTemplate) => void;
}> = ({ templates, selectedTemplate, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonElement, setButtonElement] = useState<HTMLButtonElement | null>(null);
  
  const dropdownItems = templates.map(template => ({
    label: template.name,
    description: template.description,
    onClick: () => onSelect(template),
    variant: "default" as const
  }));
  
  return (
    <div className="relative">
      <Button 
        ref={setButtonElement}
        variant="outline" 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400 focus:border-teal-500 focus:ring-teal-200"
        rightIcon={<ChevronDown size={16} className="text-teal-600" />}
      >
          {selectedTemplate || 'Select Template'}
      </Button>
      
      <Dropdown
        show={isOpen}
        onClose={() => setIsOpen(false)}
        items={dropdownItems}
        alignTo={buttonElement}
        width="auto"
      />
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
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
      variant={active ? 'primary' : 'outline'}
        onClick={onToggle}
        className={`px-3 py-2 rounded-md text-sm font-mono transition-colors border ${
          active 
            ? 'bg-teal-500 text-white shadow-sm border-teal-600 hover:bg-teal-600' 
            : 'bg-gray-100 text-gray-600 hover:bg-teal-50 border-teal-200 hover:border-teal-300'
        }`}
      >
        {flag}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <div className="font-medium">{label}</div>
      <div className="text-xs opacity-80">{description}</div>
    </TooltipContent>
  </Tooltip>
);

// Match Item Component
const MatchItem: React.FC<{
  match: Match;
  index: number;
  onCopy: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}> = ({ match, index, onCopy, isExpanded }) => (
  <Card className="transition-all duration-200 border-teal-200 hover:border-teal-300">
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="default" className="bg-teal-500 text-white border-teal-600">Match #{index + 1}</Badge>
          <Badge variant="secondary" className="bg-teal-100 text-teal-800 border-teal-200">Pos: {match.index}</Badge>
          <Badge variant="secondary" className="bg-teal-100 text-teal-800 border-teal-200">Len: {match.length}</Badge>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            title="Copy match"
            className="hover:bg-teal-100 hover:text-teal-700"
          >
            <Copy size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title={isExpanded ? "Collapse" : "Expand"}
            className="hover:bg-teal-100 hover:text-teal-700"
          >
            {isExpanded ? <X size={14} /> : <Info size={14} />}
          </Button>
        </div>
      </div>
      
      <div className="font-mono text-sm bg-teal-50 p-2 rounded border border-teal-200">
        {match.text || '(empty match)'}
      </div>
      
      {isExpanded && (
        <div className="space-y-2 pt-2 border-t border-teal-200">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-teal-50 p-2 rounded border border-teal-200">
              <div className="font-medium text-gray-700">Start Index</div>
              <div className="font-mono">{match.index}</div>
            </div>
            <div className="bg-teal-50 p-2 rounded border border-teal-200">
              <div className="font-medium text-gray-700">End Index</div>
              <div className="font-mono">{match.index + match.length}</div>
            </div>
          </div>
          
          {match.groups && match.groups.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Capture Groups:</div>
              <div className="space-y-1">
                {match.groups.map((group, i) => (
                  <div key={i} className="flex justify-between items-center text-xs bg-teal-50 p-2 rounded border border-teal-200">
                    <span className="text-gray-500">Group {i + 1}:</span>
                    <span className="font-mono bg-white px-1 rounded border border-teal-300">
                      {group || '(empty)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {match.namedGroups && Object.keys(match.namedGroups).length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Named Groups:</div>
              <div className="space-y-1">
                {Object.entries(match.namedGroups).map(([name, value]) => (
                  <div key={name} className="flex justify-between items-center text-xs bg-teal-50 p-2 rounded border border-teal-200">
                    <span className="text-gray-500">{name}:</span>
                    <span className="font-mono bg-white px-1 rounded border border-teal-300">
                      {value || '(empty)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </Card>
);

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
  const [expandedMatches, setExpandedMatches] = useState<Set<number>>(new Set());

  // Templates
  const templates: RegexTemplate[] = useMemo(() => [
    { 
      name: 'Email', 
      pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', 
      description: 'Matches valid email addresses',
      category: 'web'
    },
    { 
      name: 'URL', 
      pattern: 'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)', 
      description: 'Matches HTTP/HTTPS URLs',
      category: 'web'
    },
    { 
      name: 'Phone Number', 
      pattern: '\\+?[1-9]\\d{1,14}', 
      description: 'International phone number format',
      category: 'common'
    },
    { 
      name: 'Date (YYYY-MM-DD)', 
      pattern: '\\d{4}-\\d{2}-\\d{2}',
      description: 'ISO date format',
      category: 'format'
    },
    { 
      name: 'Time (24h)', 
      pattern: '([01]?[0-9]|2[0-3]):[0-5][0-9]',
      description: '24-hour time format (HH:MM)',
      category: 'format'
    },
    { 
      name: 'IPv4 Address', 
      pattern: '(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)',
      description: 'IPv4 address format',
      category: 'web'
    },
    { 
      name: 'IPv6 Address', 
      pattern: '(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}',
      description: 'IPv6 address format (basic)',
      category: 'web'
    },
    { 
      name: 'Password Strength', 
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
      description: 'Strong password validation (8+ chars, mixed case, number, special)',
      category: 'validation'
    },
    { 
      name: 'Credit Card', 
      pattern: '^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})$',
      description: 'Major credit card formats',
      category: 'validation'
    },
    { 
      name: 'Hex Color', 
      pattern: '#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})',
      description: 'Hexadecimal color codes',
      category: 'format'
    },
    { 
      name: 'MAC Address', 
      pattern: '([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})',
      description: 'MAC address format',
      category: 'format'
    },
    { 
      name: 'UUID', 
      pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
      description: 'UUID/GUID format',
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
            if (allMatches.length >= 100) break;
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
      sample = 'Contact us at info@example.com or support@company.org\nJohn Doe: john.doe123@gmail.com\nInvalid: not-an-email';
    } else if (templateName.includes('url')) {
      sample = 'Visit https://www.example.com or http://test.org\nAlso check https://sub.domain.co.uk/path?param=value';
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

  // Toggle match expansion
  const toggleMatchExpansion = useCallback((index: number) => {
    setExpandedMatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

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
          className="bg-teal-100 text-teal-900 px-1 rounded cursor-pointer hover:bg-teal-200 transition-colors border border-teal-300"
          title={`Match #${i + 1}: "${match.text}"`}
          onClick={() => toggleMatchExpansion(i)}
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
  }, [testString, matches, toggleMatchExpansion]);

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto p-6 space-y-6 bg-white min-h-screen">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center">
            <Search className="mr-3 text-teal-500" size={32} />
            Regex Tester
          </h1>
          <p className="text-gray-600">Test and debug regular expressions with comprehensive flag support</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* Left Column - Pattern and Test String */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* Pattern Input */}
            <Card className="border-teal-200 shadow-sm">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Regular Expression Pattern
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-mono text-teal-600">/</span>
                    <div className="flex-1">
                      <Input
                        value={pattern}
                        onChange={(e) => setPattern(e.target.value)}
                        placeholder="Enter regex pattern..."
                        className={!isValid ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200' : 'border-teal-300 focus:border-teal-500 focus:ring-teal-200'}
                      />
                    </div>
                    <span className="text-lg font-mono text-teal-600">/</span>
                    <Button
                      variant="outline"
                      onClick={copyPattern}
                      disabled={!pattern || !isValid}
                      className="border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400 disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent"
                    >
                      {copied ? <Check size={16} className="text-teal-600" /> : <Copy size={16} />}
                    </Button>
                  </div>
                  
                  {!isValid && (
                   <Alert variant="error" className="mt-2">
                      {errorMessage}
                    </Alert>
                  )}
                </div>
                
                {/* Flags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Regex Flags
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
            </Card>

            {/* Test String */}
            <Card className="border-teal-200 shadow-sm">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Test String
                  </label>
                  {(!testString || testString.length === 0) && selectedTemplate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateSample}
                      className="border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400"
                      rightIcon={<Zap size={14} className="mr-1" />}
                    >
                      Generate Sample
                    </Button>
                  )}
                </div>
                <Textarea
                  value={testString}
                  onChange={(e) => setTestString(e.target.value)}
                  placeholder="Enter text to test against your regex..."
                  rows={6}
                  className="border-teal-300 focus:border-teal-500 focus:ring-teal-200"
                />
              </div>
            </Card>

            {/* Preview */}
            {pattern && testString && (
              <Card className="border-teal-200 shadow-sm">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Code2 className="mr-2 text-teal-500" size={20} />
                      Live Preview
                    </h3>
                    {matches.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Badge variant="default" className="bg-teal-500 text-white border-teal-600">
                          {matches.length} match{matches.length !== 1 ? 'es' : ''}
                        </Badge>
                        {matches.length > 0 && (
                          <Badge variant="secondary" className="bg-teal-100 text-teal-800 border-teal-200">
                            {Math.round((matches.reduce((sum, m) => sum + m.length, 0) / testString.length) * 100)}% coverage
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md font-mono text-sm whitespace-pre-wrap border border-teal-200 max-h-96 overflow-auto">
                    {renderHighlightedText()}
                  </div>
                  {matches.length === 0 && testString && pattern && isValid && (
                    <div className="mt-2 flex items-center text-amber-600 text-sm">
                      <AlertCircle size={16} className="mr-2" />
                      No matches found
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Controls and Results */}
          <div className="space-y-6">
            
            {/* Template Selection */}
            <Card className="border-teal-200 shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Templates</h3>
                <TemplateDropdown
                  templates={templates}
                  selectedTemplate={selectedTemplate}
                  onSelect={handleTemplateSelect}
                />
                
                {selectedTemplate && (
                  <div className="mt-4 p-3 bg-teal-50 rounded-md border border-teal-200">
                    <div className="text-sm text-gray-600 mb-2">
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
            <Card className="border-teal-200 shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge variant={isValid ? 'default' : 'danger'} className={isValid ? 'bg-teal-500 text-white border-teal-600' : ''}>
                      {isValid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Matches:</span>
                    <Badge variant="secondary" className="bg-teal-100 text-teal-800 border-teal-200">{matches.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pattern length:</span>
                    <span className="font-medium">{pattern.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active flags:</span>
                    <span className="font-mono text-sm">
                      {Object.entries(flags)
                        .filter(([, active]) => active)
                        .map(([flag]) => flag[0])
                        .join('') || 'none'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="border-teal-200 shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
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
                        const code = `const regex = /${pattern}/${flagsStr};\nconst result = regex.exec('${testString.replace(/'/g, "\\'")}');`;
                        copyToClipboard(code);
                      }
                    }}
                    disabled={!pattern || !isValid}
                    className="w-full border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400 disabled:border-gray-200"
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
                      setExpandedMatches(new Set());
                    }}
                    className="w-full bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200 hover:border-teal-300"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </Card>

            {/* Matches */}
            {matches.length > 0 && (
              <Card className="border-teal-200 shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Matches ({matches.length})
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {matches.slice(0, 50).map((match, index) => (
                      <MatchItem
                        key={index}
                        match={match}
                        index={index}
                        onCopy={() => copyToClipboard(match.text)}
                        isExpanded={expandedMatches.has(index)}
                        onToggleExpand={() => toggleMatchExpansion(index)}
                      />
                    ))}
                    {matches.length > 50 && (
                      <div className="text-center text-sm text-gray-500 py-2 bg-teal-50 rounded-md border border-teal-200">
                        Showing first 50 of {matches.length} matches
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default RegexTester;