import { useState } from 'react';
import {
  Button,
  DocumentViewport,
  PageRail,
  SegmentedControl,
  SidePanel,
  Text,
  type RailPage,
  type ZoomSetting,
} from '@/shared/ui';
import { IconZoomFitPage, IconZoomFitWidth } from '@/shared/ui/icons';
import { Row, Section } from '../Section';

/** Forty fake pages: letter portrait with every seventh page landscape. */
const FAKE = Array.from({ length: 40 }, (_, i) => {
  const landscape = i % 7 === 6;
  return {
    id: `page-${i + 1}`,
    width: landscape ? 792 : 612,
    height: landscape ? 612 : 792,
  };
});

type Fit = 'fit-width' | 'fit-page' | 'percent';

/** The workspace's page rail and document viewport, on fake pages. */
export function DocumentSection() {
  const [order, setOrder] = useState(FAKE);
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    new Set(['page-1']),
  );
  const [current, setCurrent] = useState<string | null>('page-1');
  const [rail, setRail] = useState(160);
  const [zoom, setZoom] = useState<ZoomSetting>({ kind: 'fit-width' });
  const [jump, setJump] = useState<{ id: string; nonce: number }>();
  const pages: RailPage[] = order.map((p) => ({
    id: p.id,
    label: p.id.replace('page-', ''),
    aspect: p.width / p.height,
    badges:
      p.width > p.height ? [{ tone: 'info', label: 'Rotated' }] : undefined,
  }));
  const move = (ids: string[], to: number) =>
    setOrder((list) => {
      const moving = list.filter((p) => ids.includes(p.id));
      const rest = list.filter((p) => !ids.includes(p.id));
      rest.splice(to, 0, ...moving);
      return rest;
    });
  return (
    <Section name="document" title="Page rail and document viewport">
      <Row label="Zoom">
        <SegmentedControl<Fit>
          label="Zoom"
          value={zoom.kind}
          onChange={(k) =>
            setZoom(
              k === 'percent' ? { kind: 'percent', value: 100 } : { kind: k },
            )
          }
          options={[
            { value: 'fit-width', label: 'Fit width', icon: IconZoomFitWidth },
            { value: 'fit-page', label: 'Fit page', icon: IconZoomFitPage },
            { value: 'percent', label: '100 percent' },
          ]}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setJump({ id: order[19].id, nonce: Date.now() })}
        >
          Go to page 20
        </Button>
      </Row>
      <div className="flex h-[28rem] w-full overflow-hidden rounded-lg border border-line">
        <SidePanel
          side="left"
          label="Pages"
          width={rail}
          minWidth={120}
          maxWidth={260}
          onResize={setRail}
        >
          <PageRail
            label="Pages"
            pages={pages}
            selected={selected}
            current={current}
            width={rail}
            onSelect={(id, mods) =>
              setSelected((prev) => {
                if (!mods.meta) return new Set([id]);
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onActivate={(id) => setJump({ id, nonce: Date.now() })}
            onMove={move}
            onDelete={(ids) =>
              setOrder((list) => list.filter((p) => !ids.includes(p.id)))
            }
            renderThumb={(p) => (
              <Text size="xs" tone="subtle" className="p-2">
                Page {p.label}
              </Text>
            )}
          />
        </SidePanel>
        <div className="min-w-0 flex-1">
          <DocumentViewport
            label="Document"
            pages={order}
            zoom={zoom}
            onZoomChange={setZoom}
            scrollToPage={jump}
            onVisiblePagesChange={(ids) => setCurrent(ids[0] ?? null)}
            renderPage={({ id, index, visible }) => (
              <Text size="sm" tone="subtle" className="p-4">
                {id} at position {index + 1}
                {visible ? '' : ' (preloaded)'}
              </Text>
            )}
          />
        </div>
      </div>
    </Section>
  );
}
