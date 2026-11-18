import {
  Button,
  IconButton,
  Inline,
  Menu,
  Stack,
  Text,
  Toolbar,
  ZoomControls,
} from '@arshad-shah/cynosure';
import { download, locate, sliders } from '@arshad-shah/cynosure/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DiagramCanvas,
  type DiagramCanvasHandle,
} from '@/shared/surfaces/diagram-canvas/DiagramCanvas';
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
  // The zoom shown in the controls: the canvas allows 5 to 300%.
  const [percent, setPercent] = useState(100);
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

  const lr = settings.direction === 'LR';
  return (
    <Stack gap="3" fill minSize="0">
      <Inline gap="3" align="center" justify="between" wrap>
        <ZoomControls
          labels={{ group: 'Map zoom' }}
          percent={percent}
          min={5}
          max={300}
          fits={[]}
          buttons={['fit', 'actual-size']}
          onZoomChange={(zoom) => {
            if (zoom.kind === 'percent')
              canvas.current?.zoomTo(zoom.value / 100);
            else canvas.current?.fit();
          }}
        />
        <Toolbar label="Map controls">
          {target ? (
            <IconButton
              size="sm"
              variant="ghost"
              label="Centre on selection"
              icon={locate}
              onClick={() => canvas.current?.centreOn(target.cardId)}
            />
          ) : null}
          <Menu
            label="Map options"
            items={[
              {
                label: 'Layout',
                items: [
                  {
                    value: 'dir:LR',
                    label: 'Left to right',
                    kind: 'radio' as const,
                    checked: lr,
                  },
                  {
                    value: 'dir:TB',
                    label: 'Top to bottom',
                    kind: 'radio' as const,
                    checked: !lr,
                  },
                ],
              },
              {
                items: [
                  {
                    value: 'minimap',
                    label: 'Minimap',
                    kind: 'checkbox' as const,
                    checked: settings.minimap,
                  },
                ],
              },
              {
                label: 'Node cap',
                items: CAPS.map((c) => ({
                  value: `cap:${c}`,
                  label: fmt.format(c),
                  kind: 'radio' as const,
                  checked: settings.cap === c,
                })),
              },
            ]}
            onSelect={(v) => {
              if (v === 'minimap') update({ minimap: !settings.minimap });
              else if (v.startsWith('dir:'))
                update({ direction: v.slice(4) as 'LR' | 'TB' });
              else update({ cap: Number(v.slice(4)) });
            }}
            trigger={(props) => (
              <Button {...props} size="sm" variant="ghost" icon={sliders}>
                Options
              </Button>
            )}
          />
          <Menu
            label="Export the map"
            items={[
              { value: 'png', label: 'Download PNG' },
              { value: 'svg', label: 'Download SVG' },
            ]}
            onSelect={(v) =>
              v === 'png'
                ? void canvas.current?.exportPng()
                : canvas.current?.exportSvg()
            }
            trigger={(props) => (
              <Button {...props} size="sm" variant="ghost" icon={download}>
                Export
              </Button>
            )}
          />
        </Toolbar>
        <Text size="sm" tone="muted" aria-live="polite">
          {shown < total
            ? `Showing ${fmt.format(shown)} of ${fmt.format(total)} objects`
            : `${fmt.format(total)} ${total === 1 ? 'object' : 'objects'}`}
        </Text>
      </Inline>
      <DiagramCanvas
        ref={canvas}
        diagram={diagram}
        direction={settings.direction}
        minimap={settings.minimap}
        selectedId={target?.cardId ?? null}
        selectedRow={target && target.row >= 0 ? target.row : null}
        onSelect={handleSelect}
        matches={cardMatches}
        onExpandMore={(id) => setExpanded((s) => new Set(s).add(id))}
        onViewportChange={(v, user) => {
          if (user) lastUserPan.current = performance.now();
          const p = Math.round(v.scale * 100);
          setPercent((old) => (old === p ? old : p));
        }}
        onLayout={() => reveal(target?.cardId)}
        exportName={`${fileBase}-map`}
        ariaLabel="Map of the document"
        ariaSummary={summary}
      />
    </Stack>
  );
}
