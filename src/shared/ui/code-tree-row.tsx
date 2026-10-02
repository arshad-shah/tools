import { cn } from '@/shared/lib/cn';
import { IconChevronRight } from './icons';
import { TOKEN_CLASS, isExpandable, type FlatTreeRow } from './code-tree-model';

export type CodeTreeRowStyle = 'code' | 'plain';

interface GuideProps {
  /** Line continues below this row. */
  through: boolean;
  /** Accent: this column belongs to an ancestor of the selection. */
  accent: boolean;
}

/** One indent column with its vertical guide (decorative). */
function Guide({ through, accent }: GuideProps) {
  return (
    <span
      aria-hidden="true"
      data-guide={through ? 'through' : 'end'}
      data-guide-accent={accent || undefined}
      className="relative h-full w-4 shrink-0"
    >
      <span
        className={cn(
          'absolute top-0 left-[7px] border-l',
          through ? 'bottom-0' : 'h-1/2',
          accent ? 'border-accent-indicator' : 'border-line-strong',
        )}
      />
    </span>
  );
}

export interface CodeTreeRowProps {
  row: FlatTreeRow;
  expanded: boolean;
  rowStyle: CodeTreeRowStyle;
  /** Guide columns drawn in the accent colour (by depth). */
  accentColumns: ReadonlySet<number>;
  onToggle(): void;
}

/**
 * Content of one tree row: indent guides, the fold chevron and the code-like
 * text `label: value,` (or the summary chip while folded).
 */
export function CodeTreeRow({
  row,
  expanded,
  rowStyle,
  accentColumns,
  onToggle,
}: CodeTreeRowProps) {
  const { node, depth, isLast, ancestorsLast } = row;
  const canExpand = isExpandable(node);
  const folded = canExpand && !expanded;
  const code = rowStyle === 'code';

  const guides = [];
  for (let d = 0; d < depth; d++) {
    const through = d === depth - 1 ? !isLast : !ancestorsLast[d + 1];
    guides.push(
      <Guide key={d} through={through} accent={accentColumns.has(d)} />,
    );
  }

  const showChip = folded && node.summary !== undefined;
  const hasTail = node.value !== undefined || showChip;
  const comma = code && !isLast && (node.value !== undefined || folded);

  return (
    <div className="flex h-full min-w-max items-center pr-3 font-mono text-sm leading-none whitespace-pre">
      {guides}
      <span
        aria-hidden="true"
        data-toggle={canExpand || undefined}
        className={cn(
          'flex h-full w-4 shrink-0 items-center justify-center text-fg-subtle',
          canExpand && 'cursor-pointer hover:text-fg',
        )}
        onClick={
          canExpand
            ? (e) => {
                e.stopPropagation();
                onToggle();
              }
            : undefined
        }
      >
        {canExpand && (
          <IconChevronRight
            size="xs"
            className={cn(
              'motion-safe:transition-transform',
              expanded && 'rotate-90',
            )}
          />
        )}
      </span>
      {node.label !== '' && (
        <span className={code ? TOKEN_CLASS.key : 'text-fg'}>{node.label}</span>
      )}
      {code && node.label !== '' && hasTail && (
        <span className={TOKEN_CLASS.punct}>{': '}</span>
      )}
      {!code && node.label !== '' && hasTail && ' '}
      {node.value !== undefined && (
        <span className={TOKEN_CLASS[node.value.kind]}>{node.value.text}</span>
      )}
      {showChip && (
        <span
          data-summary=""
          className={cn(
            'rounded-sm border border-line bg-surface-2 px-1 py-0.5 text-xs text-fg-muted',
            node.value !== undefined && 'ml-1',
          )}
        >
          {node.summary}
        </span>
      )}
      {comma && <span className={TOKEN_CLASS.punct}>,</span>}
    </div>
  );
}
