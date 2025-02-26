// Part 4: Help Content and UI Components
import React from 'react';
import { Info, Star } from 'lucide-react';
import { Badge, Button, Card, Match, Theme } from './InterfaceAndUtilities';

/**
 * Component for rendering the regex help content
 */
export const RegexHelpContent: React.FC<{ theme: Theme }> = ({ theme }) => {
  return (
    <div className={`${theme.sidebar} p-4 rounded-lg border ${theme.border} mb-4 text-sm`}>
      <h3 className={`font-bold mb-3 ${theme.text} flex items-center`}>
        <Info size={16} className="mr-2" />
        Regex Quick Reference
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card theme={theme} className="p-3">
          <h4 className={`font-semibold mb-2 ${theme.text} ${theme.accentColor}`}>
            Basic Patterns
          </h4>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>.</span>
              <span>Any character except newline</span>
            </li>
            <li className="flex items-start">
              <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>^</span>
              <span>Start of string</span>
            </li>
            <li className="flex items-start">
              <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>$</span>
              <span>End of string</span>
            </li>
            <li className="flex items-start">
              <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>*</span>
              <span>0 or more of previous</span>
            </li>
            <li className="flex items-start">
              <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>+</span>
              <span>1 or more of previous</span>
            </li>
            <li className="flex items-start">
              <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>?</span>
              <span>0 or 1 of previous</span>
            </li>
          </ul>
        </Card>
        
        <Card theme={theme} className="p-3">
          <h4 className={`font-semibold mb-2 ${theme.text} ${theme.accentColor}`}>
            Character Classes
          </h4>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>\d</span>
              <span>Digit (0-9)</span>
            </li>
            <li className="flex items-start">
              <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>\w</span>
              <span>Word character (a-z, A-Z, 0-9, _)</span>
            </li>
            <li className="flex items-start">
              <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>\s</span>
              <span>Whitespace</span>
            </li>
            <li className="flex items-start">
              <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>[abc]</span>
              <span>Any of a, b, or c</span>
            </li>
            <li className="flex items-start">
              <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>[^abc]</span>
              <span>Any except a, b, or c</span>
            </li>
            <li className="flex items-start">
              <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>{"{n,m}"}</span>
              <span>Between n and m occurrences</span>
            </li>
          </ul>
        </Card>
        
        <Card theme={theme} className="p-3 md:col-span-2">
          <h4 className={`font-semibold mb-2 ${theme.text} ${theme.accentColor}`}>
            Groups and Assertions
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>(abc)</span>
                <span>Capture group</span>
              </li>
              <li className="flex items-start">
                <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>(?:abc)</span>
                <span>Non-capturing group</span>
              </li>
            </ul>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>(?=abc)</span>
                <span>Positive lookahead</span>
              </li>
              <li className="flex items-start">
                <span className={`${theme.codeBlock} px-1.5 py-0.5 rounded mr-2 font-mono`}>(?!abc)</span>
                <span>Negative lookahead</span>
              </li>
            </ul>
          </div>
        </Card>
      </div>
      
      <div className="mt-4 border-t border-dashed pt-3 flex items-center justify-between">
        <span className={`${theme.accentColor} text-xs flex items-center`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
            <path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" />
          </svg>
          Pro tip: Use the syntax highlighting to identify different parts of your regex pattern!
        </span>
        <Button 
          theme={theme} 
          variant="outline" 
          size="sm" 
          onClick={() => window.open('https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions', '_blank')}
        >
          Learn More
        </Button>
      </div>
    </div>
  );
};

/**
 * Component for rendering an individual match
 */
export const MatchItem: React.FC<{
  match: Match;
  index: number;
  expandedMatch: number | null;
  setExpandedMatch: React.Dispatch<React.SetStateAction<number | null>>;
  theme: Theme;
  onCopyMatch: (match: Match) => void;
}> = ({ match, index, expandedMatch, setExpandedMatch, theme, onCopyMatch }) => {
  const isExpanded = expandedMatch === index;
  
  return (
    <div 
      className={`${theme.card} p-3 rounded-md border ${theme.border} text-sm ${
        isExpanded 
          ? `ring-2 ${theme.bg === 'bg-gray-900' ? 'ring-indigo-600' : 'ring-indigo-400'} shadow-md` 
          : ''
      } transition-all duration-200 hover:shadow-md cursor-pointer`}
      onClick={() => setExpandedMatch(isExpanded ? null : index)}
    >
      <div className="flex items-center justify-between">
        <div className={`font-medium ${theme.text} flex items-center`}>
          <Badge 
            variant="info" 
            size="sm"
            icon={<Star size={10} />}
          >
            Match #{index + 1}
          </Badge>
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Length: {match.length}
          </span>
        </div>
        <div className="flex items-center">
          <Button 
            theme={theme}
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onCopyMatch(match);
            }}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
              <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
            </svg>}
            title="Copy match"
            className="!p-1"
          />
          {isExpanded ? 
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${theme.textSecondary}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg> : 
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${theme.textSecondary}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          }
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-3 space-y-3 text-xs animate-fadeIn">
          <div className={`p-2 rounded ${theme.sidebar} ${theme.text} font-mono break-all border ${theme.border}`}>
            {match.text}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-2 rounded ${theme.sidebar} flex justify-between items-center border ${theme.border}`}>
              <span className={theme.textSecondary}>Start Index:</span>{' '}
              <span className={`${theme.text} font-mono`}>{match.index}</span>
            </div>
            <div className={`p-2 rounded ${theme.sidebar} flex justify-between items-center border ${theme.border}`}>
              <span className={theme.textSecondary}>End Index:</span>{' '}
              <span className={`${theme.text} font-mono`}>{match.index + match.length}</span>
            </div>
          </div>
          
          {match.groups && match.groups.length > 0 && (
            <div className="mt-1">
              <div className={`font-medium ${theme.text} mb-1 flex items-center`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 ${theme.accentColor}`} viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
                Capture Groups:
              </div>
              <div className={`${theme.sidebar} rounded-md p-2 border ${theme.border}`}>
                {match.groups.map((group, i) => (
                  <div key={i} className={`flex justify-between items-center py-1.5 border-b last:border-0 border-dashed ${theme.border}`}>
                    <Badge variant="default" size="sm">Group {i + 1}</Badge>
                    <span className={`${theme.text} font-mono ${theme.codeBlock} px-2 py-0.5 rounded`}>
                      {group || <span className="text-gray-400 italic">empty</span>}
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

/**
 * Component for rendering flag buttons
 */
export const FlagButtons: React.FC<{
  flags: { global: boolean; ignoreCase: boolean; multiline: boolean; sticky: boolean; unicode: boolean };
  onFlagChange: (flag: 'global' | 'ignoreCase' | 'multiline' | 'sticky' | 'unicode') => void;
  theme: Theme;
}> = ({ flags, onFlagChange, theme }) => {
  return (
    <div className="flex items-center space-x-1 text-xs">
      <button
        onClick={() => onFlagChange('global')}
        className={`px-3 py-2 rounded-md ${
          flags.global ? theme.flagActive : theme.flagInactive
        } transition-colors`}
        title="Global search"
      >
        g
      </button>
      <button
        onClick={() => onFlagChange('ignoreCase')}
        className={`px-3 py-2 rounded-md ${
          flags.ignoreCase ? theme.flagActive : theme.flagInactive
        } transition-colors`}
        title="Case insensitive"
      >
        i
      </button>
      <button
        onClick={() => onFlagChange('multiline')}
        className={`px-3 py-2 rounded-md ${
          flags.multiline ? theme.flagActive : theme.flagInactive
        } transition-colors`}
        title="Multiline"
      >
        m
      </button>
      <button
        onClick={() => onFlagChange('sticky')}
        className={`px-3 py-2 rounded-md ${
          flags.sticky ? theme.flagActive : theme.flagInactive
        } transition-colors`}
        title="Sticky"
      >
        y
      </button>
      <button
        onClick={() => onFlagChange('unicode')}
        className={`px-3 py-2 rounded-md ${
          flags.unicode ? theme.flagActive : theme.flagInactive
        } transition-colors`}
        title="Unicode"
      >
        u
      </button>
    </div>
  );
};

/**
 * Component for rendering the pattern input section
 */
export const PatternInputSection: React.FC<{
  pattern: string;
  setPattern: React.Dispatch<React.SetStateAction<string>>;
  isValid: boolean;
  flags: { global: boolean; ignoreCase: boolean; multiline: boolean; sticky: boolean; unicode: boolean };
  onFlagChange: (flag: 'global' | 'ignoreCase' | 'multiline' | 'sticky' | 'unicode') => void;
  copied: boolean;
  onCopyToClipboard: () => void;
  theme: Theme;
}> = ({ 
  pattern, 
  setPattern, 
  isValid, 
  flags, 
  onFlagChange, 
  copied, 
  onCopyToClipboard, 
  theme,
}) => {
  return (
    <div className="flex items-center space-x-1">
      <span className={`text-xl font-mono ${theme.textSecondary}`}>/</span>
      <div className="flex-grow relative">
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
            isValid 
              ? `${theme.input}`
              : `${theme.bg === 'bg-gray-900' ? 'border-red-700 bg-red-900/30' : 'border-red-300 bg-red-50'}`
          } transition-colors`}
          placeholder="Enter regex pattern..."
        />
        
        {!isValid && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      <span className={`text-xl font-mono ${theme.textSecondary}`}>/</span>
      <FlagButtons flags={flags} onFlagChange={onFlagChange} theme={theme} />
      <Button
        theme={theme}
        variant="ghost"
        onClick={onCopyToClipboard}
        className="ml-2"
        icon={copied ? 
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg> : 
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
            <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
          </svg>
        }
        title="Copy regex"
      />
    </div>
  );
};

/**
 * Component for rendering tab buttons
 */
export const TabButtons: React.FC<{
  activeTab: 'matches' | 'preview';
  setActiveTab: React.Dispatch<React.SetStateAction<'matches' | 'preview'>>;
  theme: Theme;
}> = ({ activeTab, setActiveTab, theme }) => {
  return (
    <div className={`flex rounded-md overflow-hidden border ${theme.border}`}>
      <button
        onClick={() => setActiveTab('matches')}
        className={`px-3 py-1.5 text-sm flex items-center ${
          activeTab === 'matches' 
            ? `${theme.bg === 'bg-gray-900' ? 'bg-indigo-600' : 'bg-indigo-500'} text-white` 
            : `${theme.sidebar} ${theme.textSecondary}`
        } transition-colors`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
        Matches
      </button>
      <button
        onClick={() => setActiveTab('preview')}
        className={`px-3 py-1.5 text-sm flex items-center ${
          activeTab === 'preview' 
            ? `${theme.bg === 'bg-gray-900' ? 'bg-indigo-600' : 'bg-indigo-500'} text-white` 
            : `${theme.sidebar} ${theme.textSecondary}`
        } transition-colors`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
        Preview
      </button>
    </div>
  );
};

/**
 * Component for rendering visual metrics in the header
 */
export const VisualMetrics: React.FC<{
  isValid: boolean;
  matches: Match[];
  flags: { global: boolean; ignoreCase: boolean; multiline: boolean; sticky: boolean; unicode: boolean };
  visualMode: boolean;
  setVisualMode: React.Dispatch<React.SetStateAction<boolean>>;
  theme: Theme;
}> = ({ isValid, matches, flags, visualMode, setVisualMode, theme }) => {
  return (
    <div className="flex flex-wrap mt-4 -mx-2">
      <div className="px-2 py-1">
        <div className="bg-white/10 px-3 py-1.5 rounded-lg flex items-center">
          <div className={`w-3 h-3 rounded-full ${isValid ? 'bg-green-400' : 'bg-red-400'} mr-2`}></div>
          <span className="text-xs text-white/80 mr-1">Regex Status:</span>
          <span className="text-sm font-medium">
            {isValid ? 'Valid' : 'Invalid'}
          </span>
        </div>
      </div>
      
      <div className="px-2 py-1">
        <div className="bg-white/10 px-3 py-1.5 rounded-lg flex items-center">
          <div className="w-3 h-3 rounded-full bg-indigo-400 mr-2"></div>
          <span className="text-xs text-white/80 mr-1">Matches:</span>
          <span className="text-sm font-medium">{matches.length}</span>
        </div>
      </div>
      
      <div className="px-2 py-1">
        <div className="bg-white/10 px-3 py-1.5 rounded-lg flex items-center">
          <div className="w-3 h-3 rounded-full bg-purple-400 mr-2"></div>
          <span className="text-xs text-white/80 mr-1">Flags:</span>
          <span className="text-sm font-medium font-mono">
            {(flags.global ? 'g' : '') + 
             (flags.ignoreCase ? 'i' : '') + 
             (flags.multiline ? 'm' : '') +
             (flags.sticky ? 'y' : '') +
             (flags.unicode ? 'u' : '') || 'none'}
          </span>
        </div>
      </div>
      
      <div className="px-2 py-1 ml-auto">
        <Button
          theme={theme}
          variant="outline"
          onClick={() => setVisualMode(!visualMode)}
          className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20"
          icon={visualMode ? 
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg> : 
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
            </svg>
          }
        >
          Visual Mode
        </Button>
      </div>
    </div>
  );
};