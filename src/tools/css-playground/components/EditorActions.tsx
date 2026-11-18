import {
  Button,
  IconButton,
  Inline,
  Popover,
  SegmentedControl,
  Stack,
  Switch,
} from '@arshad-shah/cynosure';
import { alignLeft, close, sliders } from '@arshad-shah/cynosure/icons';

export interface EditorActionsProps {
  /** There is CSS to format and clear. */
  hasCss: boolean;
  formatting: boolean;
  onFormat(): void;
  onClear(): void;
  indent: 2 | 4;
  onIndent(indent: 2 | 4): void;
  wrap: boolean;
  onWrap(wrap: boolean): void;
}

/**
 * The CSS card's header: Format and Clear once there is CSS, and the
 * editor options (indent for Format, line wrapping) behind one button.
 */
export function EditorActions(p: EditorActionsProps) {
  return (
    <Inline gap="1" align="center">
      {p.hasCss ? (
        <Button
          size="sm"
          variant="soft"
          icon={alignLeft}
          onClick={p.onFormat}
          loading={p.formatting}
        >
          Format
        </Button>
      ) : null}
      <Popover
        label="Editor options"
        trigger={(props) => (
          <Button {...props} size="sm" variant="ghost" icon={sliders}>
            Options
          </Button>
        )}
      >
        <Stack gap="4">
          <SegmentedControl
            label="Indent"
            value={String(p.indent)}
            onChange={(v) => p.onIndent(v === '4' ? 4 : 2)}
            options={[
              { value: '2', label: '2 spaces' },
              { value: '4', label: '4 spaces' },
            ]}
          />
          <Switch label="Wrap lines" checked={p.wrap} onChange={p.onWrap} />
        </Stack>
      </Popover>
      {p.hasCss ? (
        <IconButton
          size="sm"
          variant="ghost"
          tone="neutral"
          icon={close}
          label="Clear"
          onClick={p.onClear}
        />
      ) : null}
    </Inline>
  );
}
