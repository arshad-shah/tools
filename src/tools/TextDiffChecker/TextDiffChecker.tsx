import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Split, Copy, Download, Trash, RotateCcw, ArrowRightLeft, Check, Settings, Play, Save, Eye, EyeOff, Code, BarChart2, AlertTriangle, Loader, Maximize2, FileUp, MoveRight } from 'lucide-react';
import * as Diff from 'diff';

interface DiffSegment {
  text: string;
  added?: boolean;
  removed?: boolean;
  changed?: boolean;
  lineNumber?: number;
  originalLineNumber?: number;
  modifiedLineNumber?: number;
  intraChanges?: Array<{start: number, end: number, type: 'added' | 'removed'}>;
}

interface DiffViewMode {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface DiffStatistics {
  additions: number;
  deletions: number;
  changes: number;
  unchanged: number;
  totalLines: number;
  changePercentage: number;
}

interface DiffSettings {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  wordByWord: boolean;
  showLineNumbers: boolean;
  contextLines: number;
  trimTrailingWhitespace: boolean;
  highlightIntralineChanges: boolean;
  syntaxHighlighting: boolean;
  ignoreEmptyLines: boolean;
  trimNewlines: boolean;
}

const TEXT_SIZE_THRESHOLD = 100000; // Characters threshold for performance warning

const TextDiffChecker: React.FC = () => {
  // Main state
  const [leftText, setLeftText] = useState<string>('');
  const [rightText, setRightText] = useState<string>('');
  const [diffSegments, setDiffSegments] = useState<DiffSegment[]>([]);
  const [isDiffing, setIsDiffing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'warning' | 'info'} | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<string>('split');
  const [diffStats, setDiffStats] = useState<DiffStatistics | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [showStats, setShowStats] = useState<boolean>(true);
  const [highlightMode, setHighlightMode] = useState<'character' | 'word' | 'line'>('word');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [performanceWarning, setPerformanceWarning] = useState<boolean>(false);
  
  // Settings state with defaults
  const [diffSettings, setDiffSettings] = useState<DiffSettings>({
    ignoreWhitespace: false,
    ignoreCase: false,
    wordByWord: false,
    showLineNumbers: true,
    contextLines: 3,
    trimTrailingWhitespace: true,
    highlightIntralineChanges: true,
    syntaxHighlighting: false,
    ignoreEmptyLines: false,
    trimNewlines: false
  });
  
  // Refs
  const diffContainerRef = useRef<HTMLDivElement>(null);
  const diffTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leftTextareaRef = useRef<HTMLTextAreaElement>(null);
  const rightTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // View modes definition
  const viewModes: DiffViewMode[] = [
    { id: 'split', name: 'Side by Side', icon: <Split className="h-4 w-4 mr-1" /> },
    { id: 'unified', name: 'Unified View', icon: <MoveRight className="h-4 w-4 mr-1" /> },
    { id: 'inline', name: 'Inline Highlight', icon: <Code className="h-4 w-4 mr-1" /> }
  ];
  
  // Memoized file type detection
  const detectFileType = useMemo(() => {
    const detectType = (text: string): string => {
      if (!text) return 'plain';
      
      if (/^[\[\{]/.test(text.trim()) && (text.includes('"') || text.includes("'"))) {
        try {
          JSON.parse(text);
          return 'json';
        } catch (e) {
          // Not valid JSON
        }
      }
      
      // Check for common programming languages patterns
      if (text.includes('function') && (text.includes('{') || text.includes('=>'))) {
        return 'javascript';
      }
      if (text.includes('import') && text.includes('from') && text.includes(';')) {
        return 'typescript';
      }
      if (text.includes('<html') || text.includes('<!DOCTYPE html')) {
        return 'html';
      }
      if (text.includes('class') && text.includes('public') && text.includes('{')) {
        return 'java';
      }
      if (text.includes('def ') && text.includes(':')) {
        return 'python';
      }
      if (text.includes('#include') && text.includes('<stdio.h>')) {
        return 'c';
      }
      
      return 'plain';
    };
    
    return {
      left: detectType(leftText),
      right: detectType(rightText)
    };
  }, [leftText, rightText]);
  
  // Function to pre-process text based on settings
  const preprocessText = useCallback((text: string): string => {
    let processed = text;
    
    if (diffSettings.ignoreCase) {
      processed = processed.toLowerCase();
    }
    
    if (diffSettings.ignoreWhitespace) {
      processed = processed.replace(/\s+/g, ' ');
    }
    
    if (diffSettings.trimTrailingWhitespace) {
      processed = processed.split('\n').map(line => line.trimEnd()).join('\n');
    }
    
    if (diffSettings.ignoreEmptyLines) {
      processed = processed.split('\n').filter(line => line.trim() !== '').join('\n');
    }
    
    if (diffSettings.trimNewlines) {
      processed = processed.trim();
    }
    
    return processed;
  }, [diffSettings]);
  
  // Enhanced intraline diff function that properly identifies character-level changes
  const enhanceWithIntralineDiffs = useCallback((segments: DiffSegment[]): DiffSegment[] => {
    const enhancedSegments = [...segments];
    
    for (let i = 0; i < enhancedSegments.length - 1; i++) {
      const current = enhancedSegments[i];
      const next = enhancedSegments[i + 1];
      
      if (current.removed && next.added) {
        // These lines are likely modifications of each other
        // Use character diffing to identify what exactly changed
        const charDiff = Diff.diffChars(current.text, next.text);
        
        // Mark them as changed
        current.changed = true;
        next.changed = true;
        
        // Process character-level changes
        let removedPos = 0;
        let addedPos = 0;
        
        // Add intraChanges arrays to both segments
        current.intraChanges = [];
        next.intraChanges = [];
        
        charDiff.forEach(part => {
          if (part.added) {
            // Add to "next" segment (the added line)
            next.intraChanges!.push({
              start: addedPos,
              end: addedPos + part.value.length,
              type: 'added'
            });
            addedPos += part.value.length;
          } else if (part.removed) {
            // Add to "current" segment (the removed line)
            current.intraChanges!.push({
              start: removedPos,
              end: removedPos + part.value.length,
              type: 'removed'
            });
            removedPos += part.value.length;
          } else {
            // Common part
            removedPos += part.value.length;
            addedPos += part.value.length;
          }
        });
      }
    }
    
    return enhancedSegments;
  }, []);
  
  // Debounced diff calculation to prevent too many updates
  const debouncedCalculateDiff = useCallback(() => {
    if (diffTimeoutRef.current) {
      clearTimeout(diffTimeoutRef.current);
    }
    
    // Check for performance concerns
    const totalLength = leftText.length + rightText.length;
    if (totalLength > TEXT_SIZE_THRESHOLD) {
      setPerformanceWarning(true);
    } else {
      setPerformanceWarning(false);
    }
    
    diffTimeoutRef.current = setTimeout(() => {
      calculateDiff();
    }, 300);
  }, [leftText, rightText, diffSettings, highlightMode]);
  
  // Main diff calculation function
  const calculateDiff = useCallback(() => {
    if (!leftText && !rightText) {
      setDiffSegments([]);
      setDiffStats(null);
      return;
    }
    
    setIsDiffing(true);
    
    try {
      const leftProcessed = preprocessText(leftText);
      const rightProcessed = preprocessText(rightText);
      
      // Handle identical texts first for performance
      if (leftProcessed === rightProcessed) {
        const lines = leftProcessed.split('\n');
        const identicalSegments: DiffSegment[] = lines.map((line, idx) => ({
          text: line,
          lineNumber: idx + 1,
          originalLineNumber: idx + 1,
          modifiedLineNumber: idx + 1
        }));
        
        setDiffSegments(identicalSegments);
        setDiffStats({
          additions: 0,
          deletions: 0,
          changes: 0,
          unchanged: lines.length,
          totalLines: lines.length,
          changePercentage: 0
        });
        setIsDiffing(false);
        return;
      }
      
      let diffResult;
      
      if (diffSettings.wordByWord) {
        // Word-level diffing
        if (highlightMode === 'character') {
          // Character-by-character diff for highest precision
          diffResult = Diff.diffChars(leftProcessed, rightProcessed);
        } else {
          // Word-by-word diff
          diffResult = Diff.diffWords(leftProcessed, rightProcessed, {
            ignoreWhitespace: diffSettings.ignoreWhitespace
          });
        }
        
        // Convert to our segment format
        const segments: DiffSegment[] = diffResult.map(part => ({
          text: part.value,
          added: part.added,
          removed: part.removed
        }));
        
        setDiffSegments(segments);
      } else {
        // Line-by-line diffing (default)
        leftProcessed.split('\n');
        rightProcessed.split('\n');
        
        // Use diffLines for line-level differences
        diffResult = Diff.diffLines(leftProcessed, rightProcessed, {
          ignoreWhitespace: diffSettings.ignoreWhitespace,
          newlineIsToken: true
        });
        
        // Process line diff results into segments with line numbers
        const segments: DiffSegment[] = [];
        let leftLineNumber = 0;
        let rightLineNumber = 0;
        
        diffResult.forEach(part => {
          const lines = part.value.split('\n');
          // Remove empty last line that results from split if it ends with a newline
          if (lines[lines.length - 1] === '' && part.value.endsWith('\n')) lines.pop();
          
          lines.forEach(line => {
            if (part.added) {
              rightLineNumber++;
              segments.push({ 
                text: line, 
                added: true, 
                lineNumber: segments.length + 1,
                modifiedLineNumber: rightLineNumber
              });
            } else if (part.removed) {
              leftLineNumber++;
              segments.push({ 
                text: line, 
                removed: true, 
                lineNumber: segments.length + 1,
                originalLineNumber: leftLineNumber
              });
            } else {
              leftLineNumber++;
              rightLineNumber++;
              segments.push({ 
                text: line, 
                lineNumber: segments.length + 1,
                originalLineNumber: leftLineNumber,
                modifiedLineNumber: rightLineNumber
              });
            }
          });
        });
        
        // If we have intraline highlighting enabled, enhance the diff with character-level diffs
        const finalSegments = diffSettings.highlightIntralineChanges ? 
          enhanceWithIntralineDiffs(segments) : segments;
        
        setDiffSegments(finalSegments);
      }
      
      // Calculate diff statistics
      calculateDiffStatistics(diffResult);
    } catch (error) {
      console.error('Diff calculation error:', error);
      showNotification('Error calculating differences. Please try again.', 'error');
    } finally {
      setIsDiffing(false);
    }
  }, [leftText, rightText, diffSettings, highlightMode, preprocessText, enhanceWithIntralineDiffs]);
  
  // Calculate statistics on the diff
  const calculateDiffStatistics = useCallback((diffResult: Diff.Change[]): void => {
    if (!diffResult) return;
    
    let additions = 0;
    let deletions = 0;
    let unchanged = 0;
    
    diffResult.forEach(part => {
      const lineCount = part.value.split('\n').length - (part.value.endsWith('\n') ? 1 : 0);
      
      if (part.added) {
        additions += lineCount;
      } else if (part.removed) {
        deletions += lineCount;
      } else {
        unchanged += lineCount;
      }
    });
    
    const changes = additions + deletions;
    const totalLines = changes + unchanged;
    const changePercentage = totalLines > 0 ? Math.round((changes / totalLines) * 100) : 0;
    
    setDiffStats({
      additions,
      deletions,
      changes,
      unchanged,
      totalLines,
      changePercentage
    });
  }, []);
  
  // Effect for auto-refreshing diff when inputs change
  useEffect(() => {
    if (leftText !== undefined && rightText !== undefined && autoRefresh) {
      debouncedCalculateDiff();
    }
    
    return () => {
      if (diffTimeoutRef.current) {
        clearTimeout(diffTimeoutRef.current);
      }
    };
  }, [leftText, rightText, autoRefresh, diffSettings, highlightMode, debouncedCalculateDiff]);
  
  // Fullscreen mode handler
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isFullscreen]);
  
  // Function to intelligently merge differences
  const mergeTexts = useCallback((): void => {
    // Only makes sense if we have differences
    if (!diffSegments.length) {
      showNotification('No differences to merge', 'info');
      return;
    }
    
    try {
      // Apply a more sophisticated merge strategy that respects line-by-line changes
      let mergedText = '';
      let prevOriginalLineNum = -1;
      let prevModifiedLineNum = -1;
      
      // Iterate through segments and construct the merged result
      for (const segment of diffSegments) {
        if (segment.added) {
          // Handle additions
          if (segment.modifiedLineNumber! > prevModifiedLineNum + 1) {
            // There's a gap, need to add unchanged lines
            mergedText += rightText.split('\n').slice(prevModifiedLineNum, segment.modifiedLineNumber! - 1).join('\n');
            if (mergedText && !mergedText.endsWith('\n')) mergedText += '\n';
          }
          mergedText += segment.text;
          if (!segment.text.endsWith('\n')) mergedText += '\n';
          prevModifiedLineNum = segment.modifiedLineNumber!;
        } else if (!segment.removed) {
          // Handle unchanged lines
          mergedText += segment.text;
          if (!segment.text.endsWith('\n')) mergedText += '\n';
          prevOriginalLineNum = segment.originalLineNumber!;
          prevModifiedLineNum = segment.modifiedLineNumber!;
        }
        // Skip removed lines in the merge process
      }
      
      // Update with merged content
      setRightText(mergedText.trimEnd());
      showNotification('Texts merged successfully', 'success');
      
      // Recalculate diff after merge
      setTimeout(() => calculateDiff(), 100);
    } catch (error) {
      console.error('Merge error:', error);
      showNotification('Error merging texts. Please try again.', 'error');
    }
  }, [diffSegments, rightText, calculateDiff]);
  
  // Swap left and right texts
  const swapTexts = useCallback((): void => {
    const temp = leftText;
    setLeftText(rightText);
    setRightText(temp);
    showNotification('Texts swapped', 'info');
  }, [leftText, rightText]);
  
  // Clear all content
  const clearAll = useCallback((): void => {
    if (leftText || rightText) {
      if (window.confirm('Clear all content? This cannot be undone.')) {
        setLeftText('');
        setRightText('');
        setDiffSegments([]);
        setDiffStats(null);
        showNotification('All cleared', 'info');
      }
    } else {
      showNotification('Nothing to clear', 'info');
    }
  }, [leftText, rightText]);
  
  // Generate a formatted, colorized diff for download
  const downloadResults = useCallback((): void => {
    if (!diffSegments.length) {
      showNotification('No diff results to download', 'warning');
      return;
    }
    
    let content = '';
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    let filename = `diff-result-${timestamp}.txt`;
    
    // Choose formatting based on view mode
    if (diffViewMode === 'unified') {
      // Unified Git-style diff
      content = `--- Original\n+++ Modified\n\n`;
      content += diffSegments.map(segment => {
        const prefix = segment.added ? '+' : segment.removed ? '-' : ' ';
        return `${prefix} ${segment.text}`;
      }).join('\n');
    } else {
      // More detailed diff
      content = `DIFF RESULTS (${timestamp})\n`;
      content += `=====================================\n\n`;
      
      if (diffStats) {
        content += `Statistics:\n`;
        content += `- Additions: ${diffStats.additions}\n`;
        content += `- Deletions: ${diffStats.deletions}\n`;
        content += `- Unchanged: ${diffStats.unchanged}\n`;
        content += `- Change rate: ${diffStats.changePercentage}%\n\n`;
      }
      
      content += `ORIGINAL TEXT:\n${leftText}\n\n`;
      content += `MODIFIED TEXT:\n${rightText}\n\n`;
      
      content += `DIFFERENCES:\n`;
      content += diffSegments.map(segment => {
        if (segment.added) return `[ADDED] ${segment.text}`;
        if (segment.removed) return `[REMOVED] ${segment.text}`;
        return `[UNCHANGED] ${segment.text}`;
      }).join('\n');
    }
    
    // Create JSON format option
    const jsonContent = JSON.stringify({
      timestamp: new Date().toISOString(),
      statistics: diffStats,
      original: leftText,
      modified: rightText,
      segments: diffSegments
    }, null, 2);
    
    // Let user choose format
    const format = window.confirm('Download as JSON? (Cancel for plain text)') ? 'json' : 'txt';
    
    if (format === 'json') {
      content = jsonContent;
      filename = `diff-result-${timestamp}.json`;
    }
    
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`Results downloaded as ${format.toUpperCase()}`, 'success');
  }, [diffSegments, diffStats, diffViewMode, leftText, rightText]);
  
