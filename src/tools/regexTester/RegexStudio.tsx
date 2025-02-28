/* eslint-disable @typescript-eslint/no-unused-vars */
// Part 5: Main Component Assembly
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  AlertCircle, Check, Copy, Info, 
  Code, Maximize2, X, Sun, Moon,
  GitBranch,
  BookOpen, Save, Command, Bookmark,
  Award, Share2, PanelRight, Zap,
  ChevronDown
} from 'lucide-react';
import { Card, Flags, Match, RegexTemplate, Theme } from './InterfaceAndUtilities';
import { 
  useTemplateChangeHandler, 
  useFlagChangeHandler, 
  useCopyToClipboard,
  useCopyMatchData,
  useToggleFullscreen,
  useSyntaxHighlighter,
  useHighlightedTextRenderer,
  useDifficultyBadge,
  useCategoryBadge
} from './hooks';
import {
  RegexHelpContent,
  MatchItem,
  PatternInputSection,
  TabButtons,
  VisualMetrics,
} from './internalComponents';
import { Dropdown } from '../../components/DropDown';
import { Button } from '../../components/Button';

const RegexTester: React.FC = () => {
  // State definitions
  const [pattern, setPattern] = useState<string>('');
  const [testString, setTestString] = useState<string>('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isValid, setIsValid] = useState<boolean>(true);
  const [flags, setFlags] = useState<Flags>({ 
    global: true, 
    ignoreCase: false, 
    multiline: false, 
    sticky: false, 
    unicode: false 
  });
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'preview'>('matches');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [visualMode, setVisualMode] = useState<boolean>(true);
  const [tooManyMatches, setTooManyMatches] = useState<boolean>(false);
  const [openDropdown, setOpenDropdown] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [recentActivity, setRecentActivity] = useState<{action: string, timestamp: number}[]>([]);
  
  //refs
  const templateButtonRef = useRef<HTMLButtonElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  
  // Memoized templates to avoid recreating on each render
  const templates: RegexTemplate[] = useMemo(() => [
    { 
      name: 'Email', 
      pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', 
      description: 'Matches valid email addresses',
      category: 'web',
      difficulty: 'beginner'
    },
    { 
      name: 'URL', 
      pattern: 'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)', 
      description: 'Matches most web URLs',
      category: 'web',
      difficulty: 'intermediate'
    },
    { 
      name: 'Phone Number', 
      pattern: '\\+?[1-9]\\d{1,14}', 
      description: 'Matches international phone numbers',
      category: 'common',
      difficulty: 'beginner'
    },
    { 
      name: 'Date (YYYY-MM-DD)', 
      pattern: '\\d{4}-\\d{2}-\\d{2}',
      description: 'Matches dates in YYYY-MM-DD format',
      category: 'format',
      difficulty: 'beginner'
    },
    { 
      name: 'IP Address', 
      pattern: '(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)',
      description: 'Matches IPv4 addresses',
      category: 'web',
      difficulty: 'intermediate'
    },
    { 
      name: 'Password Strength', 
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
      description: 'At least 8 chars, uppercase, lowercase, number and special character',
      category: 'validation',
      difficulty: 'advanced'
    },
    { 
      name: 'Credit Card', 
      pattern: '^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\\d{3})\\d{11})$',
      description: 'Common credit card formats (Visa, Mastercard, Amex, etc.)',
      category: 'validation',
      difficulty: 'advanced'
    },
    { 
      name: 'Zip Code (US)', 
      pattern: '^\\d{5}(?:[-\\s]\\d{4})?$',
      description: 'US ZIP codes with optional +4 code',
      category: 'common',
      difficulty: 'beginner'
    }
  ], []);

  // Memoized theme based on dark mode to avoid recreation on each render
  const theme: Theme = useMemo(() => ({
    bg: darkMode ? 'bg-gray-950' : 'bg-gray-50',
    text: darkMode ? 'text-white' : 'text-gray-800',
    textSecondary: darkMode ? 'text-gray-300' : 'text-gray-500',
    border: darkMode ? 'border-gray-800' : 'border-gray-200',
    sidebar: darkMode ? 'bg-gray-900' : 'bg-white',
    input: darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300',
    highlight: darkMode ? 'bg-indigo-900/60 text-indigo-200' : 'bg-indigo-100 text-indigo-800',
    buttonPrimary: darkMode 
      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' 
      : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600',
    buttonSecondary: darkMode 
      ? 'bg-gray-800 hover:bg-gray-700' 
      : 'bg-white hover:bg-gray-50 border border-gray-200',
    flagActive: darkMode 
      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
      : 'bg-gradient-to-r from-blue-400 to-indigo-400 text-white',
    flagInactive: darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700',
    card: darkMode ? 'bg-gray-900' : 'bg-white',
    codeBlock: darkMode ? 'bg-gray-950' : 'bg-gray-50',
    matchHighlight: darkMode ? 'bg-indigo-900/40' : 'bg-indigo-50',
    gradient: darkMode 
      ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-black' 
      : 'bg-gradient-to-br from-white via-gray-50 to-gray-100',
    headerGradient: darkMode 
      ? 'bg-gradient-to-r from-indigo-900 to-purple-900' 
      : 'bg-gradient-to-r from-indigo-600 to-purple-700',
    accentColor: darkMode ? 'text-indigo-400' : 'text-indigo-600',
    tooltipBg: darkMode ? 'bg-gray-800' : 'bg-white',
    glassEffect: darkMode 
      ? 'bg-gray-800/50 backdrop-blur-md border border-gray-700/50' 
      : 'bg-white/80 backdrop-blur-md border border-gray-200/50',
    elevatedCard: darkMode 
      ? 'bg-gradient-to-b from-gray-800 to-gray-900 shadow-lg shadow-indigo-900/10' 
      : 'bg-gradient-to-b from-white to-gray-50 shadow-xl shadow-indigo-200/30',
  }), [darkMode]);

  // Memoize the token patterns for syntax highlighting
  const tokenPatterns = useMemo(() => [
    { type: 'escape', pattern: /\\./g, class: darkMode ? 'text-yellow-400' : 'text-amber-600' },
    { type: 'group', pattern: /(\((?:\?:|\?=|\?!|\?<=|\?<!)?|\))/g, class: darkMode ? 'text-purple-400' : 'text-purple-600' },
    { type: 'quantifier', pattern: /(\?|\*|\+|\{\d+(?:,\d*)?\})/g, class: darkMode ? 'text-pink-400' : 'text-pink-600' },
    { type: 'charset', pattern: /(\[|\]|\^|\$)/g, class: darkMode ? 'text-green-400' : 'text-green-600' },
    { type: 'alternation', pattern: /(\|)/g, class: darkMode ? 'text-red-400' : 'text-red-600' },
    { type: 'metachar', pattern: /(\\[dDwWsStrnvf]|\.\*|\.\+|\.)/g, class: darkMode ? 'text-cyan-400' : 'text-cyan-600' },
    { type: 'anchor', pattern: /(^|\$)/g, class: darkMode ? 'text-sky-400' : 'text-sky-600' },
  ], [darkMode]);

  // Track user activity
  const logActivity = (action: string) => {
    setRecentActivity(prev => {
      const newActivity = [{ action, timestamp: Date.now() }, ...prev];
      return newActivity.slice(0, 5); // Keep only last 5 activities
    });
  };

  // FIX: Regex evaluation with improved safety to prevent infinite loops
  useEffect(() => {
    if (pattern === '') {
      setMatches([]);
      setIsValid(true);
      setTooManyMatches(false);
      return;
    }

    // Define a maximum execution time and maximum number of matches
    const MAX_EXECUTION_TIME_MS = 300; // 300ms maximum execution time
    const MAX_MATCHES = 500; // Maximum number of matches to prevent browser hanging
    
    // Create a worker or use a timeout to prevent UI freezing
    const timeoutId = setTimeout(() => {
      try {
        // Create flags string
        const flagsStr: string = 
          (flags.global ? 'g' : '') + 
          (flags.ignoreCase ? 'i' : '') + 
          (flags.multiline ? 'm' : '') +
          (flags.sticky ? 'y' : '') +
          (flags.unicode ? 'u' : '');
        
        const regex = new RegExp(pattern, flagsStr);
        setIsValid(true);
        setTooManyMatches(false);
        
        if (testString) {
          // Find all matches with safety mechanisms
          const allMatches: Match[] = [];
          let match: RegExpExecArray | null;
          
          const startTime = Date.now();
          
          if (flags.global) {
            regex.lastIndex = 0; // Reset lastIndex to ensure consistent behavior
            
            while ((match = regex.exec(testString)) !== null) {
              // Capture any groups
              const groups = match.slice(1);
              
              allMatches.push({
                text: match[0],
                index: match.index,
                length: match[0].length,
                groups: groups.length > 0 ? groups : null
              });
              
              // Critical fix: Avoid infinite loops for zero-length matches
              if (match.index === regex.lastIndex) {
                regex.lastIndex++;
              }
              
              // Safety checks to prevent browser hanging
              const currentTime = Date.now();
              if (currentTime - startTime > MAX_EXECUTION_TIME_MS || allMatches.length >= MAX_MATCHES) {
                setTooManyMatches(true);
                break;
              }
            }
          } else {
            match = regex.exec(testString);
            if (match) {
              // Capture any groups
              const groups = match.slice(1);
              
              allMatches.push({
                text: match[0],
                index: match.index,
                length: match[0].length,
                groups: groups.length > 0 ? groups : null
              });
            }
          }
          
          setMatches(allMatches);
          
          // Log activity
          if (allMatches.length > 0) {
            logActivity(`Found ${allMatches.length} match${allMatches.length !== 1 ? 'es' : ''}`);
          }
        } else {
          setMatches([]);
        }
      } catch (error) {
        setIsValid(false);
        setMatches([]);
        setTooManyMatches(false);
        logActivity("Invalid regex pattern");
      }
    }, 0);
    
    // Cleanup function
    return () => clearTimeout(timeoutId);
  }, [pattern, testString, flags]);

  // Log template selection
  useEffect(() => {
    if (selectedTemplate) {
      logActivity(`Selected "${selectedTemplate}" template`);
    }
  }, [selectedTemplate]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD/CTRL + / to toggle help
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowHelp(prev => !prev);
      }
      
      // CMD/CTRL + D to toggle dark mode
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        setDarkMode(prev => !prev);
      }
      
      // CMD/CTRL + F to toggle fullscreen
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
      
      // CMD/CTRL + S to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Hook up utility functions
  const handleTemplateChange = useTemplateChangeHandler(templates, setSelectedTemplate, setPattern);
  const handleFlagChange = useFlagChangeHandler(setFlags);
  const copyToClipboard = useCopyToClipboard(pattern, flags, setCopied);
  const copyMatchData = useCopyMatchData();
  const toggleFullscreen = useToggleFullscreen(setIsFullscreen);
  const syntaxHighlight = useSyntaxHighlighter(tokenPatterns);
  const renderHighlightedText = useHighlightedTextRenderer(
    testString,
    matches,
    expandedMatch,
    theme,
    setExpandedMatch
  );
  const getDifficultyBadge = useDifficultyBadge(theme);
  const getCategoryBadge = useCategoryBadge(theme);

  // Format timestamps
  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diffMs = now - timestamp;
    
    if (diffMs < 60000) {
      return 'just now';
    } else if (diffMs < 3600000) {
      const mins = Math.floor(diffMs / 60000);
      return `${mins}m ago`;
    } else {
      const hours = Math.floor(diffMs / 3600000);
      return `${hours}h ago`;
    }
  };

  // Main render
  return (
    <div 
      className={`${isFullscreen ? 'fixed inset-0 z-50' : ''} ${theme.bg} transition-colors duration-300 ease-in-out min-h-screen`}
      ref={mainContainerRef}
    >
      <div className={`relative ${isFullscreen ? 'h-full overflow-hidden' : 'max-w-7xl mx-auto'}`}>
        {/* Enhanced header with animated gradient background */}
        <header className={`${theme.headerGradient} mb-6 rounded-xl shadow-lg text-white relative overflow-hidden transition-all duration-300 p-0`}>
          <div className="absolute inset-0 bg-black opacity-30"></div>
          
          {/* Animated dots background effect */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <div 
                key={i}
                className="absolute rounded-full bg-white opacity-10"
                style={{
                  width: `${Math.random() * 8 + 4}px`,
                  height: `${Math.random() * 8 + 4}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animation: `float ${Math.random() * 10 + 10}s linear infinite`
                }}
              />
            ))}
          </div>
          
          <div className="pt-5 px-6 pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="mr-4 p-2.5 bg-white/10 rounded-lg flex items-center justify-center">
                  <Code className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
                    RegEx Tester
                  </h1>
                  <p className="text-indigo-100 mt-0.5 text-sm">Build, test, and debug regular expressions with real-time feedback</p>
                </div>
              </div>
              
              <div className="hidden md:flex items-center space-x-2">
                {/* Command palette trigger */}
                <div 
                  className="px-2.5 py-1.5 rounded-md bg-white/10 border border-white/20 text-sm flex items-center mr-2 cursor-pointer hover:bg-white/20 transition-colors"
                  onClick={() => alert("Command palette would open here")}
                >
                  <Command size={14} className="mr-1" />
                  <span className="mr-1">Command</span>
                  <kbd className="bg-black/20 px-1.5 py-0.5 rounded text-xs">⌘K</kbd>
                </div>
              
                <Button
                  variant="outline"
                  onClick={() => setDarkMode(!darkMode)}
                  className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20"
                  size='icon'
                  title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20"
                  size='icon'
                  title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <PanelRight size={18} />
                </Button>
                
                <Button
                  variant="outline"
                  onClick={toggleFullscreen}
                  className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20"
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  size='icon'
                >
                  {isFullscreen ? <X size={18} /> : <Maximize2 size={18} />}
                </Button>
              </div>
            </div>
            
            <VisualMetrics 
              isValid={isValid}
              matches={matches}
              flags={flags}
              visualMode={visualMode}
              setVisualMode={setVisualMode}
              theme={theme}
            />
          </div>
          
          {/* Quick actions toolbar */}
          <div className={`flex items-center px-2 ${darkMode ? 'bg-gray-950/50' : 'bg-indigo-800/50'} backdrop-blur-sm py-2 border-t border-white/10`}>
            <div className="flex space-x-1 text-xs px-2">
              <div className="px-2 py-1 rounded-md bg-white/10 flex items-center">
                <Bookmark size={12} className="mr-1.5" />
                <span>Saved Patterns: {savedColors.length || 0}</span>
              </div>
              <div className="px-2 py-1 rounded-md bg-white/10 flex items-center">
                <Zap size={12} className="mr-1.5" />
                <span>Found: {matches.length}</span>
              </div>
            </div>
            
            <div className="flex-1"></div>
            
            <div className="flex space-x-1 px-2">
              <button
                className="px-2.5 py-1 bg-white/10 rounded-md text-xs flex items-center hover:bg-white/20 transition-colors"
                onClick={() => {
                  if (pattern && isValid) {
                    const flagsStr = 
                      (flags.global ? 'g' : '') + 
                      (flags.ignoreCase ? 'i' : '') + 
                      (flags.multiline ? 'm' : '') +
                      (flags.sticky ? 'y' : '') +
                      (flags.unicode ? 'u' : '');
                    
                    const code = `// Regular Expression\nconst regex = /${pattern}/${flagsStr};`;
                    navigator.clipboard.writeText(code);
                    logActivity("Copied code to clipboard");
                  }
                }}
              >
                <Code size={12} className="mr-1.5" />
                Copy As Code
              </button>
              
              <button
                className="px-2.5 py-1 bg-white/10 rounded-md text-xs flex items-center hover:bg-white/20 transition-colors"
                onClick={() => {
                  if (pattern) {
                    try {
                      const url = `https://regex101.com/?regex=${encodeURIComponent(pattern)}&testString=${encodeURIComponent(testString || '')}&flags=${encodeURIComponent(
                        (flags.global ? 'g' : '') + 
                        (flags.ignoreCase ? 'i' : '') + 
                        (flags.multiline ? 'm' : '') +
                        (flags.sticky ? 'y' : '') +
                        (flags.unicode ? 'u' : '')
                      )}`;
                      window.open(url, '_blank');
                      logActivity("Opened in regex101");
                    } catch (error) {
                      console.error('Failed to open regex101:', error);
                    }
                  }
                }}
              >
                <Share2 size={12} className="mr-1.5" />
                Open in Regex101
              </button>
              
              <button
                className="px-2.5 py-1 bg-white/10 rounded-md text-xs flex items-center hover:bg-white/20 transition-colors"
                onClick={() => setShowHelp(!showHelp)}
              >
                <BookOpen size={12} className="mr-1.5" />
                {showHelp ? "Hide Help" : "Show Help"}
              </button>
            </div>
          </div>
        </header>
        
        <div className="flex flex-col md:flex-row gap-6 px-4 md:px-6">
          <div className={`md:flex-1 space-y-6 ${sidebarCollapsed ? 'md:w-full' : ''}`}>
            <Card theme={theme} className="p-5 overflow-hidden" hover>
              <div className="flex items-center mb-4 justify-between">
                <label className={`font-medium ${theme.text} text-lg flex items-center`}>
                  <GitBranch size={18} className={`mr-2 ${theme.accentColor}`} />
                  Regular Expression
                </label>
                
                {/* Keyboard shortcut hint */}
                <div className="hidden md:flex items-center text-xs text-gray-400">
                  <kbd className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>⌘/</kbd>
                  <span className="ml-1">to toggle help</span>
                </div>
              </div>
              
              {showHelp && <RegexHelpContent theme={theme} />}
              
              <PatternInputSection
                pattern={pattern}
                setPattern={setPattern}
                isValid={isValid}
                flags={flags}
                onFlagChange={handleFlagChange}
                copied={copied}
                onCopyToClipboard={copyToClipboard}
                theme={theme}
              />
              
              {!isValid && (
                <div className="flex items-center mt-2 text-red-500 text-xs bg-red-500/10 p-2 rounded">
                  <AlertCircle size={14} className="mr-1.5 flex-shrink-0" />
                  <span>Invalid regular expression syntax. Check for unmatched parentheses or brackets.</span>
                </div>
              )}
              
              {tooManyMatches && (
                <div className="flex items-center mt-2 text-amber-500 text-xs bg-amber-500/10 p-2 rounded">
                  <Info size={14} className="mr-1.5 flex-shrink-0" />
                  <span>Too many matches found or execution took too long. Showing partial results for better performance.</span>
                </div>
              )}
            </Card>
            
            <Card theme={theme} className="p-5" hover>
              <label className={`block font-medium ${theme.text} text-lg mb-3 flex items-center`}>
                <span className={`${theme.accentColor} mr-2`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                  </svg>
                </span>
                Test String
              </label>
              <textarea
                value={testString}
                onChange={(e) => setTestString(e.target.value)}
                className={`w-full p-3 border ${theme.input} rounded-md min-h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-colors`}
                placeholder="Enter text to test against your regex..."
              />
              
              {/* Generate sample button */}
              {!testString && (
                <div className="mt-3 flex justify-end">
                  <button
                    className={`px-3 py-1.5 text-xs rounded-md ${theme.buttonSecondary} flex items-center`}
                    onClick={() => {
                      // Generate sample based on selected template or common samples
                      let sample = '';
                      const templateName = selectedTemplate.toLowerCase();
                      
                      if (templateName.includes('email')) {
                        sample = 'Contact us at info@example.com or support@company.org\nJohn Doe: john.doe123@gmail.com';
                      } else if (templateName.includes('date')) {
                        sample = 'Meeting scheduled for 2023-05-15\nDeadline: 2024-01-31\nStart date: 2022-12-01';
                      } else if (templateName.includes('ip')) {
                        sample = 'Server IP: 192.168.1.1\nGateway: 10.0.0.1\nPublic IP: 203.0.113.42';
                      } else if (templateName.includes('password')) {
                        sample = 'Weak: password123\nMedium: Password123\nStrong: Password123!\nVery Strong: P@$w0rd!2023';
                      } else if (templateName.includes('credit')) {
                        sample = 'Visa: 4111111111111111\nMastercard: 5555555555554444\nAmex: 378282246310005';
                      } else if (templateName.includes('zip')) {
                        sample = 'New York: 10001\nLos Angeles: 90001\nExtended: 12345-6789';
                      } else {
                        sample = 'Lorem ipsum dolor sit amet\nExample text with some numbers: 123, 456\nSpecial characters: @#$%&*\nEmail: user@example.com\nPhone: +1234567890\nDate: 2023-05-15';
                      }
                      
                      setTestString(sample);
                      logActivity("Generated sample test string");
                    }}
                  >
                    <Zap size={12} className="mr-1.5" />
                    Generate Sample
                  </button>
                </div>
              )}
            </Card>
            
            <Card theme={theme} className="p-5" hover>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-medium ${theme.text} text-lg flex items-center`}>
                  <span className={`${theme.accentColor} mr-2`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Results
                </h3>
                <TabButtons
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  theme={theme}
                />
              </div>
              
              {activeTab === 'matches' ? (
                <div className={`min-h-32 ${theme.sidebar} rounded-lg p-4 border ${theme.border}`}>
                  {pattern && testString ? (
                    <>
                      <div className="mb-3">
                        {matches.length > 0 ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className={`${darkMode ? 'text-green-400' : 'text-green-600'} font-medium flex items-center`}>
                              <Check size={18} className="mr-2" />
                              Found {matches.length} match{matches.length !== 1 ? 'es' : ''}
                            </span>
                            
                            {/* Match rate animation with enhanced visualization */}
                            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 pr-2">
                              <div className="h-6 w-6 rounded-full flex items-center justify-center bg-blue-500 text-white text-xs mr-2">
                                {Math.round((matches.reduce((sum, m) => sum + m.length, 0) / testString.length) * 100)}%
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-medium">Match coverage</span>
                                <div className="h-1.5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                                    style={{ 
                                      width: `${((matches.reduce((sum, m) => sum + m.length, 0) / testString.length) * 100)}%` 
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center text-amber-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className={theme.textSecondary}>No matches found</span>
                          </div>
                        )}
                      </div>
                      
                      {matches.length > 0 && (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                          {/* Limit the number of rendered matches for performance */}
                          {matches.slice(0, 100).map((match, index) => (
                            <MatchItem
                              key={index}
                              match={match}
                              index={index}
                              expandedMatch={expandedMatch}
                              setExpandedMatch={setExpandedMatch}
                              theme={theme}
                              onCopyMatch={copyMatchData}
                            />
                          ))}
                          {matches.length > 100 && (
                            <div className="text-center text-amber-500 text-sm p-2 bg-amber-500/10 rounded-md flex items-center justify-center">
                              <Info size={14} className="mr-1.5" />
                              Showing 100 of {matches.length} matches for better performance
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`flex flex-col items-center justify-center h-32 ${theme.textSecondary}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Enter a pattern and test string to see results</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`${theme.sidebar} rounded-md p-4 min-h-32 border ${theme.border} overflow-auto`}>
                  {pattern && testString ? (
                    <div className={`whitespace-pre-wrap break-words ${theme.text} font-mono`}>
                      {renderHighlightedText()}
                    </div>
                  ) : (
                    <div className={`flex flex-col items-center justify-center h-32 ${theme.textSecondary}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Enter a pattern and test string to see highlighted matches</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
          
          {/* Sidebar */}
          {!sidebarCollapsed && (
            <div className="md:w-80 lg:w-96 space-y-6">
              <Card theme={theme} className={` p-5 relative overflow-hidden`} hover>
                <h3 className={`font-medium ${theme.text} text-lg mb-3 flex items-center`}>
                  <span className={`${theme.accentColor} mr-2`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                    </svg>
                  </span>
                  Pattern Library
                </h3>
                
                {/* Decorative background elements */}
                <div className="absolute -right-12 -bottom-8 opacity-5">
                  <Code size={120} />
                </div>
                
                {/* Filter buttons with improved styling */}
                <div className="flex flex-wrap items-center mb-3 -mx-1 -my-1">
                  <div className="px-1 py-1">
                    <button 
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        filterCategory === 'all' 
                          ? `${darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800'}`
                          : `${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'} hover:bg-gray-200`
                      }`}
                      onClick={() => setFilterCategory('all')}
                    >
                      All
                    </button>
                  </div>
                  <div className="px-1 py-1">
                    <button 
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        filterCategory === 'web' 
                          ? `${darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800'}`
                          : `${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'} hover:bg-gray-200`
                      }`}
                      onClick={() => setFilterCategory('web')}
                    >
                      Web
                    </button>
                  </div>
                  <div className="px-1 py-1">
                    <button 
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        filterCategory === 'validation' 
                          ? `${darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800'}`
                          : `${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'} hover:bg-gray-200`
                      }`}
                      onClick={() => setFilterCategory('validation')}
                    >
                      Validation
                    </button>
                  </div>
                  <div className="px-1 py-1">
                    <button 
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        filterCategory === 'format' 
                          ? `${darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800'}`
                          : `${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'} hover:bg-gray-200`
                      }`}
                      onClick={() => setFilterCategory('format')}
                    >
                      Format
                    </button>
                  </div>
                  <div className="px-1 py-1">
                    <button 
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        filterCategory === 'common' 
                          ? `${darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800'}`
                          : `${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'} hover:bg-gray-200`
                      }`}
                      onClick={() => setFilterCategory('common')}
                    >
                      Common
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <Button
                    ref={templateButtonRef}
                    variant="primary"
                    onClick={() => setOpenDropdown(!openDropdown)}
                    className="w-full flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <Bookmark size={16} className="mr-2" />
                      Select a Template
                    </span>
                    <ChevronDown size={16} />
                  </Button>
                  
                  <Dropdown
                    show={openDropdown}
                    alignTo={templateButtonRef.current}
                    onClose={() => {
                      setOpenDropdown(false);
                    }}
                    width='auto'
                    items={[
                    ...templates
                      .filter(t => filterCategory === 'all' || t.category === filterCategory)
                      .map(template => ({
                      label: template.name,
                      onClick: () => {
                        handleTemplateChange({ 
                        target: { value: template.name } as HTMLSelectElement 
                      } as React.ChangeEvent<HTMLSelectElement>);
                      setOpenDropdown(false);
                    },
                      description: template.description,
                      variant: "default" as const
                      }))
                    ]}
                  />
                </div>
                
                {selectedTemplate && (
                  <div className="text-sm">
                    <div className={`mb-3 flex justify-between items-center`}>
                      <p className={`font-medium mb-1 ${theme.text} flex items-center`}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 mr-1 ${theme.accentColor}`}>
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                        </svg>
                        {templates.find(t => t.name === selectedTemplate)?.name}
                      </p>
                      <div className="flex space-x-1">
                        {templates.find(t => t.name === selectedTemplate)?.category && 
                          getCategoryBadge(templates.find(t => t.name === selectedTemplate)?.category as RegexTemplate['category'])}
                        {templates.find(t => t.name === selectedTemplate)?.difficulty && 
                          getDifficultyBadge(templates.find(t => t.name === selectedTemplate)?.difficulty as RegexTemplate['difficulty'])}
                      </div>
                    </div>
                    <p className={`${theme.textSecondary} mb-3 italic text-xs border-l-2 ${darkMode ? 'border-indigo-700' : 'border-indigo-200'} pl-2`}>
                      {templates.find(t => t.name === selectedTemplate)?.description}
                    </p>
                    
                    <div className={`${theme.codeBlock} p-3 rounded-md overflow-x-auto border ${theme.border} relative group`}>
                      <code className={`text-xs font-mono break-all`}>
                        {syntaxHighlight(templates.find(t => t.name === selectedTemplate)?.pattern || '')}
                      </code>
                      <button 
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 dark:bg-gray-800 rounded-full p-1"
                        onClick={() => {
                          navigator.clipboard.writeText(templates.find(t => t.name === selectedTemplate)?.pattern || '');
                          logActivity("Copied template pattern");
                          
                          // Show temporary toast
                          const toast = document.createElement('div');
                          toast.className = `fixed bottom-4 right-4 text-${theme.text} px-4 py-2 rounded-md shadow-lg z-50 flex items-center`;
                          toast.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg> Pattern copied!';
                          document.body.appendChild(toast);
                          setTimeout(() => {
                            if (document.body.contains(toast)) {
                              document.body.removeChild(toast);
                            }
                          }, 2000);
                        }}
                      >
                        <Copy size={14} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" />
                      </button>
                    </div>
                    
                    {/* Apply button */}
                    <button
                      className={`mt-3 w-full py-1.5 px-3 rounded-md text-sm flex items-center justify-center ${theme.buttonPrimary} text-white`}
                      onClick={() => {
                        const templatePattern = templates.find(t => t.name === selectedTemplate)?.pattern;
                        if (templatePattern) {
                          setPattern(templatePattern);
                          logActivity(`Applied "${selectedTemplate}" pattern`);
                        }
                      }}
                    >
                      <Zap size={14} className="mr-1.5" />
                      Apply This Pattern
                    </button>
                  </div>
                )}
              </Card>
              
              <Card theme={theme} className="p-5" hover>
                <h3 className={`font-medium ${theme.text} text-lg mb-3 flex items-center`}>
                  <span className={`${theme.accentColor} mr-2`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Regex Insights
                </h3>
                
                {pattern ? (
                  <div>
                    {/* Simple visualization of pattern complexity */}
                    <div className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className={`text-xs ${theme.textSecondary}`}>Pattern complexity</span>
                        <span className={`text-xs ${theme.text} font-medium`}>
                          {pattern.length <= 20 ? 'Simple' : pattern.length <= 50 ? 'Moderate' : 'Complex'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            pattern.length <= 20 
                              ? 'bg-green-500' 
                              : pattern.length <= 50 
                                ? 'bg-amber-500' 
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, (pattern.length / 100) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className={`p-3 rounded-md ${theme.sidebar} flex justify-between items-center border ${theme.border}`}>
                        <span className={theme.textSecondary}>Pattern length:</span>
                        <span className={`${theme.text} font-mono ${pattern.length > 50 ? 'text-amber-500' : 'text-green-500'}`}>
                          {pattern.length} chars
                        </span>
                      </div>
                      
                      <div className={`p-3 rounded-md ${theme.sidebar} flex justify-between items-center border ${theme.border}`}>
                        <span className={theme.textSecondary}>Active flags:</span>
                        <div className="flex space-x-1">
                          {Object.entries(flags).map(([key, value]) => 
                            value && (
                              <span 
                                key={key} 
                                className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}
                              >
                                {key[0]}
                              </span>
                            )
                          )}
                          {!Object.values(flags).some(v => v) && (
                            <span className={`${theme.text} font-mono`}>none</span>
                          )}
                        </div>
                      </div>
                      
                      <div className={`p-3 rounded-md ${theme.sidebar} flex justify-between items-center border ${theme.border}`}>
                        <span className={theme.textSecondary}>Matches found:</span>
                        <span className={`${theme.text} font-mono ${matches.length > 0 ? 'text-green-500' : 'text-amber-500'}`}>
                          {matches.length}
                        </span>
                      </div>
                      
                      <div className={`p-3 rounded-md ${theme.sidebar} flex justify-between items-center border ${theme.border}`}>
                        <span className={theme.textSecondary}>Performance:</span>
                        <div className="flex items-center">
                          {tooManyMatches ? (
                            <span className="text-amber-500 flex items-center text-sm">
                              <AlertCircle size={14} className="mr-1" />
                              Slow
                            </span>
                          ) : (
                            <span className="text-green-500 flex items-center text-sm">
                              <Check size={14} className="mr-1" />
                              Good
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className={`p-3 rounded-md ${theme.sidebar} flex justify-between items-center border ${theme.border}`}>
                        <span className={theme.textSecondary}>Status:</span>
                        <span className={`font-medium flex items-center ${isValid 
                          ? 'text-green-500 dark:text-green-400' 
                          : 'text-red-500 dark:text-red-400'}`}>
                          {isValid ? (
                            <>
                              <Check size={14} className="mr-1" />
                              Valid
                            </>
                          ) : (
                            <>
                              <AlertCircle size={14} className="mr-1" />
                              Invalid
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center justify-center h-32 ${theme.textSecondary}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Enter a pattern to see insights</span>
                  </div>
                )}
                
                {/* Regex Pro Tip */}
                <div className={`mt-4 p-3 rounded-md border ${theme.border} ${darkMode ? 'bg-indigo-900/20' : 'bg-indigo-50'}`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Award size={16} className={theme.accentColor} />
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${theme.accentColor}`}>Pro Tip</h3>
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        <p>Use non-capturing groups <code className="font-mono px-1 bg-black/10 rounded">(?:pattern)</code> when you don't need to reference the group later for better performance.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* Activity Log */}
              <Card theme={theme} className={`p-5`} hover>
                <h3 className={`font-medium ${theme.text} text-lg mb-3 flex items-center justify-between`}>
                  <div className="flex items-center">
                    <span className={`${theme.accentColor} mr-2`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                    </span>
                    Activity Log
                  </div>
                  <div className="text-xs text-gray-400">Recent actions</div>
                </h3>
                
                {recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivity.map((activity, index) => (
                      <div 
                        key={index}
                        className={`${theme.sidebar} p-2 rounded-md flex items-start justify-between border ${theme.border} text-xs`}
                      >
                        <div className="flex items-center">
                          <div className={`w-1.5 h-1.5 rounded-full ${darkMode ? 'bg-indigo-400' : 'bg-indigo-500'} mr-2`}></div>
                          <span className={theme.text}>{activity.action}</span>
                        </div>
                        <span className={`${theme.textSecondary} ml-2`}>
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-3 flex items-center justify-center text-sm text-gray-500">
                    No recent activity to display
                  </div>
                )}
                
                {/* Quick Actions */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      setPattern('');
                      setTestString('');
                      setMatches([]);
                      setSelectedTemplate('');
                      logActivity("Reset all fields");
                    }}
                    className="w-full"
                  >
                    {<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>}
                    Reset All
                  </Button>
                  
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => {
                      if (pattern && isValid) {
                        const flagsStr = 
                          (flags.global ? 'g' : '') + 
                          (flags.ignoreCase ? 'i' : '') + 
                          (flags.multiline ? 'm' : '') +
                          (flags.sticky ? 'y' : '') +
                          (flags.unicode ? 'u' : '');
                        
                        const code = `// Regular Expression\nconst regex = /${pattern}/${flagsStr};\n\n// Test Code\nconst testString = \`${testString.replace(/`/g, '\\`')}\`;\nconst matches = [];\nlet match;\n\nwhile ((match = regex.exec(testString)) !== null) {\n  matches.push({\n    text: match[0],\n    index: match.index,\n    length: match[0].length\n  });\n  if (match.index === regex.lastIndex) regex.lastIndex++;\n}\n\nconsole.log(\`Found \${matches.length} matches:\`, matches);`;
                        
                        navigator.clipboard.writeText(code);
                        logActivity("Exported code to clipboard");
                        
                        // Show toast
                        const toast = document.createElement('div');
                        toast.className = `fixed bottom-4 right-4 ${theme.text} px-4 py-2 rounded-md shadow-lg z-50 flex items-center`;
                        toast.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg> Code copied to clipboard!';
                        document.body.appendChild(toast);
                        setTimeout(() => {
                          if (document.body.contains(toast)) {
                            document.body.removeChild(toast);
                          }
                        }, 2000);
                      }
                    }}
                    className="w-full"
                  >
                    {<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>}
                    Export Code
                  </Button>
                </div>
                
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Save the current regex for future reference
                      if (pattern && isValid) {
                        // This would normally save to localStorage or a database
                        alert("Pattern saved to your collection!");
                        logActivity("Saved pattern to collection");
                      }
                    }}
                    className="w-full"
                  >
                    <Save size={14} />
                    Save This Pattern
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
        
        {/* Keyboard shortcuts help */}
        <div className={`fixed bottom-6 right-6 ${isFullscreen ? '' : 'hidden md:block'}`}>
          <div className={` p-1.5 rounded-full shadow-lg cursor-pointer group relative`}>
            <Command size={18} className={theme.accentColor} />
            
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
              <div className={` ${theme.text} shadow-lg rounded-lg p-3 w-64 text-xs`}>
                <p className="font-medium mb-2">Keyboard Shortcuts</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span>Toggle help</span>
                    <kbd className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>⌘/</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Toggle dark mode</span>
                    <kbd className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>⌘D</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Toggle fullscreen</span>
                    <kbd className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>⌘F</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Toggle sidebar</span>
                    <kbd className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>⌘S</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* CSS for animations */}
        <style>{`
          @keyframes float {
            0% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(10px);
            }
            100% {
              transform: translateY(0);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
          
          .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-in-out;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(5px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fadeInOut {
            animation: fadeInOut 2s ease-in-out;
          }
          
          @keyframes fadeInOut {
            0% {
              opacity: 0;
              transform: translateY(-20px);
            }
            10% {
              opacity: 1;
              transform: translateY(0);
            }
            90% {
              opacity: 1;
              transform: translateY(0);
            }
            100% {
              opacity: 0;
              transform: translateY(-20px);
            }
          }
          
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          
          .animate-shimmer {
            animation: shimmer 2s infinite;
          }
          
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-track {
            background: ${darkMode ? '#1f2937' : '#f3f4f6'};
            border-radius: 10px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: ${darkMode ? '#4f46e5' : '#6366f1'};
            border-radius: 10px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: ${darkMode ? '#4338ca' : '#4f46e5'};
          }
        `}</style>
      </div>
    </div>
  );
};

// Mock for compilation - replace with actual saved colors in your implementation
const savedColors: string[] = [];

export default RegexTester;