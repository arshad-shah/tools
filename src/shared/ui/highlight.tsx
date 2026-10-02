import { cn } from '@/shared/lib/cn';

export interface HighlightProps {
  text: string;
  /** Start of the highlighted run (UTF-16 offset). */
  start: number;
  length: number;
  className?: string;
}

/** Text with one run marked (search results, match context). */
export function Highlight({ text, start, length, className }: HighlightProps) {
  const from = Math.max(0, Math.min(text.length, start));
  const to = Math.max(from, Math.min(text.length, start + length));
  return (
    <span className={className}>
      {text.slice(0, from)}
      <mark className={cn('rounded-sm bg-warning-soft px-0.5 text-fg')}>
        {text.slice(from, to)}
      </mark>
      {text.slice(to)}
    </span>
  );
}
Highlight.displayName = 'Highlight';
