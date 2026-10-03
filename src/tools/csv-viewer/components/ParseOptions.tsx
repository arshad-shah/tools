import { useId } from 'react';
import {
  Checkbox,
  Inline,
  Label,
  OptionsMenu,
  Select,
  Stack,
  Text,
  SwitchField,
} from '@/shared/ui';
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
  const delimiterId = useId();
  const encodingId = useId();
  const headerId = useId();
  const quoteId = useId();
  const keep = new Set(choices.keepText);
  const changed =
    Number(choices.delimiter !== 'auto') +
    Number(fromFile && choices.encoding !== 'auto') +
    Number(!choices.header) +
    Number(choices.quoteChar !== '"') +
    Number(keep.size > 0);

  return (
    <OptionsMenu
      label="Parse options"
      title="Parse options"
      changed={changed}
      disabled={disabled}
      width="w-[28rem]"
    >
      <div className="grid grid-cols-2 gap-3">
        <Stack gap="1">
          <Label htmlFor={delimiterId}>Delimiter</Label>
          <Select
            id={delimiterId}
            value={choices.delimiter}
            disabled={disabled}
            onValueChange={(v) =>
              onChange({ delimiter: v as ParseChoices['delimiter'] })
            }
            items={[
              {
                value: 'auto',
                label:
                  detected && choices.delimiter === 'auto'
                    ? `Auto (${DELIMITER_LABEL[detected.delimiter]})`
                    : 'Auto-detect',
              },
              ...DELIMITERS.map((d) => ({
                value: d,
                label: DELIMITER_LABEL[d],
              })),
            ]}
          />
        </Stack>
        <Stack gap="1">
          <Label htmlFor={quoteId}>Quote</Label>
          <Select
            id={quoteId}
            value={choices.quoteChar}
            disabled={disabled}
            onValueChange={(v) =>
              onChange({ quoteChar: v as ParseChoices['quoteChar'] })
            }
            items={[
              { value: '"', label: 'Double quote' },
              { value: "'", label: 'Single quote' },
            ]}
          />
        </Stack>
        {fromFile && (
          <Stack gap="1" className="col-span-2">
            <Label htmlFor={encodingId}>Encoding</Label>
            <Select
              id={encodingId}
              value={choices.encoding}
              disabled={disabled}
              onValueChange={(v) =>
                onChange({ encoding: v as ParseChoices['encoding'] })
              }
              items={TEXT_ENCODINGS.map((e) => ({
                value: e,
                label:
                  e === 'auto' && detected
                    ? `Auto (${ENCODING_LABEL[detected.encoding as keyof typeof ENCODING_LABEL] ?? detected.encoding})`
                    : ENCODING_LABEL[e],
              }))}
            />
          </Stack>
        )}
      </div>
      <SwitchField
        label="Header row"
        description="The first row names the columns"
        id={headerId}
        checked={choices.header}
        disabled={disabled}
        onCheckedChange={(header) => onChange({ header, keepText: [] })}
      />
      {columns.length > 0 ? (
        <Stack gap="2" role="group" aria-label="Columns kept as text">
          <Stack gap="0">
            <Text as="span" size="sm" weight="medium">
              {keep.size ? `Keep as text (${keep.size})` : 'Keep as text'}
            </Text>
            <Text as="span" size="xs" tone="subtle">
              These columns are not typed (leading zeros and IDs stay exact).
            </Text>
          </Stack>
          <Stack gap="1" className="max-h-48 overflow-auto">
            {columns.map((c) => (
              <Inline key={c} gap="2" align="center" wrap={false}>
                <Checkbox
                  checked={keep.has(c)}
                  disabled={disabled}
                  onCheckedChange={(on) => {
                    const next = new Set(keep);
                    if (on) next.add(c);
                    else next.delete(c);
                    onChange({ keepText: [...next] });
                  }}
                  aria-label={c}
                />
                <Text size="sm" className="truncate">
                  {c}
                </Text>
              </Inline>
            ))}
          </Stack>
        </Stack>
      ) : null}
    </OptionsMenu>
  );
}
