import { useState } from 'react';
import {
  ColorField,
  ColorPicker,
  ColorRamp,
  ContrastPair,
  Swatch,
} from '@/shared/ui';
import { Row, Section } from '../Section';

const BRAND = [
  '#1d5fc4',
  '#0e7c86',
  '#c4580f',
  '#b3268a',
  '#0f1419',
  '#ffffff',
];
const RECENT = ['#3ddc97', '#f2c94c', 'oklch(0.62 0.19 25)'];

export function ColourSection() {
  const [srgb, setSrgb] = useState('#1d5fc4');
  const [oklch, setOklch] = useState('oklch(0.7 0.15 160 / 0.8)');
  const [field, setField] = useState('#0e7c86');
  const [badField, setBadField] = useState('#12345g');
  const [rampPick, setRampPick] = useState('');
  return (
    <Section name="colour" title="Colour">
      <Row label="Swatch: chip and dot in sm, md, lg; selected; alpha; flag">
        {(['sm', 'md', 'lg'] as const).map((size) => (
          <Swatch
            key={`chip-${size}`}
            color="#1d5fc4"
            label={`Blue chip ${size}`}
            size={size}
          />
        ))}
        {(['sm', 'md', 'lg'] as const).map((size) => (
          <Swatch
            key={`dot-${size}`}
            color="oklch(0.7 0.15 160)"
            label={`Green dot ${size}`}
            size={size}
            variant="dot"
          />
        ))}
        <Swatch color="accent" label="Accent token" selected />
        <Swatch color="rgb(196 88 15 / 0.5)" label="Half orange" size="lg" />
        <Swatch
          color="#f2c94c"
          label="Yellow on white"
          size="lg"
          flag="fails contrast"
        />
        <Swatch color="transparent" label="Transparent" size="lg" />
      </Row>
      <Row label="Swatch: block in sm, md, lg">
        <div className="grid w-full max-w-md gap-2">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Swatch
              key={`block-${size}`}
              color="hsl(330 65% 46%)"
              label={`Magenta block ${size}`}
              size={size}
              variant="block"
            />
          ))}
        </div>
      </Row>
      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0 md:grid-cols-2">
        <Row label="ColorPicker: srgb, palette, recent">
          <ColorPicker
            label="Brand colour"
            value={srgb}
            onChange={(css) => setSrgb(css)}
            palette={BRAND}
            recent={RECENT}
            className="w-full max-w-xs"
          />
        </Row>
        <Row label="ColorPicker: oklch, alpha, ramp">
          <ColorPicker
            label="Accent colour"
            mode="oklch"
            alpha
            showRamp
            defaultFormat="oklch"
            value={oklch}
            onChange={(css) => setOklch(css)}
            recent={[]}
            className="w-full max-w-xs"
          />
        </Row>
      </div>
      <Row label="ColorField: valid, invalid, disabled">
        <div className="grid w-full grid-cols-1 items-start gap-4 [&>*]:min-w-0 md:grid-cols-3">
          <div className="min-w-0">
            <ColorField
              label="Link colour"
              value={field}
              onChange={(css) => setField(css)}
              palette={BRAND}
              recent={RECENT}
            />
          </div>
          <div className="min-w-0">
            <ColorField
              label="Border colour"
              value={badField}
              onChange={(css) => setBadField(css)}
              recent={[]}
            />
          </div>
          <div className="min-w-0">
            <ColorField
              label="Locked colour"
              value="#4a5363"
              onChange={() => {}}
              disabled
              recent={[]}
            />
          </div>
        </div>
      </Row>
      <Row label="ColorRamp: read-only, selectable, invalid base">
        <div className="grid w-full grid-cols-1 gap-3 [&>*]:min-w-0">
          <ColorRamp base="#1d5fc4" label="Blue ramp" />
          <ColorRamp
            base="oklch(0.65 0.17 30)"
            label="Coral ramp"
            value={rampPick}
            onSelect={(css) => setRampPick(css)}
            size="lg"
          />
          <ColorRamp base="not a colour" label="Broken ramp" size="sm" />
        </div>
      </Row>
      <Row label="ContrastPair: pass, AAA fail, invalid input">
        <div className="grid w-full grid-cols-1 gap-3 [&>*]:min-w-0 lg:grid-cols-3">
          <ContrastPair fg="#0f1419" bg="#ffffff" label="Body text" />
          <ContrastPair
            fg="#5e6878"
            bg="#ffffff"
            label="Muted text"
            sample="Passes AA, fails AAA"
          />
          <ContrastPair fg="#12345g" bg="#ffffff" label="Bad input" />
        </div>
      </Row>
    </Section>
  );
}
