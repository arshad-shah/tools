// Part 3: Event Handlers and Utility Functions
import React, { JSX, useCallback } from 'react';
import { Flags, Match, RegexTemplate, Theme } from './InterfaceAndUtilities';
import { Award, Star, ThumbsUp, Zap } from 'lucide-react';

// These functions would be inside the RegexTester component
// Exporting them here for clarity

/**
 * Handle template change event
 */
export const useTemplateChangeHandler = (
  templates: RegexTemplate[],
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string>>,
  setPattern: React.Dispatch<React.SetStateAction<string>>
) => {
  return useCallback((e: React.ChangeEvent<HTMLSelectElement>): void => {
    const templateName = e.target.value;
    setSelectedTemplate(templateName);
    
    if (templateName) {
      const selected = templates.find(t => t.name === templateName);
      if (selected) {
        setPattern(selected.pattern);
      }
    }
  }, [templates, setSelectedTemplate, setPattern]);
};

/**
 * Handle flag toggle
 */
export const useFlagChangeHandler = (
  setFlags: React.Dispatch<React.SetStateAction<Flags>>
) => {
  return useCallback((flag: keyof Flags): void => {
    setFlags(prev => ({
      ...prev,
      [flag]: !prev[flag]
    }));
  }, [setFlags]);
};

/**
 * Copy regex to clipboard
 */
export const useCopyToClipboard = (
  pattern: string,
  flags: Flags,
  setCopied: React.Dispatch<React.SetStateAction<boolean>>
) => {
  return useCallback((): void => {
    // Prevent errors in environments without clipboard API
    if (!navigator.clipboard) {
      console.error('Clipboard API not available');
      return;
    }
    
    const flagsStr: string = 
      (flags.global ? 'g' : '') + 
      (flags.ignoreCase ? 'i' : '') + 
      (flags.multiline ? 'm' : '') +
      (flags.sticky ? 'y' : '') +
      (flags.unicode ? 'u' : '');
    
    const regexString = `/${pattern}/${flagsStr}`;
    
    // Use try/catch to handle potential clipboard API errors
    try {
      navigator.clipboard.writeText(regexString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [pattern, flags, setCopied]);
};

/**
 * Copy match data to clipboard
 */
export const useCopyMatchData = () => {
  return useCallback((match: Match): void => {
    if (!navigator.clipboard) {
      console.error('Clipboard API not available');
      return;
    }
    
    try {
      navigator.clipboard.writeText(match.text);
      
      // Visual feedback (simplified from original with direct DOM manipulation)
      const showCopiedToast = () => {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md z-50 flex items-center shadow-lg animate-fadeInOut';
        toast.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg> Copied!';
        document.body.appendChild(toast);
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 2000);
      };
      
      showCopiedToast();
    } catch (error) {
      console.error('Failed to copy match data:', error);
    }
  }, []);
};

/**
 * Get difficulty badge
 */
export const useDifficultyBadge = (theme: Theme) => {
  return useCallback((difficulty: RegexTemplate['difficulty']): JSX.Element | null => {
    const BadgeComponent: React.FC<{
      variant: 'success' | 'warning' | 'error';
      size: 'sm';
      icon: JSX.Element;
      children: React.ReactNode;
    }> = ({ variant, icon, children }) => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shadow-sm 
        ${variant === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : 
          variant === 'warning' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : 
          'bg-gradient-to-r from-red-500 to-rose-600 text-white'}`}>
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </span>
    );
    
    switch(difficulty) {
      case 'beginner':
        return <BadgeComponent variant="success" size="sm" icon={<ThumbsUp size={10} />}>Easy</BadgeComponent>;
      case 'intermediate':
        return <BadgeComponent variant="warning" size="sm" icon={<Award size={10} />}>Medium</BadgeComponent>;
      case 'advanced':
        return <BadgeComponent variant="error" size="sm" icon={<Zap size={10} />}>Advanced</BadgeComponent>;
      default:
        return null;
    }
  }, [theme]);
};

/**
 * Get category badge
 */
export const useCategoryBadge = (theme: Theme) => {
  return useCallback((category: RegexTemplate['category']): JSX.Element | null => {
    const BadgeComponent: React.FC<{
      variant: 'info' | 'success' | 'warning' | 'default'; 
      size: 'sm';
      children: React.ReactNode;
    }> = ({ variant, children }) => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shadow-sm 
        ${variant === 'info' ? 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white' : 
          variant === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : 
          variant === 'warning' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : 
          'bg-gradient-to-r from-slate-400 to-slate-500 text-white'}`}>
        {children}
      </span>
    );
    
    switch(category) {
      case 'web':
        return <BadgeComponent variant="info" size="sm">Web</BadgeComponent>;
      case 'validation':
        return <BadgeComponent variant="success" size="sm">Validation</BadgeComponent>;
      case 'format':
        return <BadgeComponent variant="warning" size="sm">Format</BadgeComponent>;
      case 'common':
        return <BadgeComponent variant="default" size="sm">Common</BadgeComponent>;
      default:
        return null;
    }
  }, [theme]);
};

