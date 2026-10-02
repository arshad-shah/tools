import { useState } from 'react';
import {
  FieldBox,
  Input,
  OverlayLayer,
  PageBox,
  PageText,
  PointerLayer,
  Sized,
  Text,
  type FieldBoxState,
  type OverlayTransform,
  type PagePoint,
} from '@/shared/ui';
import { IconFieldTick } from '@/shared/ui/icons';
import { Row, Section } from '../Section';

/** A letter page (612 x 792 pt) at half size. */
const PAGE = { width: 306, height: 396 };
const T: OverlayTransform = { a: 0.5, b: 0, c: 0, d: -0.5, e: 0, f: 396 };

const FIELDS: { state: FieldBoxState; label: string; y: number }[] = [
  { state: 'field', label: 'Text field: Surname, empty', y: 700 },
  { state: 'suggested', label: 'Text field: unlabelled, empty', y: 640 },
  { state: 'filled', label: 'Text field: Forename, filled', y: 580 },
  { state: 'error', label: 'Text field: Postcode, empty', y: 460 },
];

export function FormFieldsSection() {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('Doe');
  const [marks, setMarks] = useState<PagePoint[]>([{ x: 306, y: 396 }]);
  return (
    <Section name="form-fields" title="Form fields">
      <Row label="FieldBox: field, suggested, filled, focused with editor, error">
        <Sized
          width={PAGE.width}
          height={PAGE.height}
          className="relative rounded-sm bg-surface shadow-page"
        >
          <OverlayLayer
            width={PAGE.width}
            height={PAGE.height}
            label="Page 1 fields"
            interactive
          >
            {FIELDS.map((f) => (
              <FieldBox
                key={f.label}
                transform={T}
                box={{ x: 72, y: f.y, width: 300, height: 30 }}
                state={f.state}
                label={f.label}
                onActivate={() => {}}
                inTabOrder={f.state !== 'suggested'}
              />
            ))}
            <FieldBox
              transform={T}
              box={{ x: 72, y: 520, width: 300, height: 30 }}
              state={editing ? 'focused' : 'filled'}
              label={`Text field: Occupation, ${value ? 'filled' : 'empty'}`}
              onActivate={() => setEditing(true)}
              inTabOrder
            >
              {editing ? (
                <Input
                  aria-label="Occupation"
                  value={value}
                  autoFocus
                  onChange={setValue}
                  onBlur={() => setEditing(false)}
                  className="h-full min-h-0 px-1 py-0 text-xs"
                />
              ) : undefined}
            </FieldBox>
          </OverlayLayer>
        </Sized>
        <Text size="sm" tone="muted" className="max-w-xs">
          Suggested fields stay out of the Tab order until accepted. Activate
          the Occupation field to open its inline editor.
        </Text>
      </Row>
      <Row label="PageText: letter spacing, and 8 character boxes">
        <Sized
          width={PAGE.width}
          height={120}
          className="relative rounded-sm bg-surface shadow-page"
        >
          <OverlayLayer width={PAGE.width} height={120} label="Typed text">
            <PageText
              transform={{ ...T, f: 120 }}
              box={{ x: 40, y: 150, width: 300, height: 20 }}
              text="Spaced"
              size={12}
              color="#111827"
              x={[0, 12, 22, 33, 44, 55]}
              baseline={5}
            />
            <PageText
              transform={{ ...T, f: 120 }}
              box={{ x: 40, y: 60, width: 160, height: 20 }}
              text="20261002"
              size={12}
              color="#1e3a8a"
              x={[0, 1, 2, 3, 4, 5, 6, 7].map((i) => 20 * i + 6.7)}
              baseline={5}
            />
            <PageBox
              transform={{ ...T, f: 120 }}
              box={{ x: 40, y: 60, width: 160, height: 20 }}
              className="rounded-sm border border-dashed border-line-strong"
            />
          </OverlayLayer>
        </Sized>
        <Text size="sm" tone="muted" className="max-w-xs">
          Each character sits where the export writes it: the caller lays the
          line out and the kit draws it.
        </Text>
      </Row>
      <Row label="PointerLayer: click to place, page-space points">
        <Sized
          width={PAGE.width}
          height={PAGE.height}
          className="relative rounded-sm bg-surface shadow-page"
        >
          <OverlayLayer
            width={PAGE.width}
            height={PAGE.height}
            label="Click to place a tick"
            interactive
          >
            <PointerLayer
              transform={T}
              onPoint={(p) => setMarks((m) => [...m.slice(-4), p])}
            />
            {marks.map((p, i) => (
              <PageBox
                key={i}
                transform={T}
                box={{ x: p.x - 10, y: p.y - 10, width: 20, height: 20 }}
                className="pointer-events-none text-accent-fg"
              >
                <IconFieldTick size="sm" />
              </PageBox>
            ))}
          </OverlayLayer>
        </Sized>
        <Text size="sm" tone="muted" className="max-w-xs">
          Pointer only: every use pairs it with a keyboard path.
        </Text>
      </Row>
    </Section>
  );
}
