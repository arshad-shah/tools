import { useId, useRef, useState } from 'react';
import {
  Button,
  Checkbox,
  Inline,
  Label,
  Popover,
  Select,
  Stack,
  Text,
  SwitchField,
} from '@/shared/ui';
import { IconChevronDown } from '@/shared/ui/icons';
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

/** Delimiter, encoding, header, quote and keep-as-text; each re-parses. */
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
  const keepRef = useRef<HTMLButtonElement>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const keep = new Set(choices.keepText);

  return (
    <Inline gap="4" align="center" wrap>
      <Inline gap="2" align="center" wrap={false}>
        <Label htmlFor={delimiterId}>Delimiter</Label>
        <Select
          id={delimiterId}
          value={choices.delimiter}
          disabled={disabled}
          onValueChange={(v) =>
            onChange({ delimiter: v as ParseChoices['delimiter'] })
          }
          items={[
            { value: 'auto', label: 'Auto-detect' },
            ...DELIMITERS.map((d) => ({ value: d, label: DELIMITER_LABEL[d] })),
          ]}
        />
        {detected && choices.delimiter === 'auto' && (
          <Text size="sm" tone="subtle">
            {`Detected: ${DELIMITER_LABEL[detected.delimiter]}`}
          </Text>
        )}
      </Inline>
      {fromFile && (
        <Inline gap="2" align="center" wrap={false}>
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
        </Inline>
      )}
      <SwitchField
        label="Header row"
        id={headerId}
        checked={choices.header}
        disabled={disabled}
        onCheckedChange={(header) => onChange({ header, keepText: [] })}
      />
      <Inline gap="2" align="center" wrap={false}>
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
      </Inline>
      <Button
        ref={keepRef}
        size="sm"
        variant="secondary"
        disabled={disabled || columns.length === 0}
        rightIcon={<IconChevronDown size="sm" />}
        onClick={() => setKeepOpen((o) => !o)}
        aria-expanded={keepOpen}
      >
        {keep.size ? `Keep as text (${keep.size})` : 'Keep as text'}
      </Button>
      <Popover
        open={keepOpen}
        onOpenChange={setKeepOpen}
        anchor={keepRef}
        label="Columns kept as text"
      >
        <Stack gap="2" className="max-h-72 overflow-auto p-1">
          <Text size="sm" tone="subtle">
            These columns are not typed (leading zeros and IDs stay exact).
          </Text>
          {columns.map((c) => (
            <Inline key={c} gap="2" align="center" wrap={false}>
              <Checkbox
                checked={keep.has(c)}
                onCheckedChange={(on) => {
                  const next = new Set(keep);
                  if (on) next.add(c);
                  else next.delete(c);
                  onChange({ keepText: [...next] });
                }}
                aria-label={c}
              />
              <Text size="sm">{c}</Text>
            </Inline>
          ))}
        </Stack>
      </Popover>
    </Inline>
  );
}
