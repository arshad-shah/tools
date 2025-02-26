/* eslint-disable @typescript-eslint/no-unused-vars */
// Part 5: Main Component Assembly
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertCircle, Check, Copy, Info, 
  Code, Maximize2, X, Sun, Moon,
  GitBranch,Heart, Star,
} from 'lucide-react';
import { Button, Card, Flags, Match, RegexTemplate, Theme } from './InterfaceAndUtilities';
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
    bg: darkMode ? 'bg-gray-900' : 'bg-gray-50',
    text: darkMode ? 'text-white' : 'text-gray-800',
    textSecondary: darkMode ? 'text-gray-300' : 'text-gray-500',
    border: darkMode ? 'border-gray-700' : 'border-gray-200',
    sidebar: darkMode ? 'bg-gray-800' : 'bg-white',
    input: darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300',
    highlight: darkMode ? 'bg-indigo-900/60 text-indigo-200' : 'bg-indigo-100 text-indigo-800',
    buttonPrimary: darkMode 
      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' 
      : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600',
    buttonSecondary: darkMode 
      ? 'bg-gray-700 hover:bg-gray-600' 
      : 'bg-white hover:bg-gray-300 border border-gray-200',
    flagActive: darkMode 
      ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white' 
      : 'bg-gradient-to-r from-blue-400 to-indigo-400 text-white',
    flagInactive: darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700',
    card: darkMode ? 'bg-gray-800' : 'bg-white',
    codeBlock: darkMode ? 'bg-gray-900' : 'bg-gray-50',
    matchHighlight: darkMode ? 'bg-indigo-900/40' : 'bg-indigo-50',
    gradient: darkMode 
      ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-black' 
      : 'bg-gradient-to-br from-white via-gray-50 to-gray-100',
    headerGradient: darkMode 
      ? 'bg-gradient-to-r from-indigo-800 to-purple-900' 
      : 'bg-gradient-to-r from-indigo-600 to-purple-700',
    accentColor: darkMode ? 'text-indigo-400' : 'text-indigo-600',
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
        } else {
          setMatches([]);
        }
      } catch (error) {
        setIsValid(false);
        setMatches([]);
        setTooManyMatches(false);
      }
    }, 0);
    
    // Cleanup function
    return () => clearTimeout(timeoutId);
  }, [pattern, testString, flags]);

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

  // Main render
  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : ''} ${theme.bg} transition-colors duration-300 ease-in-out min-h-screen`}>
      <div className={`flex flex-col w-full ${isFullscreen ? 'h-full' : 'max-w-6xl mx-auto'} p-4 ${theme.bg} rounded-xl shadow-lg`}>
        {/* Enhanced header with animated gradient background */}
        <header className={`${theme.headerGradient} mb-6 rounded-xl p-5 shadow-md text-white relative overflow-hidden transition-all duration-300`}>
          <div className="absolute inset-0 bg-black opacity-50"></div>
          
          {/* Animated dots background effect */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
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
          
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <div className="mr-3 p-2 bg-white/10 rounded-lg">
                  <Code className="text-indigo-200" size={28} />
                </div>
                RegEx Studio
                <span className="ml-2 text-xs bg-indigo-900 px-2 py-1 rounded-full font-normal">PRO</span>
              </h1>
              <p className="text-indigo-200 mt-1">Build, test, and debug your regular expressions with real-time feedback</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                theme={theme}
                variant="outline"
                onClick={() => setDarkMode(!darkMode)}
                className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20"
                icon={darkMode ? <Sun size={18} /> : <Moon size={18} />}
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              />
              
              <Button
                theme={theme}
                variant="outline"
                onClick={toggleFullscreen}
                className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20"
                icon={isFullscreen ? <X size={18} /> : <Maximize2 size={18} />}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              />
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
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card theme={theme} className="p-5" hover>
              <div className="flex items-center mb-3 justify-between">
                <label className={`font-medium ${theme.text} text-lg flex items-center`}>
                  <GitBranch size={18} className={`mr-2 ${theme.accentColor}`} />
                  Regular Expression
                </label>
                <Button 
                  theme={theme}
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHelp(!showHelp)}
                  icon={<Info size={16} />}
                >
                  {showHelp ? 'Hide Help' : 'Show Help'}
                </Button>
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
                          <div className="flex items-center justify-between">
                            <span className={`${darkMode ? 'text-green-400' : 'text-green-600'} font-medium flex items-center`}>
                              <Check size={18} className="mr-2" />
                              Found {matches.length} match{matches.length !== 1 ? 'es' : ''}
                            </span>
                            
                            {/* Match rate animation */}
                            <div className="flex items-center">
                              <span className={`text-xs ${theme.textSecondary} mr-2`}>Match rate:</span>
                              <div className="h-2 w-24 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                                  style={{ 
                                    width: `${((matches.reduce((sum, m) => sum + m.length, 0) / testString.length) * 100)}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs ml-2">
                                {((matches.reduce((sum, m) => sum + m.length, 0) / testString.length) * 100).toFixed(1)}%
                              </span>
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
                            <div className="text-center text-amber-500 text-sm p-2 bg-amber-500/10 rounded">
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
                <div className={`${theme.sidebar} rounded-md p-4 min-h-32 border ${theme.border}`}>
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
          
          <div className="space-y-6">
            <Card theme={theme} className="p-5" hover>
              <h3 className={`font-medium ${theme.text} text-lg mb-3 flex items-center`}>
                <span className={`${theme.accentColor} mr-2`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                </span>
                Pattern Library
              </h3>
              
              {/* Filter buttons */}
              <div className="flex flex-wrap items-center mb-3 -mx-1 -my-1">
                <div className="px-1 py-1">
                  <button 
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      filterCategory === 'all' 
                        ? `${darkMode ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'}`
                        : `${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'} hover:bg-gray-200`
                    }`}
                    onClick={() => setFilterCategory('all')}
                  >
                    All
                  </button>
                </div>
                <div className="px-1 py-1">
                  <button 
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      filterCategory === 'web' 
                        ? `${darkMode ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'}`
                        : `${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'} hover:bg-gray-200`
                    }`}
                    onClick={() => setFilterCategory('web')}
                  >
                    Web
                  </button>
                </div>
                <div className="px-1 py-1">
                  <button 
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      filterCategory === 'validation' 
                        ? `${darkMode ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'}`
                        : `${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'} hover:bg-gray-200`
                    }`}
                    onClick={() => setFilterCategory('validation')}
                  >
                    Validation
                  </button>
                </div>
                <div className="px-1 py-1">
                  <button 
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      filterCategory === 'format' 
                        ? `${darkMode ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'}`
                        : `${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'} hover:bg-gray-200`
                    }`}
                    onClick={() => setFilterCategory('format')}
                  >
                    Format
                  </button>
                </div>
                <div className="px-1 py-1">
                  <button 
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      filterCategory === 'common' 
                        ? `${darkMode ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'}`
                        : `${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'} hover:bg-gray-200`
                    }`}
                    onClick={() => setFilterCategory('common')}
                  >
                    Common
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <select
                  value={selectedTemplate}
                  onChange={handleTemplateChange}
                  className={`w-full p-3 border ${theme.input} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm`}
                >
                  <option value="">Select a template...</option>
                  {templates
                    .filter(t => filterCategory === 'all' || t.category === filterCategory)
                    .map(template => (
                      <option key={template.name} value={template.name}>
                        {template.name}
                      </option>
                    ))
                  }
                </select>
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
                  <p className={`${theme.textSecondary} mb-3 italic text-xs border-l-2 border-indigo-300 dark:border-indigo-700 pl-2`}>
                    {templates.find(t => t.name === selectedTemplate)?.description}
                  </p>
                  
                  <div className={`${theme.codeBlock} p-3 rounded-md overflow-x-auto border ${theme.border} relative group`}>
                    <code className={`text-xs font-mono break-all`}>
                      {syntaxHighlight(templates.find(t => t.name === selectedTemplate)?.pattern || '')}
                    </code>
                    <button 
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        navigator.clipboard.writeText(templates.find(t => t.name === selectedTemplate)?.pattern || '');
                        // Show temporary toast
                        const toast = document.createElement('div');
                        toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
                        toast.innerText = 'Pattern copied to clipboard!';
                        document.body.appendChild(toast);
                        setTimeout(() => {
                          if (document.body.contains(toast)) {
                            document.body.removeChild(toast);
                          }
                        }, 2000);
                      }}
                    >
                      <Copy size={14} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                    </button>
                  </div>
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
                Regex Stats
              </h3>
              
              {pattern ? (
                <div className="space-y-3">
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
                            className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-700'}`}
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
                    <span className={theme.textSecondary}>Match rate:</span>
                    <span className={`${theme.text} font-mono`}>
                      {testString 
                        ? `${((matches.reduce((sum, m) => sum + m.length, 0) / testString.length) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </span>
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
              ) : (
                <div className={`flex flex-col items-center justify-center h-32 ${theme.textSecondary}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Enter a pattern to see statistics</span>
                </div>
              )}
              
              {/* Regex Pro Tip */}
              <div className={`mt-5 p-3 rounded-md border ${theme.border} ${darkMode ? 'bg-indigo-900/20' : 'bg-indigo-50'}`}>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${theme.accentColor}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${theme.accentColor}`}>Pro Tip</h3>
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      <p>Use non-capturing groups <code className="font-mono">(?:pattern)</code> when you don't need to retrieve the group's content for better performance.</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* New: Quick Actions Card */}
            <Card theme={theme} className="p-5" hover>
              <h3 className={`font-medium ${theme.text} text-lg mb-3 flex items-center`}>
                <span className={`${theme.accentColor} mr-2`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </span>
                Quick Actions
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  theme={theme} 
                  variant="secondary" 
                  size="md"
                  onClick={() => {
                    setPattern('');
                    setTestString('');
                    setMatches([]);
                    setSelectedTemplate('');
                  }}
                  className="w-full"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>}
                >
                  Reset All
                </Button>
                
                <Button 
                  theme={theme} 
                  variant="primary" 
                  size="md"
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
                      
                      // Show toast
                      const toast = document.createElement('div');
                      toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center';
                      toast.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg> Code copied to clipboard!';
                      document.body.appendChild(toast);
                      setTimeout(() => {
                        if (document.body.contains(toast)) {
                          document.body.removeChild(toast);
                        }
                      }, 2000);
                    }
                  }}
                  className="w-full"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>}
                >
                  Export Code
                </Button>
              </div>
              
              <div className="mt-2">
                <Button 
                  theme={theme} 
                  variant="outline" 
                  size="md"
                  onClick={() => {
                    // Make sure we have a valid URL
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
                      } catch (error) {
                        console.error('Failed to open regex101:', error);
                      }
                    }
                  }}
                  className="w-full"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>}
                >
                  Open in Regex101
                </Button>
              </div>
            </Card>
          </div>
        </div>
        
        {/* Footer with animation */}
        <footer className={`mt-8 p-4 text-center border-t ${theme.border} ${theme.textSecondary} text-xs`}>
          <p>
            RegEx Studio - Build, test, and debug your regular expressions with confidence
          </p>
          <div className="flex justify-center mt-2 space-x-3">
            <Heart size={14} className="text-pink-500 animate-pulse" />
            <Star size={14} className="text-yellow-500" />
            <Star size={14} className="text-yellow-500" />
            <Star size={14} className="text-yellow-500" />
            <Star size={14} className="text-yellow-500" />
            <Star size={14} className="text-yellow-500" />
          </div>
        </footer>
        
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
          
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-track {
            background: ${darkMode ? '#374151' : '#f3f4f6'};
            border-radius: 10px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: ${darkMode ? '#4f46e5' : '#6366f1'};
            border-radius: 10px;
          }
        `}</style>
      </div>
    </div>
  );
};

export default RegexTester;