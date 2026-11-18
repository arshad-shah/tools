import {
  Button,
  IconButton,
  Inline,
  Menu,
  SearchField,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure';
import { chevronDown, chevronUp } from '@arshad-shah/cynosure/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CodeTree,
  type CodeTreeHandle,
} from '@/shared/surfaces/code-tree/code-tree';
import type { DocNode } from '../lib/doc-model';
import type { SearchResult } from '../lib/search';
import {
  allExpandable,
  expandToDepth,
  toTreeData,
  withAncestors,
} from '../lib/to-tree';

const DEPTHS = [1, 2, 3, 4, 5];

/** The tree's height: the Shell gives views no height of their own. */
const VIEW_HEIGHT = 640;

export interface TreeSearchState {
  term: string;
  regex: boolean;
  /** Index of the current match in document order. */
  active: number;
}

export interface TreeTabProps {
  doc: DocNode;
  selectedId: string | null;
  onSelect(id: string): void;
  search: TreeSearchState;
  onSearchChange(next: TreeSearchState): void;
  result: SearchResult;
  searchRef?: React.Ref<HTMLInputElement>;
  expanded: ReadonlySet<string>;
  onExpandedChange(next: ReadonlySet<string>): void;
}

/**
 * The Tree tab (spec §7.2): a virtualised, code-like tree with search and
 * one Expand menu (all, none, to a depth). A selection made elsewhere expands its ancestors
 * and scrolls into view.
 */
export function TreeTab({
  doc,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  result,
  searchRef,
  expanded,
  onExpandedChange: setExpanded,
}: TreeTabProps) {
  const roots = useMemo(() => toTreeData(doc), [doc]);
  const [depth, setDepth] = useState('2');

  const matches = useMemo(() => [...result.ids], [result]);
  const active = matches.length
    ? Math.min(search.active, matches.length - 1)
    : -1;
  const activeId = active >= 0 ? matches[active] : null;

  // Open the branches holding the selection and the current match.
  const targets = [selectedId, activeId].filter((x): x is string => !!x);
  const [seenTargets, setSeenTargets] = useState('');
  const key = targets.join('\n');
  if (key !== seenTargets) {
    setSeenTargets(key);
    const next = withAncestors(doc, expanded, targets);
    if (next !== expanded) setExpanded(next);
  }

  const tree = useRef<CodeTreeHandle>(null);
  useEffect(() => {
    if (selectedId) tree.current?.scrollToId(selectedId, 'center');
  }, [selectedId, expanded]);

  const step = (by: number) => {
    if (!matches.length) return;
    const next = (active + by + matches.length) % matches.length;
    onSearchChange({ ...search, active: next });
  };

  const status = result.error
    ? result.error
    : search.term
      ? matches.length
        ? `${active + 1} of ${matches.length.toLocaleString('en-US')}`
        : 'No matches'
      : '';

  return (
    <Stack gap="3" fill minSize="0">
      <Inline gap="2" align="center" justify="between" wrap>
        <Inline gap="2" align="center" wrap>
          <SearchField
            ref={searchRef}
            size="sm"
            label="Search the tree"
            labelHidden
            placeholder="Search keys and values"
            value={search.term}
            onChange={(term) => onSearchChange({ ...search, term, active: 0 })}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              step(e.shiftKey ? -1 : 1);
            }}
            error={result.error ? result.error : undefined}
          />
          {/* Stepping only means something once there are matches. */}
          {matches.length ? (
            <Inline gap="0" wrap={false}>
              <IconButton
                label="Previous match"
                icon={chevronUp}
                size="sm"
                variant="ghost"
                onClick={() => step(-1)}
              />
              <IconButton
                label="Next match"
                icon={chevronDown}
                size="sm"
                variant="ghost"
                onClick={() => step(1)}
              />
            </Inline>
          ) : null}
          {result.error ? null : (
            <Text size="sm" tone="muted" numeric aria-live="polite">
              {status}
            </Text>
          )}
        </Inline>
        <Inline gap="2" align="center" wrap={false}>
          <Switch
            size="sm"
            label="Regex"
            checked={search.regex}
            onChange={(regex) =>
              onSearchChange({ ...search, regex, active: 0 })
            }
          />
          <Menu
            label="Expand"
            items={[
              {
                items: [
                  { value: 'all', label: 'Expand all' },
                  { value: 'none', label: 'Collapse all' },
                ],
              },
              {
                label: 'Expand to depth',
                items: DEPTHS.map((d) => ({
                  value: String(d),
                  label: String(d),
                  kind: 'radio' as const,
                  checked: depth === String(d),
                })),
              },
            ]}
            onSelect={(v) => {
              if (v === 'all') setExpanded(allExpandable(doc));
              else if (v === 'none') setExpanded(new Set());
              else {
                setDepth(v);
                setExpanded(expandToDepth(doc, Number(v)));
              }
            }}
            trigger={(props) => (
              <Button {...props} size="sm" variant="soft" iconEnd={chevronDown}>
                Expand
              </Button>
            )}
          />
        </Inline>
      </Inline>
      <CodeTree
        ref={tree}
        height={VIEW_HEIGHT}
        roots={roots}
        expanded={expanded}
        onExpandedChange={setExpanded}
        selectedId={selectedId}
        onSelect={onSelect}
        search={{ ids: result.ids, activeId }}
        ariaLabel="Document tree"
        rowStyle="code"
      />
    </Stack>
  );
}
