import { Icon } from '@arshad-shah/cynosure';
import { chevronRight } from '@arshad-shah/cynosure/icons';
import { isExpandable, type FlatTreeRow } from './code-tree-model';

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
      className="tools-tree-guide"
    >
      <span className="tools-tree-guide-line" />
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
    <div className="tools-tree-row">
      {guides}
      <span
        aria-hidden="true"
        data-toggle={canExpand || undefined}
        className="tools-tree-toggle"
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
          <span
            className="tools-tree-chevron"
            data-open={expanded || undefined}
          >
            <Icon icon={chevronRight} size={12} />
          </span>
        )}
      </span>
      {node.label !== '' && (
        <span data-token={code ? 'key' : 'plain'}>{node.label}</span>
      )}
      {code && node.label !== '' && hasTail && (
        <span data-token="punct">{': '}</span>
      )}
      {/* A bare space would be dropped as a whitespace-only flex item. */}
      {!code && node.label !== '' && hasTail && <span> </span>}
      {node.value !== undefined && (
        <span data-token={node.value.kind}>{node.value.text}</span>
      )}
      {showChip && (
        <span
          data-summary=""
          className="tools-tree-summary"
          data-after-value={node.value !== undefined || undefined}
        >
          {node.summary}
        </span>
      )}
      {comma && <span data-token="punct">,</span>}
    </div>
  );
}
