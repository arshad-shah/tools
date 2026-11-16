import { EmptyState, ListRow, ListRows, Sheet } from '@arshad-shah/cynosure';
import { heading } from '@arshad-shah/cynosure/icons';
import type { OutlineItem } from '../lib/render';

export interface OutlineProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  items: OutlineItem[];
  /** Goes to the heading: its source line (editor) or id (preview). */
  onJump(item: OutlineItem): void;
}

/**
 * The document's headings in a side sheet; choosing one jumps there (the
 * editor caret, or the preview when it is the one shown).
 */
export function Outline({ open, onOpenChange, items, onJump }: OutlineProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="end" title="Outline">
      {items.length === 0 ? (
        <EmptyState
          size="sm"
          icon={heading}
          title="No headings yet"
          description="Start a line with # to add a heading."
        />
      ) : (
        <ListRows label="Headings" size="sm">
          {items.map((item, i) => (
            <ListRow
              key={`${item.id}-${i}`}
              label={item.text || 'Untitled heading'}
              description={`Heading ${item.depth}`}
              onClick={() => {
                onJump(item);
                onOpenChange(false);
              }}
            />
          ))}
        </ListRows>
      )}
    </Sheet>
  );
}
