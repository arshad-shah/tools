import {
  CopyButton,
  DescriptionList,
  Inline,
  Text,
} from '@arshad-shah/cynosure';
import type { ReactNode } from 'react';

export interface Fact {
  term: string;
  value: ReactNode;
  /** Shown in code type with a copy button. */
  copy?: string;
}

/** Terms and values; values with `copy` are monospace and copyable. */
export function Facts({ items, label }: { items: Fact[]; label: string }) {
  return (
    <DescriptionList
      aria-label={label}
      size="sm"
      divided
      items={items.map((f) => ({
        id: f.term,
        term: f.term,
        detail:
          f.copy !== undefined ? (
            <Inline gap="2" align="center" wrap={false}>
              <Text as="span" variant="code" wrap="break">
                {f.copy}
              </Text>
              <CopyButton
                size="sm"
                variant="ghost"
                value={f.copy}
                labels={{ copy: `Copy ${f.term.toLowerCase()}` }}
              />
            </Inline>
          ) : (
            f.value
          ),
      }))}
    />
  );
}

/** A list of short code values, or a muted "None". */
export function CodeList({ values }: { values: string[] }) {
  if (!values.length)
    return (
      <Text as="span" tone="muted">
        None
      </Text>
    );
  return (
    <Inline gap="2" wrap as="span">
      {values.map((v, i) => (
        <Text key={i} as="span" variant="code" wrap="break">
          {v}
        </Text>
      ))}
    </Inline>
  );
}
