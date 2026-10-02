import { Button, Drawer, EmptyState } from '@/shared/ui';
import type { OutlineItem } from '../lib/render';

const INDENT = ['pl-0', 'pl-0', 'pl-4', 'pl-8', 'pl-12', 'pl-16', 'pl-20'];

export interface OutlineProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  items: OutlineItem[];
  /** Goes to the heading: its source line (editor) or id (preview). */
  onJump(item: OutlineItem): void;
}

/**
 * The document's headings in a drawer; a click jumps there (the editor
 * caret, or the preview when it is shown).
 */
export function Outline({ open, onOpenChange, items, onJump }: OutlineProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Outline">
      {items.length === 0 ? (
        <EmptyState
          size="sm"
          title="No headings yet"
          description="Start a line with # to add a heading."
        />
      ) : (
        <ul aria-label="Headings" className="flex flex-col gap-1">
          {items.map((item, i) => (
            <li key={`${item.id}-${i}`} className={INDENT[item.depth]}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  onJump(item);
                  onOpenChange(false);
                }}
              >
                {item.text || 'Untitled heading'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
