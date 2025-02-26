/* eslint-disable no-useless-escape */
import { tokenStyles } from "../globalStyles";
import { useCallback } from "react";
import DOMPurify from 'dompurify';
import { ProcessedLine } from "../../../types/DataViewerTypes";

// Syntax Highlighting Hook
export const useSyntaxHighlighting = (
  format: 'json' | 'xml',
  searchTerm: string,
  onError?: (error: string) => void
) => {
  const escapeHtml = useCallback((unsafe: string): string => {
    const div = document.createElement('div');
    div.textContent = unsafe;
    return div.innerHTML;
  }, []);

  const processAndHighlight = useCallback((
    code: string,
    getLineNumberFromCursor: (pos: number) => number
  ): { html: string; lines: ProcessedLine[]; highlightedLineNumbers: number[] } => {
    try {
      let processed = escapeHtml(code);
      const highlightedLineNumbers: number[] = [];

      if (format === 'json') {
        processed = processed.replace(
          /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
          (match) => {
            let tokenType = 'number';
            if (/^"/.test(match)) {
              tokenType = /:$/.test(match) ? 'key' : 'string';
            } else if (tokenStyles.boolean.test?.test(match)) {
              tokenType = 'boolean';
            } else if (tokenStyles.null.test?.test(match)) {
              tokenType = 'null';
            }

            const style = tokenStyles[tokenType];
            return `<span class="${style.className}">${match}</span>`;
          }
        );
      } else {
        processed = processed.replace(
          /(&lt;\/?[^>]+>)|([a-zA-Z-]+)="([^"]*?)"/g,
          ( tag, attr, value) => {
            if (tag) {
              return `<span class="${tokenStyles.tag.className}">${tag}</span>`;
            }
            return `<span class="${tokenStyles.attr.className}">${attr}</span>="<span class="${tokenStyles.value.className}">${value}</span>"`;
          }
        );
      }

      if (searchTerm) {
        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(`(${escapedSearchTerm})`, 'gi');
        processed = processed.replace(
          searchRegex,
          ( group, offset) => {
            const lineNumber = getLineNumberFromCursor(offset);
            if (!highlightedLineNumbers.includes(lineNumber)) {
              highlightedLineNumbers.push(lineNumber);
            }
            return `<mark class="bg-yellow-200 ">${group}</mark>`;
          }
        );
      }

      const sanitizedHtml = DOMPurify.sanitize(processed);

      const lines = sanitizedHtml.split('\n').map((line, index) => ({
        number: index + 1,
        content: line,
        isHighlighted: highlightedLineNumbers.includes(index + 1)
      }));

      return { html: sanitizedHtml, lines, highlightedLineNumbers };
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Syntax highlighting error');
      return { html: escapeHtml(code), lines: [], highlightedLineNumbers: [] };
    }
  }, [format, searchTerm, escapeHtml, onError]);

  return { processAndHighlight };
};