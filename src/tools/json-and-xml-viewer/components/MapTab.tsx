import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DiagramCanvas,
  Inline,
  Label,
  Select,
  Stack,
  Text,
  type DiagramCanvasHandle,
} from '@/shared/ui';
import {
  ancestors,
  findById,
  isContainer,
  type DocNode,
} from '../lib/doc-model';
import { toDiagram } from '../lib/to-diagram';
import { viewerSettings } from '../settings';

/** A person's pan or zoom holds the view still for this long. */
export const PAN_HOLD_MS = 2000;

const CAPS = [500, 2000, 5000];
const fmt = new Intl.NumberFormat('en-US');

export interface MapTabProps {
  doc: DocNode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Search hits (doc ids), drawn as highlighted rows and cards. */
  matches?: ReadonlySet<string>;
  /** Base of the export file names, e.g. `data` gives `data-map.png`. */
  fileBase: string;
}

/** Deepest container nesting, for the canvas summary. */
function levels(doc: DocNode): number {
  let max = 0;
  const stack: [DocNode, number][] = [[doc, 1]];
  while (stack.length) {
    const [n, d] = stack.pop()!;
    if (!isContainer(n)) continue;
    if (d > max) max = d;
    for (const c of n.children ?? []) stack.push([c, d + 1]);
  }
  return max;
}

/**
 * The Map tab (spec §7.2): the document as a card diagram, kept in sync with
 * the Tree selection. Cards beyond the node cap fold into `more` rows that
 * expand on click.
 */
export function MapTab({
  doc,
  selectedId,
  onSelect,
  matches,
  fileBase,
}: MapTabProps) {
  const [settings, update] = viewerSettings.useSettings();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [seenDoc, setSeenDoc] = useState(doc);
  if (seenDoc !== doc) {
    setSeenDoc(doc);
    setExpanded(new Set());
  }

  const { diagram, total, shown, rowOwner } = useMemo(
    () => toDiagram(doc, { cap: settings.cap, expanded }),
    [doc, settings.cap, expanded],
  );
  const depth = useMemo(() => levels(doc), [doc]);

  // Where the selection shows: its card, a row of its parent's card, or the
  // nearest shown ancestor when the cap hides it.
  const target = useMemo(() => {
    if (!selectedId) return null;
    const own = rowOwner.get(selectedId);
    if (own) return own;
    for (const id of ancestors(doc, selectedId).reverse()) {
      const o = rowOwner.get(id);
      if (o) return o;
    }
    return null;
  }, [doc, rowOwner, selectedId]);

  const cardMatches = useMemo(() => {
    if (!matches?.size) return undefined;
    const out = new Set<string>();
    for (const id of matches) {
      const o = rowOwner.get(id);
      if (o?.row === -1) out.add(o.cardId);
    }
    return out;
  }, [matches, rowOwner]);

  const canvas = useRef<DiagramCanvasHandle>(null);
  const lastUserPan = useRef(-Infinity);
  const reveal = useCallback((cardId: string | undefined) => {
    if (!cardId || performance.now() - lastUserPan.current < PAN_HOLD_MS)
      return;
    canvas.current?.reveal(cardId);
  }, []);

  // Bring a selection made elsewhere (the Tree, a query) into view.
  const targetCard = target?.cardId;
  useEffect(() => reveal(targetCard), [reveal, targetCard]);

  const handleSelect = (cardId: string | null, row?: number) => {
    if (cardId === null) return onSelect(null);
    if (row === undefined) return onSelect(cardId);
    const child = findById(doc, cardId)?.children?.[row];
    onSelect(child?.id ?? cardId);
  };

  const summary = `Map of ${fmt.format(shown)} objects, ${depth} ${
    depth === 1 ? 'level' : 'levels'
  } deep. Use the Tree view for full keyboard and screen-reader navigation.`;

  return (
    <Stack gap="2" className="h-full min-h-0">
      <Inline justify="between" wrap>
        <Text size="sm" tone="muted" aria-live="polite">
          {shown < total
            ? `Showing ${fmt.format(shown)} of ${fmt.format(total)} objects`
            : `${fmt.format(total)} ${total === 1 ? 'object' : 'objects'}`}
        </Text>
        <Inline gap="2">
          <Label htmlFor="json-xml-node-cap">Node cap</Label>
          <Select
            id="json-xml-node-cap"
            className="w-28"
            value={String(settings.cap)}
            onValueChange={(v) => update({ cap: Number(v) })}
            items={CAPS.map((c) => ({
              value: String(c),
              label: fmt.format(c),
            }))}
          />
        </Inline>
      </Inline>
      <DiagramCanvas
        ref={canvas}
        className="min-h-80 flex-1"
        diagram={diagram}
        direction={settings.direction}
        minimap={settings.minimap}
        selectedId={target?.cardId ?? null}
        selectedRow={target && target.row >= 0 ? target.row : null}
        onSelect={handleSelect}
        matches={cardMatches}
        onExpandMore={(id) => setExpanded((s) => new Set(s).add(id))}
        onViewportChange={(_v, user) => {
          if (user) lastUserPan.current = performance.now();
        }}
        onLayout={() => reveal(target?.cardId)}
        exportName={`${fileBase}-map`}
        ariaLabel="Map of the document"
        ariaSummary={summary}
      />
    </Stack>
  );
}
