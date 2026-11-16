import {
  ColorField,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  TextField,
} from '@arshad-shah/cynosure';
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
  const textInvalid = !OVERLAY_TEXT.test(ui.overlayText);
  return (
    <Stack gap="4">
      <Stack gap="2">
        <SegmentedControl
          label="Fill colour"
          size="sm"
          fullWidth
          value={choiceOf(ui.fill)}
          onChange={(v) =>
            setRedactUi({
              fill:
                v === 'custom'
                  ? choiceOf(ui.fill) === 'custom'
                    ? ui.fill
                    : '#808080'
                  : FILLS[v as Exclude<FillChoice, 'custom'>],
            })
          }
          options={[
            { value: 'black', label: 'Black' },
            { value: 'white', label: 'White' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        {choiceOf(ui.fill) === 'custom' ? (
          <ColorField
            label="Custom fill colour"
            size="sm"
            value={ui.fill}
            onChange={(fill) => setRedactUi({ fill })}
          />
        ) : null}
      </Stack>
      <TextField
        label="Text on redactions"
        size="sm"
        value={ui.overlayText}
        placeholder="For example REDACTED"
        error={textInvalid ? OVERLAY_TEXT_RULE : undefined}
        onChange={(overlayText) => setRedactUi({ overlayText })}
      />
      <Select
        label="Image quality for pages turned into images"
        size="sm"
        value={String(ui.dpi)}
        onChange={(v) => setRedactUi({ dpi: Number(v) as RedactUi['dpi'] })}
        options={[
          { value: '150', label: '150 DPI' },
          { value: '200', label: '200 DPI' },
          { value: '300', label: '300 DPI' },
        ]}
      />
      <Switch
        label="Snap to text lines"
        checked={ui.snap}
        onChange={(snap) => setRedactUi({ snap })}
      />
    </Stack>
  );
}