export const useSyntaxHighlighter = (tokenPatterns: { type: string; pattern: RegExp; class: string }[]) => {
  return useCallback((code: string): React.ReactNode => {
    // Don't process empty code
    if (!code) return code;
    
    // For very long patterns, skip complex highlighting to improve performance
    if (code.length > 500) {
      return <span className="text-gray-600">{code}</span>;
    }
    
    // Find all matches for all token types
    const allMatches: {index: number, length: number, class: string}[] = [];
    
    // Process each token pattern
    tokenPatterns.forEach(({type, pattern, class: className}) => {
      // Create a new RegExp instance for each use to avoid lastIndex issues
      const regex = new RegExp(pattern.source, pattern.flags);
      
      let match;
      try {
        const testString = code;
        const startIndex = 0;
        
        // Find all matches using a safer approach
        while ((match = regex.exec(testString)) !== null) {
          allMatches.push({
            index: startIndex + match.index,
            length: match[0].length,
            class: className
          });
          
          // Prevent infinite loop for zero-length matches (like /^/ or /$/)
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
          
          // Safety mechanism to prevent excessive iterations
          if (regex.lastIndex > testString.length || allMatches.length > 1000) {
            break;
          }
        }
      } catch (err) {
        console.error(`Error in syntax highlighting for ${type}:`, err);
      }
    });
    
    // Sort matches by their position in the string
    allMatches.sort((a, b) => a.index - b.index);
    
    // Apply highlighting from end to start to avoid index shifting
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    if (allMatches.length === 0) {
      parts.push(<span key="text-default">{code}</span>);
    } else {
      allMatches.forEach((match, i) => {
        if (match.index > lastIndex) {
          parts.push(
            <span key={`text-${i}`}>{code.substring(lastIndex, match.index)}</span>
          );
        }
        
        parts.push(
          <span 
            key={`syntax-${i}`} 
            className={match.class}
          >
            {code.substring(match.index, match.index + match.length)}
          </span>
        );
        
        lastIndex = match.index + match.length;
      });
      
      if (lastIndex < code.length) {
        parts.push(
          <span key="text-last">{code.substring(lastIndex)}</span>
        );
      }
    }
    
    return <>{parts}</>;
  }, [tokenPatterns]);
};
/**
 * Renders highlighted text with performance optimizations
 */
export const useHighlightedTextRenderer = (
  testString: string,
  matches: Match[],
  expandedMatch: number | null,
  theme: Theme,
  setExpandedMatch: React.Dispatch<React.SetStateAction<number | null>>
) => {
  return useCallback((): React.ReactNode => {
    if (!testString || matches.length === 0) return testString;
    
    // Limit the number of matches to display for performance
    const MAX_HIGHLIGHTED_MATCHES = 100;
    const displayMatches = matches.slice(0, MAX_HIGHLIGHTED_MATCHES);
    
    let lastIndex = 0;
    const elements: React.ReactNode[] = [];
    
    displayMatches.forEach((match, i) => {
      // Add text before the match
      if (match.index > lastIndex) {
        elements.push(
          <span key={`text-${i}`}>
            {testString.substring(lastIndex, match.index)}
          </span>
        );
      }
      
      // Add the highlighted match with enhanced styling
      elements.push(
        <span 
          key={`match-${i}`} 
          className={`${theme.highlight} rounded px-1 cursor-pointer transition-all duration-300 
            hover:scale-105 hover:shadow-md relative group`}
          onClick={() => setExpandedMatch(expandedMatch === i ? null : i)}
        >
          {testString.substring(match.index, match.index + match.length)}
          
          {/* Show floating info badge on hover */}
          <span className={`absolute -top-7 left-1/2 transform -translate-x-1/2 
            bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 
            transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10
            shadow-lg scale-0 group-hover:scale-100`}
          >
            Match #{i+1} | Pos: {match.index}
          </span>
        </span>
      );
      
      lastIndex = match.index + match.length;
    });
    
    // Add any remaining text
    if (lastIndex < testString.length) {
      elements.push(
        <span key="text-last">
          {testString.substring(lastIndex)}
        </span>
      );
    }
    
    // Add a message if we're not showing all matches
    if (matches.length > MAX_HIGHLIGHTED_MATCHES) {
      elements.push(
        <span key="more-matches" className="text-gray-500 ml-2 text-xs italic">
          (+ {matches.length - MAX_HIGHLIGHTED_MATCHES} more matches not shown for performance)
        </span>
      );
    }
    
    return <>{elements}</>;
  }, [testString, matches, expandedMatch, theme, setExpandedMatch]);
};

