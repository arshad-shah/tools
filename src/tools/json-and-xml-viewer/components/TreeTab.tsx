import { useEffect, useMemo, useRef, useState } from 'react';
import { IconChevronDown, IconChevronUp } from '@/shared/ui/icons';
import {
  Button,
  CodeTree,
  IconButton,
  Inline,
  Label,
  SearchInput,
  Select,
  Stack,
  Switch,
  Text,
  type CodeTreeHandle,
} from '@/shared/ui';
import type { DocNode } from '../lib/doc-model';
import type { SearchResult } from '../lib/search';
import {
  allExpandable,
  expandToDepth,
  toTreeData,
  withAncestors,
} from '../lib/to-tree';

const DEPTHS = [1, 2, 3, 4, 5];

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
 * The Tree tab (spec §7.2): a virtualised, code-like tree with expand
 * controls and search. A selection made elsewhere expands its ancestors
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
    <Stack gap="2" className="h-full min-h-0">
      <Inline gap="2" wrap>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setExpanded(allExpandable(doc))}
        >
          Expand all
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setExpanded(new Set())}
        >
          Collapse all
        </Button>
        <Inline gap="2">
          <Label htmlFor="json-xml-depth">Expand to depth</Label>
          <Select
            id="json-xml-depth"
            className="w-20"
            value={depth}
            onValueChange={(v) => {
              setDepth(v);
              setExpanded(expandToDepth(doc, Number(v)));
            }}
            items={DEPTHS.map((d) => ({ value: String(d), label: String(d) }))}
          />
        </Inline>
      </Inline>
      <Inline gap="2" wrap>
        <SearchInput
          ref={searchRef}
          className="min-w-48 flex-1"
          aria-label="Search the tree"
          placeholder="Search keys and values"
          value={search.term}
          onChange={(term) => onSearchChange({ ...search, term, active: 0 })}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            step(e.shiftKey ? -1 : 1);
          }}
          aria-invalid={result.error ? true : undefined}
        />
        <IconButton
          label="Previous match"
          icon={IconChevronUp}
          size="sm"
          variant="ghost"
          disabled={!matches.length}
          onClick={() => step(-1)}
        />
        <IconButton
          label="Next match"
          icon={IconChevronDown}
          size="sm"
          variant="ghost"
          disabled={!matches.length}
          onClick={() => step(1)}
        />
        <Inline gap="2">
          <Switch
            id="json-xml-regex"
            checked={search.regex}
            onCheckedChange={(regex) =>
              onSearchChange({ ...search, regex, active: 0 })
            }
          />
          <Label htmlFor="json-xml-regex">Regex</Label>
        </Inline>
        <Text
          size="sm"
          tone={result.error ? 'default' : 'muted'}
          className={result.error ? 'text-danger' : undefined}
          aria-live="polite"
          role={result.error ? 'alert' : undefined}
        >
          {status}
        </Text>
      </Inline>
      <CodeTree
        ref={tree}
        className="min-h-0 flex-1"
        height="100%"
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
