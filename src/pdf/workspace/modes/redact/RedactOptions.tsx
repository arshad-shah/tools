import { useId } from 'react';
import {
  ColorInput,
  Input,
  Label,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
} from '@/shared/ui';
import { OVERLAY_TEXT, OVERLAY_TEXT_RULE } from '@/pdf/doc/ops/redact';
import { setRedactUi, useRedactUi, type RedactUi } from './ui-store';

type FillChoice = 'black' | 'white' | 'custom';
const FILLS: Record<Exclude<FillChoice, 'custom'>, string> = {
  black: '#000000',
  white: '#ffffff',
};

const choiceOf = (fill: string): FillChoice =>
  fill.toLowerCase() === FILLS.black
    ? 'black'
    : fill.toLowerCase() === FILLS.white
      ? 'white'
      : 'custom';

/** Fill colour, overlay text, image quality and snapping for new marks. */
export function RedactOptions() {
  const ui = useRedactUi();
  const textId = useId();
  const dpiId = useId();
  const snapId = useId();
  const textInvalid = !OVERLAY_TEXT.test(ui.overlayText);
  return (
    <Stack gap="3">
      <Stack gap="1">
        <Text size="sm" weight="medium" as="span">
          Fill colour
        </Text>
        <SegmentedControl<FillChoice>
          label="Fill colour"
          size="sm"
          value={choiceOf(ui.fill)}
          onChange={(v) =>
            setRedactUi({
              fill:
                v === 'custom'
                  ? choiceOf(ui.fill) === 'custom'
                    ? ui.fill
                    : '#808080'
                  : FILLS[v],
            })
          }
          options={[
            { value: 'black', label: 'Black' },
            { value: 'white', label: 'White' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        {choiceOf(ui.fill) === 'custom' ? (
          <ColorInput
            label="Custom fill colour"
            value={ui.fill}
            onChange={(fill) => setRedactUi({ fill })}
          />
        ) : null}
      </Stack>
      <Stack gap="1">
        <Label htmlFor={textId}>Text on redactions</Label>
        <Input
          id={textId}
          value={ui.overlayText}
          placeholder="For example REDACTED"
          invalid={textInvalid}
          aria-describedby={textInvalid ? `${textId}-error` : undefined}
          onChange={(overlayText) => setRedactUi({ overlayText })}
        />
        {textInvalid ? (
          <Text id={`${textId}-error`} size="sm" className="text-danger">
            {OVERLAY_TEXT_RULE}
          </Text>
        ) : null}
      </Stack>
      <Stack gap="1">
        <Label htmlFor={dpiId}>
          Image quality for pages turned into images
        </Label>
        <Select
          id={dpiId}
          value={String(ui.dpi)}
          onValueChange={(v) =>
            setRedactUi({ dpi: Number(v) as RedactUi['dpi'] })
          }
          items={[
            { value: '150', label: '150 DPI' },
            { value: '200', label: '200 DPI' },
            { value: '300', label: '300 DPI' },
          ]}
        />
      </Stack>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={snapId}>Snap to text lines</Label>
        <Switch
          id={snapId}
          checked={ui.snap}
          onCheckedChange={(snap) => setRedactUi({ snap })}
        />
      </div>
    </Stack>
  );
}