/**
 * Renders visual matches with performance optimizations
 */
export const useVisualMatchesRenderer = (
  visualMode: boolean,
  testString: string,
  matches: Match[],
  expandedMatch: number | null,
  theme: Theme,
  setExpandedMatch: React.Dispatch<React.SetStateAction<number | null>>
) => {
  return useCallback((): React.ReactNode => {
    if (!visualMode || !testString || matches.length === 0) return null;
    
    // Limit the number of visual matches for performance
    const MAX_VISUAL_MATCHES = 50;
    const displayMatches = matches.slice(0, MAX_VISUAL_MATCHES);
    
    return (
      <div className={`relative border ${theme.border} rounded-lg p-4 mt-4 ${theme.sidebar} 
        ${matches.length > MAX_VISUAL_MATCHES ? 'border-amber-500' : ''}`}>
        {matches.length > MAX_VISUAL_MATCHES && (
          <div className="text-amber-500 text-xs mb-2 bg-amber-100 dark:bg-amber-900/30 p-2 rounded">
            Showing first {MAX_VISUAL_MATCHES} of {matches.length} matches for performance
          </div>
        )}
        
        <div className="w-full whitespace-pre-wrap break-words relative overflow-hidden min-h-[100px]">
          {/* Background layer with the original text */}
          <div className={`absolute w-full h-full ${theme.textSecondary} opacity-30`}>
            {testString.length > 1000 ? testString.substring(0, 1000) + '...' : testString}
          </div>
          
          {/* Highlight boxes for matches */}
          {displayMatches.map((match, i) => {
            // Calculate position based on monospace font approximation
            // This is an approximation and might need adjustment based on your font
            const charsPerLine = 80; // Adjust based on your container width
            const line = Math.floor(match.index / charsPerLine);
            const column = match.index % charsPerLine;
            
            return (
              <div 
                key={`visual-match-${i}`}
                className={`absolute rounded-md ${
                  i === expandedMatch ? 'ring-2 ring-indigo-500 z-20' : 'z-10'
                } transition-all duration-300 cursor-pointer
                ${theme.bg === 'bg-gray-900' 
                  ? 'bg-gradient-to-r from-indigo-800/40 to-purple-800/40 border border-indigo-700' 
                  : 'bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200'
                }`}
                style={{
                  top: `${line * 1.5}rem`,
                  left: `${column * 0.6}rem`,
                  width: `${Math.min(match.length * 0.6, 100)}rem`, // Limit width
                  height: '1.5rem',
                }}
                onClick={() => setExpandedMatch(i === expandedMatch ? null : i)}
              >
                <div className="absolute -top-6 left-0 text-xs flex items-center">
                  <span className="inline-flex items-center rounded-full text-xs px-2 py-0.5 font-medium shadow-sm bg-gradient-to-r from-blue-400 to-indigo-500 text-white">
                    <Star size={10} className="mr-1"/>
                    #{i+1}
                  </span>
                </div>
              </div>
            );
          })}
          
          {/* Actual text on top for proper rendering (invisible) */}
          <div className="invisible">
            {testString.length > 1000 ? testString.substring(0, 1000) + '...' : testString}
          </div>
        </div>
      </div>
    );
  }, [visualMode, testString, matches, expandedMatch, theme, setExpandedMatch]);
};