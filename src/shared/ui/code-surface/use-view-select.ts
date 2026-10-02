import { useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { matchesHotkey } from '@/shared/lib/hotkeys';

/**
 * Keys of the view-mode textbox (no textarea): Mod+F opens find, Mod+A
 * selects everything (tinted) so a copy takes the whole text, Escape or a
 * pointer press drops the selection.
 */
export function useViewSelectAll(openFind: () => void, fullText: () => string) {
  const [selectAll, setSelectAll] = useState(false);
  return {
    selectAll,
    onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
      if (matchesHotkey(e, 'Mod+F')) {
        e.preventDefault();
        openFind();
      } else if (matchesHotkey(e, 'Mod+A')) {
        e.preventDefault();
        setSelectAll(true);
      } else if (e.key === 'Escape') setSelectAll(false);
    },
    onCopy(e: ClipboardEvent<HTMLDivElement>) {
      if (!selectAll) return;
      e.preventDefault();
      e.clipboardData.setData('text/plain', fullText());
    },
    reset: () => setSelectAll(false),
  };
}
