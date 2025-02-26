import { useCallback, useEffect, useRef, useState } from "react";

// Cursor and Line Tracking Hook
export const useLineTracking = (value: string, textareaRef: React.RefObject<HTMLTextAreaElement>) => {
  const [currentLine, setCurrentLine] = useState<number>();
  const lastCursorPosition = useRef<number>(0);

  const getLineNumberFromCursor = useCallback((cursorPosition: number): number => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    return (textBeforeCursor.match(/\n/g) || []).length + 1;
  }, [value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleSelectionChange = () => {
      const cursorPosition = textarea.selectionStart;
      if (cursorPosition !== lastCursorPosition.current) {
        lastCursorPosition.current = cursorPosition;
        const lineNumber = getLineNumberFromCursor(cursorPosition);
        setCurrentLine(lineNumber);
      }
    };

    textarea.addEventListener('select', handleSelectionChange);
    textarea.addEventListener('click', handleSelectionChange);
    textarea.addEventListener('keyup', handleSelectionChange);

    return () => {
      textarea.removeEventListener('select', handleSelectionChange);
      textarea.removeEventListener('click', handleSelectionChange);
      textarea.removeEventListener('keyup', handleSelectionChange);
    };
  }, [getLineNumberFromCursor]);

  return { currentLine, getLineNumberFromCursor };
};
