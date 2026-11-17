import {
  Badge,
  Button,
  Checkbox,
  Grid,
  GridItem,
  Popover,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure';
import { sliders } from '@arshad-shah/cynosure/icons';
import { ENCODING_LABEL, TEXT_ENCODINGS } from '../lib/decode';
import { DELIMITER_LABEL, DELIMITERS, type Delimiter } from '../lib/parse';
import type { ParseChoices } from '../hooks/useCsvTable';

interface ParseOptionsProps {
  choices: ParseChoices;
  onChange(patch: Partial<ParseChoices>): void;
  /** Delimiter and encoding the shown table used. */
  detected: { delimiter: Delimiter; encoding: string } | null;
  /** Encoding only applies to files (pasted text is already text). */
  fromFile: boolean;
  columns: readonly string[];
  disabled?: boolean;
}

/**
 * Delimiter, encoding, header, quote and keep-as-text behind one Parse
 * options button; each change re-parses. The button counts the choices
 * that differ from auto-detection.
 */
export function ParseOptions({
  choices,
  onChange,
  detected,
  fromFile,
  columns,
  disabled,
}: ParseOptionsProps) {
  const keep = new Set(choices.keepText);
  const changed =
    Number(choices.delimiter !== 'auto') +
    Number(fromFile && choices.encoding !== 'auto') +
    Number(!choices.header) +
    Number(choices.quoteChar !== '"') +
    Number(keep.size > 0);

  return (
    <Popover
      label="Parse options"
      trigger={(props) => (
        <Button
          {...props}
          size="sm"
          variant="soft"
          icon={sliders}
          disabled={disabled}
        >
          Parse options
          {changed ? (
            <Badge size="sm" tone="accent">
              {String(changed)}
            </Badge>
          ) : null}
        </Button>
      )}
    >
      <Stack gap="4">
        <Grid columns={2} gap="3">
          <Select
            label="Delimiter"
            size="sm"
            value={choices.delimiter}
            disabled={disabled}
            onChange={(v) =>
              onChange({ delimiter: v as ParseChoices['delimiter'] })
            }
            options={[
              { value: 'auto', label: 'Auto-detect' },
              ...DELIMITERS.map((d) => ({
                value: d,
                label: DELIMITER_LABEL[d],
              })),
            ]}
          />
          <Select
            label="Quote"
            size="sm"
            value={choices.quoteChar}
            disabled={disabled}
            onChange={(v) =>
              onChange({ quoteChar: v as ParseChoices['quoteChar'] })
            }
            options={[
              { value: '"', label: 'Double quote' },
              { value: "'", label: 'Single quote' },
            ]}
          />
          {fromFile && (
            <GridItem span={2}>
              <Select
                label="Encoding"
                size="sm"
                value={choices.encoding}
                disabled={disabled}
                onChange={(v) =>
                  onChange({ encoding: v as ParseChoices['encoding'] })
                }
                options={TEXT_ENCODINGS.map((e) => ({
                  value: e,
                  label:
                    e === 'auto' && detected
                      ? `Auto (${ENCODING_LABEL[detected.encoding as keyof typeof ENCODING_LABEL] ?? detected.encoding})`
                      : ENCODING_LABEL[e],
                }))}
              />
            </GridItem>
          )}
        </Grid>
        <Switch
          size="sm"
          label="Header row"
          description="The first row names the columns"
          checked={choices.header}
          disabled={disabled}
          onChange={(header) => onChange({ header, keepText: [] })}
        />
        {columns.length > 0 ? (
          <Stack gap="2" role="group" aria-label="Columns kept as text">
            <Stack gap="0">
              <Text size="sm" weight="medium">
                {keep.size ? `Keep as text (${keep.size})` : 'Keep as text'}
              </Text>
              <Text size="xs" tone="muted">
                These columns are not typed (leading zeros and IDs stay exact).
              </Text>
            </Stack>
            <ScrollArea label="Columns">
              <Stack gap="1">
                {columns.map((c) => (
                  <Checkbox
                    key={c}
                    size="sm"
                    label={c}
                    checked={keep.has(c)}
                    disabled={disabled}
                    onChange={(on) => {
                      const next = new Set(keep);
                      if (on) next.add(c);
                      else next.delete(c);
                      onChange({ keepText: [...next] });
                    }}
                  />
                ))}
              </Stack>
            </ScrollArea>
          </Stack>
        ) : null}
      </Stack>
    </Popover>
  );
}
