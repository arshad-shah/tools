import { Button, Drawer } from '@/shared/ui';
import type { OutlineItem } from '../lib/render';

const INDENT = ['pl-0', 'pl-0', 'pl-4', 'pl-8', 'pl-12', 'pl-16', 'pl-20'];

export interface OutlineProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  items: OutlineItem[];
  /** Moves the editor caret to the heading's 1-based source line. */
  onJump(line: number): void;
}

/** The document's headings in a drawer; a click jumps the editor there. */
export function Outline({ open, onOpenChange, items, onJump }: OutlineProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Outline">
      {items.length === 0 ? (
        <p className="text-sm text-fg-muted">No headings yet</p>
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
                  onJump(item.line);
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
