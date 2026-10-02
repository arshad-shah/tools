import { useCallback, useEffect, useState } from 'react';
import {
  BitmapCanvas,
  ColorBlock,
  ColorInput,
  DateInput,
  Image,
  Indent,
  LineChart,
  PaintCanvas,
  Positioned,
  Select,
  SignaturePad,
  Sized,
  type Stroke,
} from '@/shared/ui';
import { Row, Section } from '../Section';

const SAMPLE_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#1d5fc4"/><rect x="20" y="20" width="80" height="40" fill="#3ddc97"/></svg>',
)}`;

/** A small generated bitmap: two bands, like a rendered page. */
function useSampleBitmap(): ImageBitmap | null {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  useEffect(() => {
    if (typeof OffscreenCanvas === 'undefined') return;
    const c = new OffscreenCanvas(90, 120);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 90, 120);
    ctx.fillStyle = '#4a5363';
    for (let y = 16; y < 110; y += 12) ctx.fillRect(12, y, 66, 4);
    void createImageBitmap(c).then(setBitmap);
  }, []);
  return bitmap;
}

export function MediaSection() {
  const bitmap = useSampleBitmap();
  const [color, setColor] = useState('#1d5fc4');
  const [fruit, setFruit] = useState('');
  const [date, setDate] = useState('2026-10-01');
  const [strokes, setStrokes] = useState<Stroke[]>([
    [
      { x: 20, y: 60 },
      { x: 60, y: 20 },
      { x: 100, y: 60 },
      { x: 140, y: 30 },
    ],
  ]);
  const paint = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#3ddc97';
    ctx.fillRect(8, 8, 40, 24);
  }, []);
  return (
    <Section name="media" title="Media and drawing">
      <Row label="BitmapCanvas, Image, PaintCanvas">
        <BitmapCanvas
          bitmap={bitmap}
          width={90}
          aspect={90 / 120}
          label="Sample page"
          className="bg-white shadow-e1"
        />
        <Image src={SAMPLE_SVG} alt="Sample image" className="w-30" />
        <PaintCanvas
          label="Painted sample"
          paint={paint}
          className="h-10 w-16"
        />
      </Row>
      <Row label="ColorInput, DateInput">
        <ColorInput label="Colour" value={color} onChange={setColor} />
        <div className="w-48">
          <DateInput label="Date" value={date} onChange={setDate} />
        </div>
      </Row>
      <Row label="SignaturePad, Sized and Positioned">
        <SignaturePad
          value={strokes}
          onChange={setStrokes}
          label="Draw a signature"
          ink="#0f1419"
          className="h-24 w-64 rounded-md border border-line bg-white"
        />
        <Sized
          width={160}
          height={96}
          className="relative rounded-md bg-surface-2"
        >
          <Positioned
            x={24}
            y={16}
            width={64}
            height={40}
            className="rounded-sm border-2 border-dashed border-accent"
          />
        </Sized>
      </Row>
      <Row label="ColorBlock, Indent, Select groups">
        <ColorBlock
          color={color}
          textColor="#ffffff"
          className="rounded-md px-3 py-2 text-sm"
        >
          Text on {color}
        </ColorBlock>
        <div className="text-sm text-fg">
          <Indent level={0}>root</Indent>
          <Indent level={1}>child</Indent>
          <Indent level={2}>grandchild</Indent>
        </div>
        <div className="w-48">
          <Select
            aria-label="Fruit"
            value={fruit}
            onValueChange={setFruit}
            items={[{ value: '', label: 'Pick a fruit' }]}
            groups={[
              {
                label: 'Citrus',
                items: [
                  { value: 'lemon', label: 'Lemon' },
                  { value: 'lime', label: 'Lime' },
                ],
              },
              { label: 'Berries', items: [{ value: 'fig', label: 'Fig' }] },
            ]}
          />
        </div>
      </Row>
      <Row label="LineChart">
        <div className="w-80">
          <LineChart
            label="Sample series"
            values={[3, 5, 4, 8, 6, 9]}
            height={160}
          />
        </div>
      </Row>
    </Section>
  );
}