  // Copy text to clipboard
  const copyToClipboard = useCallback((text: string): void => {
    if (!text) {
      showNotification('Nothing to copy', 'warning');
      return;
    }
    
    navigator.clipboard.writeText(text)
      .then(() => showNotification('Copied to clipboard', 'success'))
      .catch(err => {
        console.error('Clipboard error:', err);
        showNotification('Failed to copy to clipboard', 'error');
      });
  }, []);
  
  // Copy diff results in the selected format
  const copyDiffResults = useCallback((): void => {
    if (!diffSegments.length) {
      showNotification('No diff results to copy', 'warning');
      return;
    }
    
    let content = '';
    
    // Choose formatting based on view mode
    if (diffViewMode === 'unified') {
      // Unified Git-style diff
      content = diffSegments.map(segment => {
        const prefix = segment.added ? '+' : segment.removed ? '-' : ' ';
        return `${prefix} ${segment.text}`;
      }).join('\n');
    } else {
      // Default to a summary format
      content = diffSegments.map(segment => {
        if (segment.added) return `+ ${segment.text}`;
        if (segment.removed) return `- ${segment.text}`;
        return `  ${segment.text}`;
      }).join('\n');
    }
    
    navigator.clipboard.writeText(content)
      .then(() => showNotification('Diff results copied to clipboard', 'success'))
      .catch(err => {
        console.error('Clipboard error:', err);
        showNotification('Failed to copy diff results', 'error');
      });
  }, [diffSegments, diffViewMode]);
  
