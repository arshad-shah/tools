import React, { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  CardBody,
  Inline,
  ShareButton,
  Stack,
  Text,
} from '@/shared/ui';
import { useHandoff } from '@/shared/lib/handoff';
import { fromTwos, parseInBase, toTwos } from '@/shared/lib/numbers';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import { BaseFields, type BaseField } from './components/BaseFields';
import { Readouts } from './components/Readouts';
import { WidthPanel } from './components/WidthPanel';
import { deriveAll, type Derived, type FieldKey } from './lib/state';
import { numberSettings } from './settings';
import {
  NUMBER_SHARE_VERSION,
  parseNumberShare,
  type NumberShare,
} from './share';

/** The field last typed in and its text, kept exactly as typed. */
interface Source {
  key: FieldKey;
  text: string;
}

const LABELS: Record<Exclude<FieldKey, 'custom'>, [string, number, string]> = {
  bin: ['Binary', 2, 'Base 2, accepts 0b'],
  oct: ['Octal', 8, 'Base 8, accepts 0o'],
  dec: ['Decimal', 10, 'Base 10, may be negative'],
  hex: ['Hexadecimal', 16, 'Base 16, accepts 0x'],
};
const ORDER: FieldKey[] = ['dec', 'hex', 'bin', 'oct', 'custom'];

type Reading =
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'value'; value: bigint; fraction?: string };

function read(source: Source, customBase: number): Reading {
  if (!source.text.trim()) return { kind: 'empty' };
  const base = source.key === 'custom' ? customBase : LABELS[source.key][1];
  try {
    const { value, fraction } = parseInBase(source.text, base);
    return { kind: 'value', value, fraction };
  } catch (e) {
    return {
      kind: 'error',
      message: e instanceof Error ? e.message : 'Not a number in this base',
    };
  }
}

/** Hand-off text: a 0x, 0b or 0o prefix picks the field, else decimal. */
function sourceFromText(text: string): Source {
  const t = text.trim();
  const p = t.replace(/^[-+]/, '').slice(0, 2).toLowerCase();
  const key: FieldKey =
    p === '0x' ? 'hex' : p === '0b' ? 'bin' : p === '0o' ? 'oct' : 'dec';
  return { key, text: t };
}

const NumberConverter: React.FC = () => {
  const [settings, update] = numberSettings.useSettings();
  const { bits, signed, customBase, fractionPrecision } = settings;
  const [source, setSource] = useState<Source>({ key: 'dec', text: '' });
  const reading = read(source, customBase);

  const shareState = useShareableState<NumberShare>({
    toolId: 'number-converter',
    version: NUMBER_SHARE_VERSION,
    parse: (state) => parseNumberShare(state),
    select: () => ({
      value: reading.kind === 'value' ? reading.value.toString() : '0',
      bits,
      signed,
      customBase,
    }),
  });
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && shareState.loaded) {
    setHydrated(true);
    const l = shareState.loaded;
    setSource({ key: 'dec', text: l.value });
    update({ bits: l.bits, signed: l.signed, customBase: l.customBase });
  }

  // A number sent from another tool (Calculator's programmer mode) fills
  // the matching field once.
  const handed = useHandoff(
    (p) => p.kind === 'text' && p.mime === 'text/plain',
  );
  const [takenHandoff, setTakenHandoff] = useState<typeof handed>(null);
  if (handed !== takenHandoff) {
    setTakenHandoff(handed);
    if (handed?.kind === 'text') setSource(sourceFromText(handed.text));
  }

  const fractionBase =
    source.key === 'custom' ? customBase : LABELS[source.key][1];
  const derived: Derived | null =
    reading.kind === 'value'
      ? deriveAll(reading.value, {
          bits,
          signed,
          customBase,
          fractionPrecision,
          fraction: reading.fraction
            ? { digits: reading.fraction, base: fractionBase }
            : undefined,
        })
      : null;

  const pattern = derived?.pattern ?? 0n;
  /** Sets the value from a new bit pattern (bit grid, permissions). */
  const setPattern = (next: bigint) => {
    const raw = toTwos(next, bits);
    setSource({
      key: 'dec',
      text: (signed ? fromTwos(raw, bits) : raw).toString(),
    });
  };

  const fields: BaseField[] = ORDER.map((key) => {
    const [label, , hint] =
      key === 'custom'
        ? [`Base ${customBase}`, customBase, `Custom base ${customBase}`]
        : LABELS[key];
    return {
      key,
      label,
      hint,
      value: key === source.key ? source.text : (derived?.[key] ?? ''),
      repeating: derived?.repeating?.[key],
    };
  });

  return (
    <Stack gap="6">
      <Inline justify="end">
        <ShareButton share={shareState} />
      </Inline>
      <Card>
        <CardBody>
          <BaseFields
            fields={fields}
            error={
              reading.kind === 'error'
                ? { key: source.key, message: reading.message }
                : null
            }
            onEdit={(key, text) => setSource({ key, text })}
            customBase={customBase}
            onCustomBase={(b) => update({ customBase: b })}
            base32={derived?.base32 ?? ''}
            base58={derived?.base58 ?? ''}
          />
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <WidthPanel
            bits={bits}
            signed={signed}
            onBits={(b) => update({ bits: b })}
            onSigned={(s) => update({ signed: s })}
            pattern={pattern}
            overflow={derived?.overflow ?? false}
            bytesBE={derived?.bytesBE ?? ''}
            bytesLE={derived?.bytesLE ?? ''}
            onToggleBit={(i) => setPattern(pattern ^ (1n << BigInt(i)))}
          />
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <Readouts
            bytesBE={derived?.bytesBE ?? ''}
            ascii={derived?.ascii ?? []}
            utf8={derived?.utf8 ?? null}
            float={derived?.float}
            bits={bits}
            perms={derived?.perms}
            pattern={pattern}
            hasValue={!!derived}
            onToggleBit={(i) => setPattern(pattern ^ (1n << BigInt(i)))}
          />
        </CardBody>
      </Card>
      <Accordion>
        <AccordionItem value="how">
          <AccordionTrigger>How it works</AccordionTrigger>
          <AccordionContent>
            <Stack gap="2">
              <Text size="sm" tone="muted">
                Type in any field: it is read in its own base and every other
                field follows. Numbers are arbitrary precision (BigInt), so 64
                bit values stay exact. Prefixes 0x, 0b and 0o, underscores and
                spaces are accepted.
              </Text>
              <Text size="sm" tone="muted">
                Binary, octal, hex and the custom base show the two&apos;s
                complement bit pattern at the chosen word size; decimal shows
                that pattern read as signed or unsigned. A value too large for
                the width is cut to its low bits and flagged as overflow.
              </Text>
              <Text size="sm" tone="muted">
                The bytes are read as characters (control bytes by name, such as
                NUL), as an IEEE-754 float at 32 or 64 bits, and as Unix
                permissions when the value is 7777 octal or less.
              </Text>
            </Stack>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Stack>
  );
};

export default NumberConverter;
