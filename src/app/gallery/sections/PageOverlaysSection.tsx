import { useState } from 'react';
import {
  DrawRectLayer,
  Highlight,
  HitArea,
  OverlayLayer,
  PageBox,
  SelectionFrame,
  ShapeLayer,
  Sized,
  Text,
  type OverlayTransform,
  type PageSpaceBox,
  type Shape,
} from '@/shared/ui';
import { Row, Section } from '../Section';

/** A letter page (612 x 792 pt) at half size. */
const PAGE = { width: 306, height: 396 };
const T: OverlayTransform = { a: 0.5, b: 0, c: 0, d: -0.5, e: 0, f: 396 };

const SHAPES: Shape[] = [
  {
    kind: 'rect',
    box: { x: 60, y: 640, width: 240, height: 40 },
    stroke: { token: 'redact' },
    fill: { token: 'redact' },
    hatch: true,
  },
  {
    kind: 'quads',
    quads: [[60, 600, 400, 600, 60, 580, 400, 580]],
    fill: { token: 'warning' },
    blend: 'multiply',
  },
  {
    kind: 'underline',
    quads: [[60, 560, 340, 560, 60, 540, 340, 540]],
    stroke: { token: 'info' },
    width: 1.5,
  },
  {
    kind: 'squiggly',
    quads: [[60, 520, 300, 520, 60, 500, 300, 500]],
    stroke: { token: 'danger' },
    width: 1.5,
  },
  {
    kind: 'strike',
    quads: [[60, 480, 260, 480, 60, 460, 260, 460]],
    stroke: { token: 'fg-muted' },
    width: 1.5,
  },
  {
    kind: 'ellipse',
    box: { x: 380, y: 380, width: 160, height: 90 },
    stroke: { token: 'accent-fg' },
    width: 2,
  },
  {
    kind: 'line',
    from: [100, 300],
    to: [360, 400],
    stroke: { token: 'accent-fg' },
    width: 2,
    arrowEnd: true,
  },
  {
    kind: 'ink',
    points: [
      [
        [80, 160],
        [110, 200],
        [140, 150],
        [170, 210],
        [200, 160],
      ],
    ],
    stroke: { token: 'fg' },
    width: 2,
  },
  {
    kind: 'rect',
    box: { x: 380, y: 120, width: 170, height: 60 },
    stroke: { token: 'accent-fg' },
    dash: 'dashed',
    radius: 6,
  },
];

const FIELD: PageSpaceBox = { x: 380, y: 120, width: 170, height: 60 };

/**
 * Overlay primitives on a fake page: shapes, a hit area (the accessible
 * twin of a field) and a live selection frame.
 */
export function PageOverlaysSection() {
  const [box, setBox] = useState<PageSpaceBox>({
    x: 300,
    y: 240,
    width: 180,
    height: 60,
  });
  const [rotate, setRotate] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [drawn, setDrawn] = useState<PageSpaceBox[]>([]);
  return (
    <Section name="page-overlays" title="Page overlays">
      <Row label="ShapeLayer, HitArea, SelectionFrame">
        <Sized
          width={PAGE.width}
          height={PAGE.height}
          className="relative rounded-sm bg-surface shadow-page"
        >
          <ShapeLayer
            width={PAGE.width}
            height={PAGE.height}
            transform={T}
            shapes={SHAPES}
          />
          <OverlayLayer
            width={PAGE.width}
            height={PAGE.height}
            label="Page 1 overlays"
            interactive
          >
            <HitArea
              transform={T}
              box={FIELD}
              label="Signature field"
              pressed={pressed}
              onActivate={() => setPressed((p) => !p)}
            />
            <PageBox transform={T} box={box} rotate={rotate}>
              <Text size="xs" tone="muted" className="p-1">
                Hello
              </Text>
            </PageBox>
            <SelectionFrame
              transform={T}
              box={box}
              rotate={rotate}
              resizable
              rotatable
              label="Text box: Hello"
              onChange={() => {}}
              onCommit={(b, r) => {
                setBox(b);
                setRotate(r);
              }}
            />
          </OverlayLayer>
        </Sized>
        <Text size="sm" tone="muted" className="max-w-xs">
          Focus the frame: arrows move it, Alt with arrows resizes it, the
          bracket keys rotate it, Enter commits and Esc cancels.
        </Text>
      </Row>
      <Row label="DrawRectLayer (drag on the page), Highlight">
        <Sized
          width={PAGE.width}
          height={PAGE.height}
          className="relative rounded-sm bg-surface shadow-page"
        >
          <ShapeLayer
            width={PAGE.width}
            height={PAGE.height}
            transform={T}
            shapes={drawn.map((b) => ({
              kind: 'rect' as const,
              box: b,
              stroke: { token: 'redact' as const },
              hatch: true,
            }))}
          />
          <OverlayLayer width={PAGE.width} height={PAGE.height} interactive>
            <DrawRectLayer
              width={PAGE.width}
              height={PAGE.height}
              transform={T}
              label="Draw an area on page 1"
              onDraw={(b) => setDrawn((d) => [...d, b])}
            />
          </OverlayLayer>
        </Sized>
        <Text size="sm" className="max-w-xs">
          <Highlight
            text="Account TOPSECRET-42 was closed"
            start={8}
            length={12}
          />
        </Text>
      </Row>
    </Section>
  );
}