  // Display notification with type (success, error, warning, info)
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void => {
    setNotification({message, type});
    setTimeout(() => setNotification(null), 3000);
  }, []);
  
  // Handle file upload with intelligent processing
  const handleFileUpload = useCallback((side: 'left' | 'right', e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Show loading indicator
    showNotification(`Loading ${file.name}...`, 'info');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      // Process the file content based on its type
      // This allows for more intelligent handling of different file formats
      const processedContent = processFileContent(content, file.name);
      
      if (side === 'left') {
        setLeftText(processedContent);
        if (leftTextareaRef.current) {
          leftTextareaRef.current.focus();
        }
      } else {
        setRightText(processedContent);
        if (rightTextareaRef.current) {
          rightTextareaRef.current.focus();
        }
      }
      
      showNotification(`${file.name} loaded successfully`, 'success');
      
      // Reset file input
      e.target.value = '';
    };
    
    reader.onerror = () => {
      showNotification(`Error loading ${file.name}. Try again.`, 'error');
      // Reset file input
      e.target.value = '';
    };
    
    reader.readAsText(file);
  }, []);
  
  // Process file content based on file type
  const processFileContent = useCallback((content: string, filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    // Handle different file types
    switch (extension) {
      case 'json':
        // Pretty-print JSON
        try {
          const parsed = JSON.parse(content);
          return JSON.stringify(parsed, null, 2);
        } catch (e) {
          console.error('Invalid JSON file:', e);
          showNotification('Invalid JSON file, showing as plain text', 'warning');
          return content; // Return original if parsing fails
        }
        
      case 'html':
      case 'xml':
        // Basic indentation for HTML/XML
        try {
          return content
            .replace(/></g, '>\n<')
            .replace(/<(\/?)([\w-]+)(.*?)>/g, (match, slash, tag, attrs) => {
              return `<${slash}${tag}${attrs}>`;
            });
        } catch (e) {
          console.error('Error formatting HTML/XML:', e);
          return content;
        }
          
      default:
        // Return unchanged for other file types
        return content;
    }
  }, []);
  
  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);
  
  // Update a specific diffSetting
  const updateDiffSetting = useCallback((key: keyof DiffSettings, value: boolean | number) => {
    setDiffSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);
  
  // Reset settings to defaults
  const resetSettings = useCallback(() => {
    setDiffSettings({
      ignoreWhitespace: false,
      ignoreCase: false,
      wordByWord: false,
      showLineNumbers: true,
      contextLines: 3,
      trimTrailingWhitespace: true,
      highlightIntralineChanges: true,
      syntaxHighlighting: false,
      ignoreEmptyLines: false,
      trimNewlines: false
    });
    setHighlightMode('word');
    setDiffViewMode('split');
    showNotification('Settings reset to defaults', 'info');
  }, []);
  
  // Render a DiffSegment with intraline highlighting
  const renderSegmentWithIntraHighlights = useCallback((segment: DiffSegment, className: string) => {
    if (!segment.intraChanges || segment.intraChanges.length === 0) {
      return (
        <span className={className}>
          {segment.text || <span className="text-indigo-400 italic">(empty line)</span>}
        </span>
      );
    }
    
    // Sort intraChanges by start position
    const sortedChanges = [...segment.intraChanges].sort((a, b) => a.start - b.start);
    
    const parts = [];
    let lastEnd = 0;
    
    sortedChanges.forEach((change, i) => {
      // Add unchanged text before this change
      if (change.start > lastEnd) {
        parts.push(
          <span key={`unchanged-${i}`} className={className}>
            {segment.text.substring(lastEnd, change.start)}
          </span>
        );
      }
      
      // Add the changed part with appropriate highlight
      const changeClass = segment.added 
        ? 'bg-green-300 bg-opacity-30 text-green-100' 
        : 'bg-red-300 bg-opacity-30 text-red-100';
      
      parts.push(
        <span key={`change-${i}`} className={`${changeClass} rounded px-1`}>
          {segment.text.substring(change.start, change.end)}
        </span>
      );
      
      lastEnd = change.end;
    });
    
    // Add any remaining text after the last change
    if (lastEnd < segment.text.length) {
      parts.push(
        <span key="unchanged-last" className={className}>
          {segment.text.substring(lastEnd)}
        </span>
      );
    }
    
    return <>{parts}</>;
  }, []);
  
  // Determine if the app should show a loading state
  const isLoading = isDiffing && (leftText.length > 5000 || rightText.length > 5000);
  
  // Main container class based on fullscreen state
  const containerClass = isFullscreen 
    ? 'fixed inset-0 z-50 bg-gradient-to-br from-violet-900 to-indigo-800 text-white p-4 overflow-auto'
    : 'flex flex-col h-full max-h-screen bg-gradient-to-br from-violet-900 to-indigo-800 text-white p-4 rounded-lg';
  
  return (
    <div className={containerClass}>
      {/* Header and tools */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Split className="h-6 w-6 text-violet-200" />
          <h2 className="text-xl font-bold">Intelligent Text Diff Checker</h2>
        </div>
        <div className="flex flex-wrap space-x-2 gap-y-2">
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 ${autoRefresh ? 'bg-green-600' : 'bg-red-600'} hover:bg-opacity-80 rounded-lg transition-all duration-200 flex items-center text-sm`}
            title={autoRefresh ? "Auto-refresh is on" : "Auto-refresh is off"}
            aria-pressed={autoRefresh}
          >
            <Play className="h-4 w-4 mr-1" />
            {autoRefresh ? 'Auto' : 'Manual'}
          </button>
          {!autoRefresh && (
            <button 
              onClick={calculateDiff}
              className="p-2 bg-violet-600 hover:bg-violet-500 rounded-lg transition-all duration-200 flex items-center text-sm"
              title="Calculate differences"
              disabled={isDiffing}
            >
              {isDiffing ? <Loader className="h-4 w-4 animate-spin" /> : 'Run Diff'}
            </button>
          )}
          <button 
            onClick={mergeTexts}
            className="p-2 bg-violet-600 hover:bg-violet-500 rounded-lg transition-all duration-200 flex items-center"
            title="Merge differences"
            disabled={!diffSegments.length || isDiffing}
          >
            <Save className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Merge</span>
          </button>
          <button 
            onClick={swapTexts}
            className="p-2 bg-indigo-700 hover:bg-indigo-600 rounded-lg transition-all duration-200 flex items-center"
            title="Swap texts"
            disabled={isDiffing}
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>
          <button 
            onClick={clearAll}
            className="p-2 bg-indigo-700 hover:bg-indigo-600 rounded-lg transition-all duration-200 flex items-center"
            title="Clear all"
            disabled={isDiffing}
          >
            <Trash className="h-4 w-4" />
          </button>
          <button 
            onClick={downloadResults}
            className="p-2 bg-indigo-700 hover:bg-indigo-600 rounded-lg transition-all duration-200 flex items-center"
            title="Download results"
            disabled={diffSegments.length === 0 || isDiffing}
          >
            <Download className="h-4 w-4" />
          </button>
          <button 
            onClick={copyDiffResults}
            className="p-2 bg-indigo-700 hover:bg-indigo-600 rounded-lg transition-all duration-200 flex items-center"
            title="Copy diff results"
            disabled={diffSegments.length === 0 || isDiffing}
          >
            <Copy className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setShowStats(!showStats)}
            className="p-2 bg-indigo-700 hover:bg-indigo-600 rounded-lg transition-all duration-200 flex items-center"
            title={showStats ? "Hide statistics" : "Show statistics"}
            aria-pressed={showStats}
          >
            {showStats ? <EyeOff className="h-4 w-4" /> : <BarChart2 className="h-4 w-4" />}
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-2 bg-indigo-700 hover:bg-indigo-600 rounded-lg transition-all duration-200 flex items-center"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            aria-pressed={isFullscreen}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Statistics panel */}
      {showStats && diffStats && (
        <div className="mb-4 bg-indigo-950 bg-opacity-40 p-3 rounded-lg flex flex-wrap items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
              <span className="text-sm">Additions: <strong>{diffStats.additions}</strong></span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
              <span className="text-sm">Deletions: <strong>{diffStats.deletions}</strong></span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-indigo-400 mr-2"></div>
              <span className="text-sm">Unchanged: <strong>{diffStats.unchanged}</strong></span>
            </div>
          </div>
          <div className="text-sm mt-2 sm:mt-0">
            <span>Change rate: <strong>{diffStats.changePercentage}%</strong></span>
          </div>
        </div>
      )}

      {/* Performance warning */}
      {performanceWarning && (
        <div className="mb-4 bg-yellow-900 bg-opacity-40 p-3 rounded-lg flex items-center text-yellow-200">
          <AlertTriangle className="h-5 w-5 mr-2 text-yellow-300" />
          <span className="text-sm">
            Large text detected. Diff performance may be affected. Consider processing smaller sections or disabling auto-refresh.
          </span>
        </div>
      )}

      {/* View mode and settings */}
      <div className="flex flex-col sm:flex-row mb-4 bg-indigo-950 bg-opacity-40 p-2 rounded-lg gap-2">
        <div className="flex items-center mr-4">
          <Settings className="h-4 w-4 mr-2 text-violet-300" />
          <span className="text-sm text-violet-300">View Mode:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewModes.map(mode => (
            <button
              key={mode.id}
              onClick={() => setDiffViewMode(mode.id)}
              className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 flex items-center
                ${diffViewMode === mode.id 
                  ? 'bg-violet-600 text-white' 
                  : 'bg-indigo-800 bg-opacity-50 hover:bg-indigo-700 text-violet-200'}`}
              aria-pressed={diffViewMode === mode.id}
            >
              {mode.icon}
              {mode.name}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-2 ml-0 sm:ml-auto mt-2 sm:mt-0">
          <button 
            onClick={() => updateDiffSetting('ignoreWhitespace', !diffSettings.ignoreWhitespace)}
            className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 
              ${diffSettings.ignoreWhitespace ? 'bg-violet-600' : 'bg-indigo-800 bg-opacity-50 hover:bg-indigo-700'}`}
            title="Ignore whitespace differences"
            aria-pressed={diffSettings.ignoreWhitespace}
          >
            Ignore Whitespace
          </button>
          <button 
            onClick={() => updateDiffSetting('ignoreCase', !diffSettings.ignoreCase)}
            className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 
              ${diffSettings.ignoreCase ? 'bg-violet-600' : 'bg-indigo-800 bg-opacity-50 hover:bg-indigo-700'}`}
            title="Ignore case differences"
            aria-pressed={diffSettings.ignoreCase}
          >
            Ignore Case
          </button>
          <button 
            onClick={() => updateDiffSetting('highlightIntralineChanges', !diffSettings.highlightIntralineChanges)}
            className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 
              ${diffSettings.highlightIntralineChanges ? 'bg-violet-600' : 'bg-indigo-800 bg-opacity-50 hover:bg-indigo-700'}`}
            title="Highlight changes within lines"
            aria-pressed={diffSettings.highlightIntralineChanges}
          >
            Intraline Changes
          </button>
          <button 
            onClick={resetSettings}
            className="px-3 py-1 text-sm rounded-lg transition-all duration-200 bg-indigo-800 bg-opacity-50 hover:bg-indigo-700"
            title="Reset all settings to defaults"
          >
            Reset
          </button>
        </div>
      </div>
      
      {/* Additional settings row */}
      <div className="flex flex-col sm:flex-row mb-4 bg-indigo-950 bg-opacity-40 p-2 rounded-lg gap-2">
        <div className="flex items-center mr-4">
          <Eye className="h-4 w-4 mr-2 text-violet-300" />
          <span className="text-sm text-violet-300">Highlight Level:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {['character', 'word', 'line'].map((mode) => (
            <button
              key={mode}
              onClick={() => setHighlightMode(mode as any)}
              className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 
                ${highlightMode === mode 
                  ? 'bg-violet-600 text-white' 
                  : 'bg-indigo-800 bg-opacity-50 hover:bg-indigo-700 text-violet-200'}`}
              aria-pressed={highlightMode === mode}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-2 ml-0 sm:ml-auto mt-2 sm:mt-0">
          <button 
            onClick={() => updateDiffSetting('ignoreEmptyLines', !diffSettings.ignoreEmptyLines)}
            className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 
              ${diffSettings.ignoreEmptyLines ? 'bg-violet-600' : 'bg-indigo-800 bg-opacity-50 hover:bg-indigo-700'}`}
            title="Ignore empty lines"
            aria-pressed={diffSettings.ignoreEmptyLines}
          >
            Ignore Empty Lines
          </button>
          <button 
            onClick={() => updateDiffSetting('trimTrailingWhitespace', !diffSettings.trimTrailingWhitespace)}
            className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 
              ${diffSettings.trimTrailingWhitespace ? 'bg-violet-600' : 'bg-indigo-800 bg-opacity-50 hover:bg-indigo-700'}`}
            title="Trim trailing whitespace"
            aria-pressed={diffSettings.trimTrailingWhitespace}
          >
            Trim Trailing Space
          </button>
          <button 
            onClick={() => updateDiffSetting('wordByWord', !diffSettings.wordByWord)}
            className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 
              ${diffSettings.wordByWord ? 'bg-violet-600' : 'bg-indigo-800 bg-opacity-50 hover:bg-indigo-700'}`}
            title="Compare word by word instead of line by line"
            aria-pressed={diffSettings.wordByWord}
          >
            Word Mode
          </button>
        </div>
      </div>

      {/* Text panels */}
      <div className="flex flex-col md:flex-row gap-4 h-full min-h-0">
        {/* Left panel */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-violet-200">Original Text</h3>
            <div className="flex space-x-2">
              <label className="cursor-pointer p-1 hover:bg-indigo-700 rounded transition-all duration-200" title="Upload file">
                <FileUp className="h-4 w-4" />
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload('left', e)}
                  accept=".txt,.md,.js,.ts,.jsx,.tsx,.html,.css,.json,.py,.java,.c,.cpp,.xml,.csv"
                  disabled={isDiffing}
                />
              </label>
              <button 
                onClick={() => copyToClipboard(leftText)}
                className="p-1 hover:bg-indigo-700 rounded transition-all duration-200"
                title="Copy to clipboard"
                disabled={!leftText || isDiffing}
              >
                <Copy className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setLeftText('')}
                className="p-1 hover:bg-indigo-700 rounded transition-all duration-200"
                title="Clear"
                disabled={!leftText || isDiffing}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <textarea
            ref={leftTextareaRef}
            className="w-full h-48 min-h-0 flex-grow p-3 bg-indigo-950 bg-opacity-50 text-white rounded-lg border border-indigo-600 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none font-mono text-sm"
            value={leftText}
            onChange={(e) => setLeftText(e.target.value)}
            placeholder="Paste your original text here or upload a file..."
            disabled={isDiffing}
            aria-label="Original Text"
            spellCheck={false}
          />
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-violet-200">Modified Text</h3>
            <div className="flex space-x-2">
              <label className="cursor-pointer p-1 hover:bg-indigo-700 rounded transition-all duration-200" title="Upload file">
                <FileUp className="h-4 w-4" />
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload('right', e)}
                  accept=".txt,.md,.js,.ts,.jsx,.tsx,.html,.css,.json,.py,.java,.c,.cpp,.xml,.csv"
                  disabled={isDiffing}
                />
              </label>
              <button 
                onClick={() => copyToClipboard(rightText)}
                className="p-1 hover:bg-indigo-700 rounded transition-all duration-200"
                title="Copy to clipboard"
                disabled={!rightText || isDiffing}
              >
                <Copy className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setRightText('')}
                className="p-1 hover:bg-indigo-700 rounded transition-all duration-200"
                title="Clear"
                disabled={!rightText || isDiffing}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <textarea
            ref={rightTextareaRef}
            className="w-full h-48 min-h-0 flex-grow p-3 bg-indigo-950 bg-opacity-50 text-white rounded-lg border border-indigo-600 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none font-mono text-sm"
            value={rightText}
            onChange={(e) => setRightText(e.target.value)}
            placeholder="Paste your modified text here or upload a file..."
            disabled={isDiffing}
            aria-label="Modified Text"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Diff results panel */}
      <div className="mt-6 mb-4 flex-grow overflow-hidden flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-violet-200">Diff Results</h3>
          {diffSegments.length > 0 && (
            <div className="text-xs text-violet-300">
              Showing {diffSegments.length} comparison {diffSegments.length === 1 ? 'item' : 'items'}
            </div>
          )}
        </div>
        
        <div 
          ref={diffContainerRef}
          className="bg-indigo-950 bg-opacity-50 rounded-lg border border-indigo-600 p-2 overflow-auto flex-grow"
          role="region" 
          aria-label="Diff Results"
        >
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader className="h-8 w-8 text-violet-400 animate-spin mr-3" />
              <span className="text-violet-300">Calculating differences...</span>
            </div>
          ) : diffSegments.length > 0 ? (
            <div className="h-full">
              {diffViewMode === 'unified' && (
                <div className="font-mono text-sm p-2">
                  {diffSegments.map((segment, idx) => (
                    <div 
                      key={`unified-${idx}`} 
                      className={`py-1 whitespace-pre-wrap ${
                        segment.added 
                          ? 'bg-green-900 bg-opacity-20 text-green-300' 
                          : segment.removed 
                            ? 'bg-red-900 bg-opacity-20 text-red-300' 
                            : 'text-white'
                        }`}
                    >
                      {diffSettings.showLineNumbers && (
                        <span className="inline-block w-8 text-indigo-400 select-none mr-2 text-right">
                          {segment.added 
                            ? segment.modifiedLineNumber 
                            : segment.removed 
                              ? segment.originalLineNumber 
                              : segment.lineNumber}
                        </span>
                      )}
                      <span className="mr-2">
                        {segment.added ? '+' : segment.removed ? '-' : ' '}
                      </span>
                      
                      {diffSettings.highlightIntralineChanges && segment.intraChanges && segment.intraChanges.length > 0 
                        ? renderSegmentWithIntraHighlights(
                            segment, 
                            segment.added 
                              ? 'text-green-300' 
                              : segment.removed 
                                ? 'text-red-300' 
                                : 'text-white'
                          )
                        : (
                          <span className="whitespace-pre-wrap">
                            {segment.text || <span className="text-indigo-400 italic">(empty line)</span>}
                          </span>
                        )
                      }
                    </div>
                  ))}
                </div>
              )}
              
              {diffViewMode === 'split' && (
                <div className="flex">
                  <div className="w-1/2 pr-2 font-mono text-sm">
                    {diffSegments.map((segment, idx) => (
                      (segment.removed || (!segment.added && !segment.removed)) && (
                        <div 
                          key={`left-${idx}`} 
                          className={`py-1 whitespace-pre-wrap ${
                            segment.removed 
                              ? 'bg-red-900 bg-opacity-20 text-red-300' 
                              : 'text-white'
                          }`}
                        >
                          {diffSettings.showLineNumbers && (
                            <span className="inline-block w-8 text-indigo-400 select-none mr-2 text-right">
                              {segment.originalLineNumber || '-'}
                            </span>
                          )}
                          
                          {diffSettings.highlightIntralineChanges && segment.removed && segment.intraChanges && segment.intraChanges.length > 0 
                            ? renderSegmentWithIntraHighlights(segment, 'text-red-300')
                            : (
                              <span className="whitespace-pre-wrap">
                                {segment.text || <span className="text-indigo-400 italic">(empty line)</span>}
                              </span>
                            )
                          }
                        </div>
                      )
                    ))}
                  </div>
                  <div className="w-1/2 pl-2 font-mono text-sm border-l border-indigo-700">
                    {diffSegments.map((segment, idx) => (
                      (segment.added || (!segment.added && !segment.removed)) && (
                        <div 
                          key={`right-${idx}`} 
                          className={`py-1 whitespace-pre-wrap ${
                            segment.added 
                              ? 'bg-green-900 bg-opacity-20 text-green-300' 
                              : 'text-white'
                          }`}
                        >
                          {diffSettings.showLineNumbers && (
                            <span className="inline-block w-8 text-indigo-400 select-none mr-2 text-right">
                              {segment.modifiedLineNumber || '-'}
                            </span>
                          )}
                          
                          {diffSettings.highlightIntralineChanges && segment.added && segment.intraChanges && segment.intraChanges.length > 0 
                            ? renderSegmentWithIntraHighlights(segment, 'text-green-300')
                            : (
                              <span className="whitespace-pre-wrap">
                                {segment.text || <span className="text-indigo-400 italic">(empty line)</span>}
                              </span>
                            )
                          }
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
              
              {diffViewMode === 'inline' && (
                <div className="font-mono text-sm p-2">
                  {leftText.split('\n').map((line, idx) => {
                    const rightLine = rightText.split('\n')[idx] || '';
                    const isEqual = line === rightLine;
                    
                    // Find changes between the lines
                    let lineChanges = null;
                    if (!isEqual && diffSettings.highlightIntralineChanges) {
                      lineChanges = Diff.diffChars(line, rightLine);
                    }
                    
                    return (
                      <div key={idx} className={`mb-3 pb-2 ${!isEqual && 'border-b border-indigo-800'}`}>
                        {diffSettings.showLineNumbers && (
                          <span className="inline-block w-8 text-indigo-400 select-none mr-2 text-right">
                            {idx + 1}
                          </span>
                        )}
                        
                        {/* Original line */}
                        <div className={`${isEqual ? 'text-white' : 'text-red-300'} whitespace-pre-wrap`}>
                          {lineChanges ? (
                            <>
                              {lineChanges.map((part, i) => (
                                <span 
                                  key={`orig-${i}`}
                                  className={part.removed ? 'bg-red-900 bg-opacity-30 rounded px-0.5' : ''}
                                >
                                  {part.removed ? part.value : (part.added ? '' : part.value)}
                                </span>
                              ))}
                            </>
                          ) : (
                            line || <span className="text-indigo-400 italic">(empty line)</span>
                          )}
                        </div>
                        
                        {/* Modified line, only shown if different */}
                        {!isEqual && (
                          <div className="mt-1 pl-8 text-green-300 whitespace-pre-wrap">
                            {lineChanges ? (
                              <>
                                {lineChanges.map((part, i) => (
                                  <span 
                                    key={`mod-${i}`}
                                    className={part.added ? 'bg-green-900 bg-opacity-30 rounded px-0.5' : ''}
                                  >
                                    {part.added ? part.value : (part.removed ? '' : part.value)}
                                  </span>
                                ))}
                              </>
                            ) : (
                              rightLine || <span className="text-indigo-400 italic">(empty line)</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 h-full text-center text-indigo-300 flex flex-col items-center justify-center">
              {leftText && rightText ? (
                <>
                  <Check className="h-8 w-8 text-green-400 mb-2" />
                  <p className="text-lg font-medium text-green-400">No differences found!</p>
                  <p>The texts are identical.</p>
                </>
              ) : (
                <>
                  <div className="mb-3 text-6xl">👀</div>
                  <p>Enter text in both panels to see differences highlighted here.</p>
                  <p className="text-sm mt-2 text-indigo-400">Or use the file upload buttons to compare files.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notification toast */}
      {notification && (
        <div 
          className={`
            fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg flex items-center animate-fade-in
            ${notification.type === 'success' ? 'bg-green-600 text-white' :
              notification.type === 'error' ? 'bg-red-600 text-white' :
              notification.type === 'warning' ? 'bg-yellow-600 text-white' :
              'bg-indigo-600 text-white'
            }
          `}
          role="alert"
          aria-live="polite"
        >
          {notification.type === 'success' ? <Check className="h-4 w-4 mr-2" /> :
           notification.type === 'error' ? <AlertTriangle className="h-4 w-4 mr-2" /> :
           notification.type === 'warning' ? <AlertTriangle className="h-4 w-4 mr-2" /> :
           <Check className="h-4 w-4 mr-2" />
          }
          {notification.message}
        </div>
      )}
      
      {/* Help button */}
      <div className="fixed bottom-4 left-4">
        <button 
          onClick={() => alert("Intelligent Diff Checker\n\nThis tool uses the diff library to provide accurate text comparison. Upload files or paste text to compare differences.\n\nFeatures:\n- Character, word, or line-level diffing\n- Multiple view modes (Split, Unified, Inline)\n- Configurable settings (ignore whitespace, case, etc.)\n- Statistics visualization\n- File export in multiple formats\n- Intraline change highlighting\n- Performance optimization for large files")}
          className="bg-indigo-700 hover:bg-indigo-600 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold shadow-lg"
          aria-label="Help"
        >
          ?
        </button>
      </div>
      
      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        /* Handle text wrapping nicely */
        .whitespace-pre-wrap {
          white-space: pre-wrap;
          word-break: break-word;
        }
        
        /* Smooth transitions */
        .transition-all {
          transition: all 0.2s ease-in-out;
        }
        
        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(76, 29, 149, 0.1);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.8);
        }
      `}</style>
    </div>
  );
};

export default TextDiffChecker;