import { useCallback, useRef, useState } from "react";
import { DiffSegment, DiffSettings, DiffStatistics, UseIntelligentDiffReturn } from "../../../types/TextDiffCheckerTypes";
import * as Diff from 'diff';

const TEXT_SIZE_THRESHOLD = 100000; // Characters threshold for performance warning

export const useIntelligentDiff = (): UseIntelligentDiffReturn => {
  const [diffSegments, setDiffSegments] = useState<DiffSegment[]>([]);
  const [diffStats, setDiffStats] = useState<DiffStatistics | null>(null);
  const [isDiffing, setIsDiffing] = useState<boolean>(false);
  const [performanceWarning, setPerformanceWarning] = useState<boolean>(false);
  
  const diffTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to pre-process text based on settings
  const preprocessText = useCallback((text: string, settings: DiffSettings): string => {
    let processed = text;
    
    if (settings.ignoreCase) {
      processed = processed.toLowerCase();
    }
    
    if (settings.ignoreWhitespace) {
      processed = processed.replace(/\s+/g, ' ');
    }
    
    if (settings.trimTrailingWhitespace) {
      processed = processed.split('\n').map(line => line.trimEnd()).join('\n');
    }
    
    if (settings.ignoreEmptyLines) {
      processed = processed.split('\n').filter(line => line.trim() !== '').join('\n');
    }
    
    if (settings.trimNewlines) {
      processed = processed.trim();
    }
    
    return processed;
  }, []);

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

  // Main diff calculation function
  const calculateDiff = useCallback((
    leftText: string, 
    rightText: string, 
    settings: DiffSettings, 
    highlightMode: 'character' | 'word' | 'line' = 'word'
  ) => {
    if (!leftText && !rightText) {
      setDiffSegments([]);
      setDiffStats(null);
      return;
    }
    
    setIsDiffing(true);
    
    try {
      const leftProcessed = preprocessText(leftText, settings);
      const rightProcessed = preprocessText(rightText, settings);
      
      // Handle identical texts first for performance
      if (leftProcessed === rightProcessed) {
        const lines = leftProcessed.split('\n');
        const identicalSegments: DiffSegment[] = lines.map((line, idx) => ({
          text: line,
          lineNumber: idx + 1,
          originalLineNumber: idx + 1,
          modifiedLineNumber: idx + 1,
          type: 'unchanged'
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
      
      if (settings.wordByWord || highlightMode === 'word' || highlightMode === 'character') {
        // Word-level or character-level diffing
        if (highlightMode === 'character') {
          // Character-by-character diff for highest precision
          diffResult = Diff.diffChars(leftProcessed, rightProcessed);
        } else {
          // Word-by-word diff
          diffResult = Diff.diffWordsWithSpace(leftProcessed, rightProcessed);
        }
        
        // Convert to our segment format for word/character level
        const segments: DiffSegment[] = diffResult.map((part, index) => ({
          text: part.value,
          added: part.added,
          removed: part.removed,
          lineNumber: index + 1,
          type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
          isIntraline: true
        }));
        
        setDiffSegments(segments);
      } else {
        // Line-by-line diffing (default)
        diffResult = Diff.diffLines(leftProcessed, rightProcessed, {
          ignoreWhitespace: settings.ignoreWhitespace,
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
                modifiedLineNumber: rightLineNumber,
                type: 'added'
              });
            } else if (part.removed) {
              leftLineNumber++;
              segments.push({ 
                text: line, 
                removed: true, 
                lineNumber: segments.length + 1,
                originalLineNumber: leftLineNumber,
                type: 'removed'
              });
            } else {
              leftLineNumber++;
              rightLineNumber++;
              segments.push({ 
                text: line, 
                lineNumber: segments.length + 1,
                originalLineNumber: leftLineNumber,
                modifiedLineNumber: rightLineNumber,
                type: 'unchanged'
              });
            }
          });
        });
        
        // If we have intraline highlighting enabled, enhance the diff with character-level diffs
        const finalSegments = settings.highlightIntralineChanges ? 
          enhanceWithIntralineDiffs(segments) : segments;
        
        setDiffSegments(finalSegments);
      }
      
      // Calculate diff statistics
      calculateDiffStatistics(diffResult);
    } catch (error) {
      console.error('Diff calculation error:', error);
      throw new Error('Error calculating differences. Please try again.');
    } finally {
      setIsDiffing(false);
    }
  }, [preprocessText, enhanceWithIntralineDiffs, calculateDiffStatistics]);

  // Debounced diff calculation to prevent too many updates
  const debouncedCalculateDiff = useCallback((
    leftText: string, 
    rightText: string, 
    settings: DiffSettings, 
    highlightMode: 'character' | 'word' | 'line' = 'word'
  ) => {
    if (diffTimeoutRef.current) {
      clearTimeout(diffTimeoutRef.current);
    }
    
    // Check for performance concerns
    const totalLength = leftText.length + rightText.length;
    setPerformanceWarning(totalLength > TEXT_SIZE_THRESHOLD);
    
    diffTimeoutRef.current = setTimeout(() => {
      calculateDiff(leftText, rightText, settings, highlightMode);
    }, 300);
  }, [calculateDiff]);

  // Clear all diff data
  const clearDiff = useCallback(() => {
    setDiffSegments([]);
    setDiffStats(null);
    setPerformanceWarning(false);
    if (diffTimeoutRef.current) {
      clearTimeout(diffTimeoutRef.current);
    }
  }, []);

  return {
    diffSegments,
    diffStats,
    isDiffing,
    performanceWarning,
    calculateDiff,
    debouncedCalculateDiff,
    clearDiff
  };
};

export default useIntelligentDiff;