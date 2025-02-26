/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useRef, useState } from 'react';
export const useLineInteractions = (
  value: string,
  format: 'json' | 'xml',
  searchTerm: string,
  onError?: (error: string) => void
) => {
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const getLineContent = useCallback((lineNumber: number): string => {
    const lines = value.split('\n');
    return lines[lineNumber - 1] || '';
  }, [value]);

  const handleLineClick = useCallback((
    lineNumber: number,
    textareaRef: React.RefObject<HTMLTextAreaElement>
  ) => {
    const lines = value.split('\n');
    let position = 0;
    for (let i = 0; i < lineNumber - 1; i++) {
      position += lines[i].length + 1;
    }
    
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(position, position);
    }
  }, [value]);

  const handleLineHover = useCallback((lineNumber: number) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    setHoveredLine(lineNumber);

    const lineContent = getLineContent(lineNumber);
    if (searchTerm && lineContent.toLowerCase().includes(searchTerm.toLowerCase())) {
      if (!highlightedLines.includes(lineNumber)) {
        setHighlightedLines(prev => [...prev, lineNumber]);
        
        hoverTimeoutRef.current = setTimeout(() => {
          setHighlightedLines(prev => prev.filter(line => line !== lineNumber));
        }, 2000);
      }
    }

    try {
      if (format === 'json') {
        const lineContent = getLineContent(lineNumber);
        if (lineContent.includes(',,')) {
          onError?.('Double comma detected');
        }
        if (lineContent.includes('::')) {
          onError?.('Invalid colon usage');
        }
        if ((lineContent.match(/"/g) || []).length % 2 !== 0) {
          onError?.('Unclosed string literal');
        }
      }
    } catch (error) {
      // Ignore parsing errors during hover
    }
  }, [format, searchTerm, highlightedLines, getLineContent, onError]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return {
    hoveredLine,
    highlightedLines,
    setHighlightedLines,
    handleLineClick,
    handleLineHover,
    getLineContent
  };
};
