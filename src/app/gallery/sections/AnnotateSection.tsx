import { useState } from 'react';
import {
  ColorSwatchPicker,
  OverlayText,
  Sized,
  type OverlayTransform,
} from '@/shared/ui';
import { Row, Section } from '../Section';

/** A letter page (612 x 792 pt) at half size. */
const PAGE = { width: 306, height: 396 };
const T: OverlayTransform = { a: 0.5, b: 0, c: 0, d: -0.5, e: 0, f: 396 };

/** Annotate and Edit primitives: overlay text in the export fonts. */
const INKS = [
  { value: '#ffd400', label: 'Yellow' },
  { value: '#5fd068', label: 'Green' },
  { value: '#4aa8ff', label: 'Blue' },
  { value: '#ff6fb5', label: 'Pink' },
  { value: '#ff4d4d', label: 'Red' },
  { value: '#a78bfa', label: 'Purple' },
];

export function AnnotateSection() {
  const [ink, setInk] = useState('#ffd400');
  return (
    <Section name="annotate" title="Annotate and Edit">
      <Row label="ColorSwatchPicker">
        <ColorSwatchPicker
          label="Colour"
          value={ink}
          onChange={setInk}
          options={INKS}
          allowCustom
        />
      </Row>
      <Row label="ColorSwatchPicker (visible label, disabled)">
        <ColorSwatchPicker
          label="Ink colour"
          showLabel
          value="#111827"
          onChange={() => {}}
          options={[
            { value: '#111827', label: 'Black' },
            { value: '#1d4ed8', label: 'Blue' },
            { value: '#1e3a8a', label: 'Dark blue' },
          ]}
          disabled
        />
      </Row>
      <Row label="OverlayText (left, centre, rotated)">
        <Sized
          width={PAGE.width}
          height={PAGE.height}
          className="relative rounded-sm bg-surface shadow-page"
        >
          <OverlayText
            transform={T}
            box={{ x: 60, y: 640, width: 300, height: 80 }}
            lines={['A text box drawn with', 'the export layout']}
            text=""
            family="helvetica"
            size={20}
            color="#1f2937"
            align="left"
            width={PAGE.width}
            height={PAGE.height}
          />
          <OverlayText
            transform={T}
            box={{ x: 60, y: 420, width: 480, height: 120 }}
            text="DRAFT"
            family="helvetica"
            size={72}
            color="#c02727"
            align="center"
            valign="middle"
            rotate={30}
            opacity={0.4}
            width={PAGE.width}
            height={PAGE.height}
          />
          <OverlayText
            transform={T}
            box={{ x: 60, y: 40, width: 492, height: 24 }}
            text="Page 1 of 3"
            family="noto"
            size={12}
            color="#334155"
            align="center"
            valign="middle"
            width={PAGE.width}
            height={PAGE.height}
          />
        </Sized>
      </Row>
    </Section>
  );
}
